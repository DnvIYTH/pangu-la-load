var TuxStateLoader = require('./TuxStatePlugin').TuxStateLoader,
    TuxMemLoader = require('./TuxMemPlugin').TuxMemLoader,
    TuxQueLoader = require('./TuxQuePlugin').TuxQueLoader,
    TuxTrade4GLoader = require('./TuxTrade4GPlugin').TuxTrade4GLoader,
    WarningLoader = require('./Warning').WarningLoader,
    TuxLcuPointLoader = require('./TuxLcuPointPlugin').TuxLcuPointLoader;

exports.panguLaLoad = function(type, data, host){
    if( "TuxState" == type ){
        TuxStateLoader(data, host);
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
    if( "TuxLcuPoint" == type ){
        TuxLcuPointLoader(data, host);
    }
};
