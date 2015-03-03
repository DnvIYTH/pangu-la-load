
var express = require('express')
  , fs = require('fs')
  , cluster = require('cluster')
  , logger = require('./log').logger
  , numCPUs = require('os').cpus().length;


var app = express();

var env = process.env.NODE_ENV || 'development'
  , config = require('./config/config')[env]
  , mongoose = require('mongoose')

// Bootstrap db connection
mongoose.connect(config.db,{ server: { poolSize: 200 }})


var app = express()

// express settings
require('./config/express')(app, config)

// Bootstrap routes
require('./config/routes')(app)

// Start the app by listening on <port>

var port = process.env.PORT || 5003
app.listen(port);


logger.debug('pangu log analyse server started on port '+port)


// expose app
exports = module.exports = app

