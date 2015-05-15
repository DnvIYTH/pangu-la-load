var mongoose = require('mongoose'),
	db = mongoose.connection.db,
	env = process.env.NODE_ENV || 'development',
	config = require('../../config/config')[env];
var logger = require('../../log').logger,
	redis = require('redis'),
	client = redis.createClient(config.redis.port,config.redis.host);

exports.LaEngine = function() {
	this.stack=[];

	emptyFn = function(){};
	formatDate = function(format, data) {
		dt = new Date(data.date)
		format = format.replace("YYYY", dt.getFullYear());
		format = format.replace("YY", ("00"+dt.getFullYear()%100).substr(-2));
		format = format.replace("MM", ("00"+(dt.getMonth() + 1)).substr(-2));
		format = format.replace("DD", ("00"+dt.getDate()).substr(-2));
		format = format.replace("HH", ("00"+dt.getHours()).substr(-2));

		while(/\[:data\.(.+)]/.test(format)) {
			expr = RegExp.$1
			path = expr.split("\.");
			var obj = data.data;
			for(var i=0; i<path.length; ++i) {
				obj = obj[path[i]]
			}
			format = format.replace(/\[:data\.(.+)]/, obj);
		}

		format = format.replace(/\./g, '_')

		return format;
	}


	//添加处理
	this.add = function(filter, fn) {
		var types = 'all' , args = [].slice.call(arguments);
		fn = args.pop();
		if (args.length) types = args;
		this.stack.push({filter:types, handle:fn});
		return this;
	}

	//保存数据
	this.save = function(format, name, fn) {
		format = format || 'YYMMDD'
		name = name || "Base"

		return function(data,next) {
			if ('object' != typeof data.data) throw new Error("please parse data."+data.data);

			var tabname = data.type + name + formatDate(format, data);
			var tab = db.collection(tabname);

			if (fn) {

				obj = fn(data.data)
				//不符合条件，则不记录
				if (obj==null) return next();
				tab.insert(obj, function (err, results) {
					if(err){logger.error(err)}
				});
			}else{
				//data.baseTab = tab
				tab.insert(data.data, function (err, results) {
					if(err){logger.error(err)}
				});
			}

			next();
		}
	}

	//统计排名 可以通过format添加其他信息(比如host)分表排名
	this.top = function(name, field, scope, type, count, format) {
		type = type || "max";
		scope = scope || "day"
		count = count || 500;


		dtList = ["hours", "day", "month", "year"];
		dtFormat = {"hours"	:	"YYMMDDHH",
			"day"	:	"YYMMDD",
			"month"	:	"YYMM",
			"year"	:	"YY"};

		if ('object' == typeof format) {
			for(var k in format) {
				dtFormat[k] = format[k]
			}
		}

		return function(data, next) {
			var value = data.data[field];

			if (value) {
				for(var i=0; i<dtList.length; ++i) {
					var dt = dtList[i],
						multi = client.multi();

					if (~scope.toLowerCase().indexOf(dt)) {
						var tabname = data.type + name + dt.toUpperCase() + formatDate(dtFormat[dt], data);
                        client.zadd([tabname, value, JSON.stringify(data.data)], redis.print);
                        if ("max" == type.toLowerCase()){
                            client.zremrangebyrank([tabname, 0, -count-1], redis.print);
                        } else {
                            client.zremrangebyrank([tabname, count, -1], redis.print);
                        }
					}
				}

			}
			next();
		}
	}

	//记录更新
	this.group = function(name, f, group, scope) {
		scope = scope || "day"
		dtList = ["hours", "day", "month", "year"];
		dtFormat = {"hours"	:	"YYMMDDHH",
			"day"	:	"YYMMDD",
			"month"	:	"YYMM",
			"year"	:	"YY"}

		return function(data, next) {

			for(var type in group) {
				//
				var obj = group[type];
				if ('function' == typeof obj) {
					obj = obj(data.data)
				}else if (obj instanceof Array) {
					var arr = obj;
					obj ={};
					for(var i=0;i<arr.length;++i) {
						obj[arr[i]] = data.data[arr[i]];
					}
				}else{
					return next(new Error("Error group."+group))
				}

				//不设置，则不统计
				if (obj==null) continue;

				var target={};
				target = f(data.data)

				//没有统计字段，不统计
				if (target == {} ) continue;

				//按小时、日、月、年统计
				for(var i=0; i<dtList.length; ++i) {
					var dt = dtList[i];

					if (~scope.toLowerCase().indexOf(dt)) {
						var tabname = data.type+name+dt.toUpperCase()+formatDate(dtFormat[dt], data);
						var tab = db.collection(tabname);

						tab.update(obj, target, {upsert:true}, function(err, results){
							if(err){logger.error(err)}
						});
					}
				}
			}

			next()
		}

	}

	//统计总数
	this.sum = function(name, field, group, scope ) {
		scope = scope || "day"
		dtList = ["hours", "day", "month", "year"];
		dtFormat = {"hours"	:	"YYMMDDHH",
			"day"	:	"YYMMDD",
			"month"	:	"YYMM",
			"year"	:	"YY"}


		return function(data, next) {
			var value = data.data[field];

			if (value||'function'==typeof field) {
				for(var type in group) {
					//
					var obj = group[type];
					if ('function' == typeof obj) {
						obj = obj(data.data)
					}else if (obj instanceof Array) {
						var arr = obj;
						obj ={};
						for(var i=0;i<arr.length;++i) {
							obj[arr[i]] = data.data[arr[i]];
						}
					}else{
						return next(new Error("Error group."+group))
					}

					//不设置，则不统计
					if (obj==null) continue;

					var count=0;
					if ('function' == typeof field) {
						count = field(data.data)
					}else if ('string' == typeof field) {
						count = parseFloat(data.data[field])
					}

					//按小时、日、月、年统计
					for(var i=0; i<dtList.length; ++i) {
						var dt = dtList[i];

						if (~scope.toLowerCase().indexOf(dt)) {
							var tabname = data.type+name+dt.toUpperCase()+formatDate(dtFormat[dt], data);
							var tab = db.collection(tabname);
							if (typeof count === "number") {
								tab.update(obj, {$inc:{_count:count}}, { upsert: true }, function (err, results) {
									if(err){logger.error(err)}
								});
							}else{
								tab.update(obj, {$inc:count}, {upsert:true}, function (err, results) {
									if(err){logger.error(err)}
								});
							}
						}
					}
				}
			}

			next()
		}
	}

	//告警
	this.warn = function(filter) {

		return function(data, next) {

			if ('function' == typeof filter) {
				var obj = filter(data.data);
				if (obj) {
					var tabname = "warning" + formatDate("YYMMDD", data);
					var tab = db.collection(tabname);
					tab.insert(obj, function (err, results) {
						if(err){logger.error(err)}
					});
				}
			}

			next();
		}
	}

	this.showError = function() {
		return function(err,data,next) {
			//print("Error:"+err);
			logger.error("Error:" + err);
			next(err);
		}
	}

	this.run = function(data, type) {
		var stack = this.stack,
			index = 0;

		if (!type && (!data||!data.type)) throw new Error("please input type!");

		if (data instanceof Array) {
			self = this;
			data.forEach(function(item){ self.run(item, type); })
			return;
		}

		if ('string' == typeof data) {
			data = {data:data,type:type,date:new Date()}
		}else{
			data.type=type
			data.date = data.date || new Date();
		}

		function next(err) {

			var layer = stack[index++];

			if (layer) {
				try{
					var arity = layer.handle.length
					var types = layer.filter
					if (err) {
						if (arity == 3) {
							if ('all' == types || ~types.indexOf(type)) {
								layer.handle(err, data, next)
							}else{
								next(err)
							}
						}else{
							next(err)
						}
					}else if (arity < 3){
						if ('all' == types || ~types.indexOf(type)) {
							layer.handle(data, next);
						}else{
							next()
						}
					}else{
						next();
					}
				}catch(e) {
					next(e)
				}
			}
		}
		next();
	}
}
