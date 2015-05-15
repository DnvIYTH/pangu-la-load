var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
  	
                   db: 'mongodb://localhost:27017/tuxlog',
	  root: rootPath,
      redis: {
          host:'localhost',
          port:'6379'
      }
  }
}
