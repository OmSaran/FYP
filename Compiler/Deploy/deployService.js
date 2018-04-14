PORT = 27015

var express = require('express');
var app = express();
const getPort = require('get-port');

// Dictonary containing the details of the port usage. Can be moved to DB for scaling up
/*
{  
  "port": {
    "user": "string",
    "botCount": "integer",
    "used": "boolean",
    "timestamp": 
  }
}
*/
portMappings = {}
lock = 0


app.post('/deploy', function(req, res) {

});

app.post('/deploy/port', function(req, res) {
  var user = req.body.user;
  var botCount = req.body.botCount;
  while(lock != 0) {}
  lock = 1;
  getUnregisteredPort(user, botCount, function(port, err) {
    if(err) {
      res.send({
        'message': 'Failed',
      }).status(500);
    }
    res.send({
      'message': 'Success',
      'port': port
    }).status(200);
  });
})

app.post('/deploy', function(req, res) {
  var user = req.body.user;
  var botCount = req.body.count;
  var port = req.body.port;
  while(lock !=0 ) {}
  lock = 1;
  registerAppMapping(user, botCount, port, function(results, err) {
    if(err) {
      return res.send({
        'message': 'Failed',
      }).status(500);
    }
    function deployAndStartService() {
      //: TODO
    }
  })
})

function registerAppMapping(user, count, port, cb) {
  if (portMappings[port].used) {
    return cb(null, 'Port already used');
  }
  if(portMappings[port].user != user || portMappings[port].count != count) {
    return cb(null, 'Bot port mismatch!');
  }
  portMappings[port].used = true;
  portMappings[port].user = user;
  portMappings[port].count = count;
  lock = 0;
  cb('Success', null)
}

function getUnregisteredPort(user, count, cb) {
  getPort().then(function(port) {
    if(portMappings[port]) {
      now = (new Date).getTime();
      diff = now - portMappings[port]['timestamp']

      // If port has been unused for more than 60 seconds then remove the port registration
      if(diff > 75000 && !portMappings.used) {
        portMappings[port].user = user;
        portMappings[port].botCount = count;
        portMappings[port].timestamp = now;
        portMappings[port].used = false;
        lock = 0;
        cb(port)
      }
      else {
        getUnregisteredPort(cb);
      }
    }
    else {
      portMappings[port] = {
        "user": user,
        "botCount": count,
        "used": false,
        "timestamp": (new Date).getTime()
      }
      lock=0;
      cb(port);
    }
  }, function(err) {
    cb(null, err);
  })
}

app.listen(PORT, function() { console.log('Successfully hosted') });