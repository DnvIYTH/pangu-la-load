var mongoose = require('mongoose'),db = mongoose.connection.db;
var logger = require('../../log').logger;
var parseTrans = require('./parser').parseTransByExpat,
    panguLaLoad = require('./pangu').panguLaLoad,
    env = process.env.NODE_ENV || 'development',
    redis = require("redis"),
    redisCfg = require('../../config/config')[env].redis;

exports.receiveData = function(req, res) {
     
     //var data="2014-04-24 10:29:17.459 STATE [gboss.crm.trade.ITF_CRM_GetInfoCU] 18677932 SVRNAME=qcscrm1l1server;PATH=/bss/outerf/JISU;TRANSCODE=ITF_CRM_GetInfoCU;STARTTIME=2013-04-24 10:24:15;CYCLESIZE=300;CALLED=28;FAILED=0;MAX=12789;MIN=2501;AVERAGE=3853";
     //var host="192.168.0.123";
     //var type = "TuxState";
    var data = req.body.data;
    var host = req.body.localhost;
    var type = req.body.type;
    var client = redis.createClient(redisCfg.port,redisCfg.host); //缓存
     
    //logger.debug("data="+data);
    logger.debug("host="+host);  
    logger.debug("type="+type);

    if(data != undefined){
        if (data instanceof Array) {
            logger.debug("+++++++++++++++++++++++++++");
            data.forEach(function(item){
                //logger.debug("item="+item);
                if( 'TuxTrade4G' == type){
                    item = parseTrans(item);
                }
                panguLaLoad(type, item, host, client);
            });
        }else{
            if( 'TuxTrade4G' == type){
                data = parseTrans(data);
            }
            panguLaLoad(type, data, host, client);
         }
    }
    res.send("ok");
}
