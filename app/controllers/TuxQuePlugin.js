var LaEngine = require('./LaEngine').LaEngine,
	logger = require('../../log').logger;

function TuxQueParser(host) {
	return function(data,next) {
		//data = JSON.parse(data)
		var arr = data.data.split(";")
		var obj = {}
		for(var i=0; i<arr.length; ++i) {
			var item = arr[i].split("=");
			if (item.length == 2) {
				if (~['serve', 'queued'].indexOf(item[0])) {
					obj[item[0]] = parseInt(item[1]);
				}else{
					obj[item[0]] = item[1];
				}
			}
		}

		//printjson(obj)

		obj.host = host
		obj.timestamp = (new Date(obj.time)).getTime();
		data.data = obj
		data.date = obj.time

		next();
	}
}

exports.TuxQueLoader = function(data, host) {
	var engine = new LaEngine()
	engine.add(TuxQueParser(host)) //解析字串
		.add(engine.save("YYYYMMDD"))    //按天保存
		.add(engine.group("List", function(data){
			var count = {"lt_5":0,"m5-10":0,"m10-20":0,"ge20":0,"overflow":0,"sum":1};
			if (data.queued<5)
				count["lt_5"] = 1;
			else if (data.queued>=5&&data.queued<10)
				count["m5-10"] = 1;
			else if (data.queued>=10&&data.queued<20)
				count["m10-20"] = 1;
			else if (data.queued>=20)
				count["ge20"]=1;

			if (data.queued>data.serve) count["overflow"]=1;

			return {"$inc":count, "$set":{"serve":data.serve}, "$max":{"max_queued":data.queued}};
		}, {
			"group" : function(data) {
				return {"name":data.name, "queue":data.queue, "host":data.host};
			}
		}, "day")) //按平均时间统计
		.add(engine.warn(function(data){
			if (data.name == 'GWTDOMAIN' || data.name == 'TMS_ORA' || data.name == 'JREPSVR')
				return null;

			if (data.queued > data.serve) {
				return {"detail": "服务:"+data.name+"("+data.queue+")启动通道数:"+data.serve+",目前队列数:"+data.queued+".队列时间:"+data.time,
					"type": "level-200",
					"state": "0",
					"time": data.time,
					"host": data.host};
			}
		}))
		.add(engine.showError())//显示错误
		.run(data,"TuxQue");
}
