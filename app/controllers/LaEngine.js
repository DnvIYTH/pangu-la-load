var mongoose = require('mongoose'),
	db = mongoose.connection.db;
var logger = require('../../log').logger,
	async = require('async'),
	fs=require('fs');

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

	var array = [0,4,5,3,1,6,1,6,4,0,1,7,0,7,5,4,3,2,1,5,0,6,3,0,2,3,7,2,5,7,2,6,4,3,1,5,2,7,4,6];

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
		count = count || 2;

		var str = fs.readFileSync('.cache', 'utf-8') || '{}',
			cache = JSON.parse(str) || {}; //缓存

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
					var dt = dtList[i];

					async.auto({
						step1: function(callback){
							if (~scope.toLowerCase().indexOf(dt)) {
								var tabname = data.type+name+dt.toUpperCase()+formatDate(dtFormat[dt], data),
									tab = db.collection(tabname);
								tab.count(function(err,result){
									if(err){
										callback(err)
									}else{
										callback(null, {tabname: tabname, count: result});
									}
								});
							}else{
								callback('step1');
							}
						},
						step2: ['step1', function(callback, result){
							var tabname = result.step1.tabname,
								tab = db.collection(tabname);
							if(result.step1.count < count){
								tab.insert(data.data, callback);
							}else{
								callback(null, 'continue');
							}
						}],
						step3: ['step2', function(callback, result){
							if(result.step2 == 'continue') {
								var tabname = result.step1.tabname,
									target = cache[tabname] || false,
									tab = db.collection(tabname);
								if (!target) {
									var idx = {};
									idx[field] = type.toLowerCase() == "max" ? 1 : -1;
									tab.ensureIndex(idx, function (err, rest) {
										if (err) {
											callback(err);
										}
									});
									tab.find().sort(idx).limit(8).toArray(callback);
								} else {
									callback(null, target);
								}
							}else{
								callback('step2')
							}
						}],
						step4: ['step3', function(callback, results){
							var tabname = results.step1.tabname,
								index = array[Math.floor(Math.random()*40)],
								target = results.step3[index] || results.step3,
								tab = db.collection(tabname);
							if ((type.toLowerCase() == "max" && value > target[field])
								|| (type.toLowerCase() == "min" && value < target[field])) {
								async.series([
									function(callback){
										tab.remove(target, callback);
									},
									function(callback){
										tab.insert(data.data, callback);
									}
								],function(err, rest){
									if(!err) {
										delete cache[tabname];
										fs.writeFileSync('.cache', JSON.stringify(cache));
									}
								});
							}else if( results.step3[0] ){
								cache[tabname] = target;
								fs.writeFileSync('.cache', JSON.stringify(cache));
							}
						}]
					});
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