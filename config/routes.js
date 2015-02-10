var auth = require('../app/controllers/auth');

module.exports = function (app) {

  //数据加载
	app.post('/receive',auth.receiveData);
	app.get('/test.html',function(req, res) {
    	res.render('test')
  });

}
