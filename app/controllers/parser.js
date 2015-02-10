var logger = require('../../log').logger;
var expat = require('node-expat');

exports.parseTransByExpat = function(data){
    var p = new expat.Parser('UTF-8');
    var arr = [
        "SERVICE_NAME", "OPERATE_NAME", "TRANS_IDO", "OPER_ID", "EPARCHY_CODE",
        "CITY_CODE", "PROC_ID", "PROCESS_TIME", "RSP_CODE", "RSP_DESC",
        "REQUSET_CODE", "REQUSET_DESC"    
    ];
    var str = "",
        yes = false;
    p.on('startElement', function (name, attrs) {
        if( arr.indexOf(name.split(":")[1]) != -1){
            yes = true;
            str += name.split(":")[1];
        }
    });
    p.on('text', function(text){
        //console.log(text);
        if(yes){
            if( text == "ok" ){
                str += "=成功";
            }else{
                str = str.replace(/"/g, '\'');
                str += "=" + text;
            }
        }
    });
    p.on('endElement', function (name) {
        //console.log(name)
        if(yes){
            if( name.split(":")[1] == "REQUSET_CODE" ){
                str += ",";
            }else{
                str += ";";
            }
            yes = false;
        }
    });
    var result = p.parse(data);
    if( result ){
        //logger.debug(str);
        return str;
    }else{
        return "";
    }
};
