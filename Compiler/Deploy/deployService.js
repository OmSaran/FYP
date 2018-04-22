PORT = 27015

var express = require('express');
var app = express()
var requestValidator = require('../Utils/reqValidator.js');
var ncp = require('ncp');
var bodyParser = require('body-parser');
const { exec } = require('child_process');
var fs = require('fs');
var db = require('../databseUtils.js');

// middlewares
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/', function() {
    console.log('Deploy service is up!');
})

// temp
app.post('/deploy/port', function(req, res) {
    var port = 892475;
    var botCount = 39827;
    res.json({
        'message': 'Success',
        'port': port,
        'botCount': botCount
    }).status(200);
})

app.post('/deploy', function(req, res) {
    console.log(req.body.user);
    if(!requestValidator.validateParams(req.body, ['user', 'botCount', 'port', 
    'indexFile', 'rootDialog', 'databaseUtils']) ) {
      console.log('Bad request!');
      return res.json({
        'message': 'Invalid Input'
      }).status(400);
    }
    var user = req.body.user;
    var botCount = req.body.count;
    var port = req.body.port;
    var indexFile = req.body.indexFile;
    var databaseUtils = req.body.databaseUtils;
    var rootDialog = req.body.rootDialog;
    var mBots = req.body.mBots;
    function deployAndStartService() {
        console.log('deployAndStartService');
        var outputBotBasePath = '../OutputBots/'
        let dir = '../OutputBots/' + user;
        console.log('Logging dir: ' + dir);
        if(!fs.existsSync(dir))
            fs.mkdirSync(dir);

        const count = fs.readdirSync(dir).length;
        let botDir = dir + '/bot' + count;
        fs.mkdirSync(botDir);

        console.log('MADE DIRECTORY!! ' + botDir);
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
                fs.writeFileSync(botDir + '/databaseUtils.js', databaseUtils, 'utf-8');
                fs.writeFileSync(botDir + '/Machines/RootDialog.js', rootDialog, 'utf-8');
                
                console.log('DONE');
            }

            var sep = '/'
            var outputBotPath = outputBotBasePath + user + sep + 'bot' + botCount + sep; 
            console.log('BEFORE');
            
            var server_ip = '52.226.73.198'
            var rm_cmd = 'rm -rf ' + botDir + '/.git;';
            var cmd = botDir + '/dokku_deploy.sh ' + botDir + ' ' + server_ip + ' ' + user + ' bot' + count
            console.log('*** CMD ***');
            console.log(cmd);
            console.log(' ********** ');
            exec(cmd, (err, stdout, stderr) => {
                console.log(stdout);
                console.log(err);
                console.log(stderr);
            });
        });
    }
    deployAndStartService()
})

app.listen(PORT, function() { console.log('listening on port ' + PORT) });