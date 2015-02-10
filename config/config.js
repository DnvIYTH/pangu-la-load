var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
  	
	  db: 'mongodb://localhost/tuxlog',
	  root: rootPath
		
  }
}
