var express = require('express'),
    partials = require('express-partials'),
    log = require('../log');
module.exports = function (app, config) {


    // set views path, template engine and default layout
	  app.engine('html', require('ejs').__express)
    app.set('views', config.root + '/app/views')
    app.set('view engine', 'html')
    
    app.use(partials());


    // cookieParser should be above session
    app.use(express.cookieParser())

    // bodyParser should be above methodOverride
    app.use(express.bodyParser({limit: '5mb'}))
    app.use(express.methodOverride())
    
    //log4js
    log.use(app);
    
    
    // routes should be at the last
    app.use(app.router)
    
    

    // assume "not found" in the error msgs
    // is a 404. this is somewhat silly, but
    // valid, you can do whatever you like, set
    // properties, use instanceof etc.
    app.use(function(err, req, res, next){
      // treat as 404
      if (err.message
        && (~err.message.indexOf('not found')
        || (~err.message.indexOf('Cast to ObjectId failed')))) {
        return next()
      }

      // log it
      // send emails if you want
      console.error(err.stack)

      // error page
      res.status(500).render('500', { error: err.message })
    })

    // assume 404 since no middleware responded
    app.use(function(req, res, next){
      res.status(404).render('404', {
        url: req.originalUrl,
        error: 'Not found'
      })
    })

    // development env config
    app.configure('development', function () {
      app.locals.pretty = true
    })
}
