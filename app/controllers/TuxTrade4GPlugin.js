var LaEngine = require('./LaEngine').LaEngine,
    logger = require('../../log').logger;

function TuxTrade4GParser(host){
    return function(data, next){
        var arr = data.data.split(";")
        var obj = {};
        obj['REQUSET_INFO'] = [];
        for(var i=0; i<arr.length; i++){
            var item = arr[i].split("=");
            if(2 == item.length){
                obj[item[0]] = item[1];
            }
            if(3 == item.length){
                var tmpO = {};
                var item1 = item[1].split(",");
                tmpO[item[0]] = item1[0];
                tmpO[item1[1]] = item[2];
                obj['REQUSET_INFO'].push(tmpO);
            }
        }
        obj.host = host;
        var tmpT = obj.PROCESS_TIME;
        var time = tmpT.substr(0,4)+'-'+tmpT.substr(4,2)+'-'+tmpT.substr(6,2)+' '+tmpT.substr(8,2)+':'+tmpT.substr(10,2)+':'+tmpT.substr(12,2);
        obj.timestamp = (new Date(time)).getTime();
        data.data = obj;
        data.date = new Date(time);

        next();
    }
}

exports.TuxTrade4GLoader = function(data, host){
    var engine = new LaEngine();
    engine.add(TuxTrade4GParser(host)) //解析字符串
        .add(engine.save("YYYYMMDD"))    //按天保存
        .add(engine.group("List", function(data){
            var count = {}, //serv desc
                tmpD = data.REQUSET_INFO;
            for(var i=0; i<tmpD.length; i++){
                var tmp = tmpD[i].REQUSET_CODE + '`' + tmpD[i].REQUSET_DESC;
                if(tmp.indexOf("undefined") != -1){
                    continue;
                }
                if( count[tmp] ){
                    count[tmp] += 1;
                }else{
                    count[tmp] = 1;
                }
            }
            return { "$inc": count };
        }, {
            "group": function(data){
                if( "UserTransferSer" == data.SERVICE_NAME ){
                    return { "SERVICE_NAME": data.SERVICE_NAME, "host": data.host, "type": "DESC" };
                }else{
                    return null;
                }
            }
        }, "day")) //按服务名称统计次数
        .add(engine.group("List", function(data){
            var count = {}, //oper desc
                tmpD = data.REQUSET_INFO;
            for(var i=0; i<tmpD.length; i++){
                var tmp = tmpD[i].REQUSET_CODE + '`' + tmpD[i].REQUSET_DESC;
                if(tmp.indexOf("undefined") != -1){
                    continue;
                }
                if( count[tmp] ){
                    count[tmp] += 1;
                }else{
                    count[tmp] = 1;
                }
            }
            return {"$inc": count };
        }, {
            "group" : function(data){
                if( "checkUserTransfer" == data.OPERATE_NAME || "checkUserTransFixedfer" == data.OPERATE_NAME ){
                    return { "OPERATE_NAME": data.OPERATE_NAME, "host": data.host, "type": "DESC" };
                }else{
                    return null;
                }
            }
        }, "day"))  //按OPERATE_NAME统计
        .add(engine.group("List", function(data){
            var count = {}, // serv code
                tmpD = data.REQUSET_INFO;
            for(var i=0; i<tmpD.length; i++){
                var tmp = tmpD[i].REQUSET_CODE;
                if(tmp.indexOf("undefined") != -1){
                    continue;
                }
                if( count[tmp] ){
                    count[tmp] += 1;
                }else{
                    count[tmp] = 1;
                }
            }
            return { "$inc": count };
        }, {
            "group": function(data){
                if( "UserTransferSer" == data.SERVICE_NAME ){
                    return { "SERVICE_NAME": data.SERVICE_NAME, "host": data.host, "type": "CODE" };
                }else{
                    return null;
                }
            }
        }, "day")) //按服务名称统计次数
        .add(engine.group("List", function(data){
            var count = {}, //oper code
                tmpD = data.REQUSET_INFO;
            for(var i=0; i<tmpD.length; i++){
                var tmp = tmpD[i].REQUSET_CODE;
                if(tmp.indexOf("undefined") != -1){
                    continue;
                }
                if( count[tmp] ){
                    count[tmp] += 1;
                }else{
                    count[tmp] = 1;
                }
            }
            return {"$inc": count };
        }, {
            "group" : function(data){
                if( "checkUserTransfer" == data.OPERATE_NAME || "checkUserTransFixedfer" == data.OPERATE_NAME ){
                    return { "OPERATE_NAME": data.OPERATE_NAME, "host": data.host, "type": "CODE" };
                }else{
                    return null;
                }
            }
        }, "day"))  //按OPERATE_NAME统计
        .add(engine.showError())  //显示错误
        .run(data, "TuxTrade4G");
};