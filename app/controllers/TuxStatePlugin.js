var LaEngine = require('./LaEngine').LaEngine,
	logger = require('../../log').logger;

function TuxStateParser(host) {
	return function(data,next) {
		var r = /^(.+) STATE.+] (\d+) (.+)/
		if (r.test(data.data)) {
			var arr=RegExp.$3.split(";")
			var obj = {}
			for(var i=0; i<arr.length; ++i) {
				var item = arr[i].split("=");
				if (item.length == 2) {
					if (~['MAX', 'MIN', 'AVERAGE'].indexOf(item[0])) {
						obj[item[0]] = parseInt(item[1])/1000000;
					}else if (~['CYCLESIZE', 'CALLED', 'FAILED'].indexOf(item[0])) {
						obj[item[0]] = parseInt(item[1]);
					}else{
						obj[item[0]] = item[1];
					}
				}
			}

			obj.PID = parseInt(RegExp.$2)
			obj.host = host
			obj.timestamp = (new Date(obj.STARTTIME)).getTime();

			data.data = obj
			data.date = obj.STARTTIME

			next();
		}else{
			next(new Error("error format."));
		}
	}
}

exports.TuxStateLoader = function(data, host){
	var engine = new LaEngine();
	engine.add(TuxStateParser(host)) //解析字串
		//.add(engine.save("[:data.host]_YYYYMMDD"))    //分主机按天保存
		.add(engine.save("YYYYMMDD"))    //分主机按天保存
		.add(engine.save("YYYYMMDD", "TimeOutDetail", function(data) {
			if (data.MAX >= 10) return data;
			else return null;
		}))
		.add(engine.top("TimeOutTop", "MAX", "day,month"))    //按日、月、年分别对流程的最大执行时间排名
		.add(engine.group("TimeOutStat", function(data){
			var count = {"avg_gt_2s":0,"avg_gt_5s":0,"avg_gt_30s":0,"avg_gt_60s":0,"avgcount":data.CALLED,
				"max_gt_2s":0,"max_gt_5s":0,"max_gt_30s":0,"max_gt_60s":0,"maxcount":1};
			if (data.AVERAGE>=2)
				count["avg_gt_2s"]=data.CALLED;
			if (data.AVERAGE>=5)
				count["avg_gt_5s"]=data.CALLED;
			if (data.AVERAGE>=30)
				count["avg_gt_30s"]=data.CALLED;
			if (data.AVERAGE>=60)
				count["avg_gt_60s"]=data.CALLED;

			if (data.MAX>=2)
				count["max_gt_2s"]=1;
			if (data.MAX>=5)
				count["max_gt_5s"]=1;
			if (data.MAX>=30)
				count["max_gt_30s"]=1;
			if (data.MAX>=60)
				count["max_gt_60s"]=1;
			return {"$inc":count}

		}, {
			"group":function(data){return {"TRANSCODE":data.TRANSCODE, "host":data.host};}
		},"day"))
		.add(engine.sum("CalledSum", "CALLED",
			{
				//"byHostServer": ["SVRNAME", "host"],
				//"byHostTrans": ["TRANSCODE", "host"], //暂不统计
				"byAllServer": function(data){
					var obj={};obj.SVRNAME=data.SVRNAME;obj.host='all';
					return obj;
				},
				"byAllTrans": function(data) {
					var obj={};obj.TRANSCODE = data.TRANSCODE;obj.host='all';
					return obj;
				}
			},
			"day,month"))    //按小时、日、月、年分别对进程/流程的调用次数进行统计
		.add(engine.sum("CalledSumByTime", "CALLED",
			{
				"atHours" : function(data) {
					var obj={};obj.hours = data.STARTTIME.substr(11,2);
					return obj;
				},
				"atHoursByhost" : function(data) {
					var obj={};obj.hours = data.STARTTIME.substr(11,2);obj.host=data.host;
					return obj;
				},

				"bySvrAtHours" : function(data) {
					var obj={};obj.hours=data.STARTTIME.substr(11,2);
					obj.SVRNAME=data.SVRNAME;
					return obj;
				},
				"byLcuAtHours" : function(data) {
					var obj={};obj.hours=data.STARTTIME.substr(11,2);
					obj.TRANSCODE=data.TRANSCODE;
					return obj;
				}
			}, "day"))  //每天按小时统计调用数

		/*
		 .add(engine.sum("CalledSumByTime", "CALLED",
		 {
		 "atHours_QAM_pQueryOweState" : function(data) {
		 //if (data.TRANSCODE != 'QAM_pQueryOweState' ) return null;
		 var obj={};obj.hours = data.STARTTIME.substr(11,2);
		 obj.TRANSCODE = data.TRANSCODE;
		 return obj;
		 }
		 }, "day"))  //每天按小时统计QAM_pQueryOweState调用数
		 */
		.add(engine.sum("CalledSumByTime", "CALLED",
			{
				"atDay" : function(data) {
					var obj={};obj.day = data.STARTTIME.substr(8,2);
					return obj;
				}
			}, "month"))  //每月按天统计调用数
		.add(engine.sum("FailedSum", "FAILED",
			{
				//						"byHostServer": ["SVRNAME", "host"],
				//						"byHostTrans": ["TRANSCODE", "host"], //暂不统计
				"byAllServer": function(data) {
					var obj={};obj.SVRNAME=data.SVRNAME;obj.host='all';
					return obj;
				},
				"byAllTrans": function(data) {
					var obj={};obj.TRANSCODE = data.TRANSCODE;obj.host='all';
					return obj;
				}
			},
			"day,month"))    //按小时、日、月、年分别对进程/流程的调用异常进行统计
		.add(engine.sum("FailedSumByTime", "FAILED",
			{
				"atHours" : function(data) {
					var obj={};obj.hours = data.STARTTIME.substr(11,2);
					return obj;
				},
				"atHoursByHost" : function(data) {
					var obj={};obj.hours = data.STARTTIME.substr(11,2);obj.host=data.host;
					return obj;
				},
				"bySvrAtHours" : function(data) {
					var obj={};obj.hours=data.STARTTIME.substr(11,2);
					obj.SVRNAME=data.SVRNAME;
					return obj;
				},
				"byLcuAtHours" : function(data) {
					var obj={};obj.hours=data.STARTTIME.substr(11,2);
					obj.TRANSCODE=data.TRANSCODE;
					return obj;
				}
			}, "day"))  //每天按小时统计调用数
		.add(engine.sum("FailedSumByTime", "FAILED",
			{
				"atDay" : function(data) {
					var obj={};obj.day = data.STARTTIME.substr(8,2);
					return obj;
				}
			}, "month"))  //每月按天统计调用数
		/*
		 .add(engine.sum("AllTime", function(data){ return data.AVERAGE * data.CALLED},
		 {
		 "byHostServer": ["SVRNAME", "host"],
		 "byHostTrans": ["TRANSCODE", "host"], //暂不统计
		 "byAllServer": function(data) {
		 var obj={};obj.SVRNAME=data.SVRNAME;obj.host='all';
		 return obj;
		 },
		 "byAllTrans": function(data) {
		 var obj={};obj.TRANSCODE = data.TRANSCODE;obj.host='all';
		 return obj;
		 }
		 },
		 "day,month", "TuxStateBase" ))    //按日、月、年分别对进程/流程的调用时长进行统计
		 */
		.add(engine.warn(function(data){
			if (data.MAX > 5) {
				return {"detail": "流程:"+data.TRANSCODE+"("+data.SVRNAME+")执行耗时达到:"+data.MAX+"秒.统计时间:"+data.STARTTIME,
					"type": "level-100",
					"state": "0",
					"time": data.STARTTIME,
					"host": data.host};
			}
		}))
		.add(engine.showError())//显示错误
		.run(data,"TuxState");
}