var TuxStateLoader = require('./TuxStatePlugin').TuxStateLoader,
    TuxMemLoader = require('./TuxMemPlugin').TuxMemLoader,
    TuxQueLoader = require('./TuxQuePlugin').TuxQueLoader,
    TuxTrade4GLoader = require('./TuxTrade4GPlugin').TuxTrade4GLoader,
    WarningLoader = require('./Warning').WarningLoader;

exports.panguLaLoad = function(type, data, host, client){
    if( "TuxState" == type ){
        TuxStateLoader(data, host, client);
    }
    if( "TuxMem" == type ){
        TuxMemLoader(data, host);
    }
    if( "TuxQue" == type ){
        TuxQueLoader(data, host);
    }
    if( "TuxTrade4G" == type ){
        TuxTrade4GLoader(data, host);
    }
    if( "Warning" == type ){
        WarningLoader(data, host);
    }
};