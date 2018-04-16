PORT = 27016

var express = require('express');
var app = express();
var ngrok = require('ngrok');

app.get('/tunnel/:port', function(req, res) {
  var port = req.params.port
  ngrok.connect(port)
  .then(function(url) { 
    res.send({ 
      'message': 'Success',
      'url': url
    }).status('200')
  }, 
  function(err) {
    console.log(err) 
      res.send({
        'message': 'Error',
        'err': err
      }).status(400)
  });
})

app.listen(PORT, function(err, res) {
  console.log('Hosted at ' + PORT);
})
