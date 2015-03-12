var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
  	
	  db: 'mongodb://10.20.16.81/tuxlog',
	  root: rootPath
		
  }
}
