var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
  	
	  db: 'mongodb://10.20.16.81/tuxlog',
	  root: rootPath,
      redis: {
          host:'10.20.16.79',
          port:'6379'
      }
  }
}
