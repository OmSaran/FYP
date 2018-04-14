// TODO: Handle undeploying the service.

PORT = 27015

var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var shell = require('shelljs');
var requestValidator = require('../Utils/reqValidator.js');
var fs = require('fs');
var ncp = require('ncp');

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

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/deploy/port', function(req, res) {
  console.log('Got request!');
  console.log(JSON.stringify(portMappings))
  var user = req.body.user;
  var dir = '../OutputBots/' + user;
  if(!fs.existsSync(dir))
    fs.mkdirSync(dir);
  const botCount = fs.readdirSync(dir).length;  
  if(!requestValidator.validateParams(req.body, ['user'])) {
    return res.json({
      'message': 'Input error'
    }).status(400)
  }
  
  while(lock != 0) {}
  lock = 1;
  getUnregisteredPort(user, botCount, function(port, err) {
    if(err) {
      res.json({
        'message': 'Failed',
      }).status(500);
    }
    res.json({
      'message': 'Success',
      'port': port,
      'botCount': botCount
    }).status(200);
  });
})

app.post('/deploy', function(req, res) {
  console.log(req.body.user);
  if(!requestValidator.validateParams(req.body, ['user', 'botCount', 'port', 
  'indexFile', 'rootDialog']) ) {
    console.log('Bad request!');
    return res.json({
      'message': 'Invalid Input'
    }).status(400);
  }
  var user = req.body.user;
  var botCount = req.body.count;
  var port = req.body.port;
  var indexFile = req.body.indexFile;
  var rootDialog = req.body.rootDialog;
  var mBots = req.body.mBots;
  var botCount = req.body.botCount;
  while(lock !=0 ) {}
  lock = 1;
  registerAppMapping(user, botCount, port, function(results, err) {
    if(err) {
      console.log('Error registerAppMapping');
      return res.json({
        'message': 'Failed',
      }).status(500);
    }
    function deployAndStartService() {
      console.log('deployAndStartService');
      var outputBotBasePath = '../OutputBots/'
      let dir = '../OutputBots/' + user;
      console.log('Logging dir: ' + dir);
      if(!fs.existsSync(dir))
        fs.mkdirSync(dir);

      const count = fs.readdirSync(dir).length;
      let botDir = dir + '/bot' + botCount;
      fs.mkdirSync(botDir);

      ncp('../Template', botDir, (err) => {
        if(err){
            console.log('ERROR' + err);
        }
        else
        {
            for(mb in mBots)
            {
                fs.writeFileSync(botDir + '/Machines/' + mb + '.js', mBots[mb]);
            }
                
            fs.writeFileSync(botDir + '/index.js', indexFile, 'utf-8');
            fs.writeFileSync(botDir + '/Machines/RootDialog.js', rootDialog, 'utf-8');
            
            console.log('DONE');
        }

        var sep = '/'
        var outputBotPath = outputBotBasePath + user + sep + 'bot' + botCount + sep; 
        shell.exec('nohup node ' + outputBotPath + 'index.js &');
        
        res.send({
          'message': 'Success',
          'port': port
        });

      });
    }
    deployAndStartService()
  })
})

function registerAppMapping(user, count, port, cb) {
  if (portMappings[port].used) {
    console.log('Port already used');
    return cb(null, 'Port already used');
  }
  if(portMappings[port].user != user || portMappings[port].botCount != count) {
    console.log('------------------------------');
    console.log(portMappings[port].user);
    console.log(user);
    console.log(portMappings[port].botCount);
    console.log(count);
    console.log('Bot port mismatch');
    console.log('------------------------------');
    return cb(null, 'Bot port mismatch!');
  }
  portMappings[port].used = true;
  portMappings[port].user = user;
  portMappings[port].botCount = count;
  lock = 0;
  console.log('CHECKPOINT 2');
  cb('Success', null)
}

function getUnregisteredPort(user, count, cb) {
  console.log('**************')
  console.log(user);
  console.log(count);
  console.log('**************')
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