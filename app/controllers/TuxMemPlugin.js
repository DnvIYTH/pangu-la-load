var LaEngine = require('./LaEngine').LaEngine,
	logger = require('../../log').logger;

function TuxMemParser(host) {
	return function(data,next) {
		//data = JSON.parse(data)
		var arr = data.data.split(";")
		var obj = {}
		for(var i=0; i<arr.length; ++i) {
			var item = arr[i].split("=");
			if (item.length == 2) {
				obj[item[0]] = item[1];
			}
		}

		obj.host = host
		obj.timestamp = (new Date(obj.time)).getTime();
		data.data = obj
		data.date = obj.time
		next();
	}
}
exports.TuxMemLoader = function(data, host) {
	var engine = new LaEngine();
	engine.add(TuxMemParser(host)) //解析字串
		.add(engine.save("YYYYMMDD"))    //按天保存
		.add(engine.top("Max", "size", "day,month"))  //内存大小排名
		.add(engine.sum("Sum", "size", {"byHostTime": ["host", "time", "timestamp"]}, "day"))  //求和
		.add(engine.showError())//显示错误
		.run(data, "TuxMem");
}
