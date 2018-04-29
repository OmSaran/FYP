PORT = 27015

var express = require('express');
var app = express()
var requestValidator = require('../Utils/reqValidator.js');
var ncp = require('ncp');
var bodyParser = require('body-parser');
const { exec } = require('child_process');
var fs = require('fs');
var db = require('../databseUtils.js');
var expressWs = require('express-ws')(app);

// middlewares
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/', function() {
    console.log('Deploy service is up!');
})

// temp

app.ws('/deploy', function(ws, req) {
    ws.on('message', function(msg) {
        msg = JSON.parse(msg);
        switch(msg.method) {
            case 'POST': 
                handleDeployPOST(ws, msg);
                break;
            case 'PUT':
                handleDeployPUT(ws, msg);
                break;
            case 'DELETE':
                handleDeployDELETE(ws, msg);
        }
    })
})

function handleDeployDELETE(ws, msg) {
    var body = msg.payload;
    var user = body.user;
    var botDir = 'bot' + body.botCount;

    var dir = '../OutputBots' + sep + user + sep + botDir;

    if(!fs.existsSync(dir))
        return ws.send({status: 400, message: 'Bot does not exist'});

    var cmd = dir + sep + 'dokku_delete.sh ' + user + '-' + botDir;
    exec(cmd, (err, stdout, stderr) => {
        if(err) {
            console.log(err);
            return ws.send(JSON.stringify({
                message: 'Error',
                status: 500
            }))
        }
        var dokkuLogs = stderr;
        console.log(dokkuLogs);
        ws.send(JSON.stringify({
            'message': 'Delete successful',
            'output': dokkuLogs,
            'status': 200
        }));
    })
}

function handleDeployPUT(ws, msg) {
    var body = msg.payload;
    var user = body.user;
    var botDir = 'bot' + body.botCount;
    var rootDialog = body.rootDialog;

    var sep = '/'
    var dir = '../OutputBots' + sep + user + sep + botDir

    // Checking if bot dir exists. If not throw error.
    if(!fs.existsSync(dir))
        return ws.send({status: 400, message: 'Bot does not exist'});
    
    var rootDir = dir + sep + 'Machines' + sep + 'RootDialog.js';
    fs.writeFileSync(rootDir, rootDialog);

    var cmd = dir + sep + 'dokku_update.sh ' + dir;
    exec(cmd, (err, stdout, stderr) => {
        if(err) {
            console.log(err);
            return ws.send(JSON.stringify({
                message: 'Error',
                status: 500
            }))
        }
        var dokkuLogs = stderr;
        console.log(dokkuLogs);
        ws.send(JSON.stringify({
            'message': 'Update successful',
            'output': dokkuLogs,
            'status': 200
        }));
    });
}


function handleDeployPOST(ws, msg) {
    var req = {};
    req.body = msg.payload;
    if(!requestValidator.validateParams(req.body, ['user', 'indexFile', 'rootDialog', 'databaseUtils', 'botCount']) ) {
        console.log('Bad request!');
        return ws.send({
            'message': 'Invalid Input',
            status: 400
        })
    }
    var user = req.body.user;
    var botCount = req.body.botCount;
    console.log('botCount = ' + botCount);
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

        // const count = fs.readdirSync(dir).length;
        let botDir = dir + '/bot' + botCount;
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
            var cmd = botDir + '/dokku_deploy.sh ' + botDir + ' ' + server_ip + ' ' + user + ' bot' + botCount
            // ws.send(JSON.stringify({
            //     'message': 'Deployment successful',
            //     'address': 'address',
            //     'status': 200
            // }));
            exec(cmd, (err, stdout, stderr) => {
                if(err) {
                    return ws.send(JSON.stringify({
                        message: 'Error',
                        status: 500
                    }))
                }
                var dokkuLogs = stderr;
                var address = dokkuLogs.split('\n')
                address = address[address.length - 5]
                address = address.substring(address.indexOf('http://'), address.length);
                console.log(address);
                ws.send(JSON.stringify({
                    'message': 'Deployment successful',
                    'address': address,
                    'status': 200
                }))
            });
        });
    }
    deployAndStartService()
}

app.listen(PORT, function() { console.log('listening on port ' + PORT) });