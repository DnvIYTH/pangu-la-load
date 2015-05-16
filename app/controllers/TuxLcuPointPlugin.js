var LaEngine = require('./LaEngine').LaEngine,
	logger = require('../../log').logger;

function TuxLcuPointParser(host) {
	return function(data,next) {
		var r = /^(.+) TRACE \[gboss.crm.trade.(.+)] (\d+) (.+)/
		if (r.test(data.data)) {
			var obj = {}
			obj.PID = parseInt(RegExp.$3)
			obj.host = host
            obj.TIME = RegExp.$1
            obj.TRANSCODE = RegExp.$2
            obj.content = RegExp.$4
			obj.timestamp = (new Date(obj.TIME)).getTime();

			data.data = obj
			data.date = obj.TIME

			next();
		}else{
			next(new Error("error format."));
		}
	}
}

exports.TuxLcuPointLoader = function(data, host){
	var engine = new LaEngine();
	engine.add(TuxLcuPointParser(host)) //解析字串
		.add(engine.save("YYYYMMDD"))    //分主机按天保存
		.add(engine.showError())//显示错误
		.run(data,"TuxLcuPoint");
}
