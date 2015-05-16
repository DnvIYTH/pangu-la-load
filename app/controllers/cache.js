var mcache = {
    cache: {}
}

mcache.get = function(key){
    return this.cache[key];
}

mcache.set = function(key, value){
    this.cache[key] = value;
    return "ok";
}

mcache.len = function(){
    var len = 0;
    for(var key in this.cache){
        len++
    }
    return len
}

mcache.del = function(value){
    var c = 0;
    for(var key in this.cache){
        if(this.cache[key] <= value){
            delete this.cache[key];
            c ++;
        }
    }
    return c;
}

module.exports = mcache
