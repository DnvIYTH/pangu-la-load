var LaEngine = require('./LaEngine').LaEngine,
	logger = require('../../log').logger;

function WarningParser(host) {
	return function(data,next) {
		//data = JSON.parse(data)
		var obj = {};
		obj.detail = data.data;
		obj.type = "level-300";
		obj.state = "0";
		obj.time = new Date().toString() ;

		//printjson(obj)

		obj.host = host
		data.data = obj
		data.date = obj.time

		next();
	}
}

exports.WarningLoader = function(data, host) {
	var engine = new LaEngine()
	engine.add(WarningParser(host)) //解析字串
		.add(engine.warn(function(data){
			return data;

		}))
		.add(engine.showError())//显示错误
		.run(data,"Warning");
}
