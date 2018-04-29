var express = require('express')
var app = express()
var http = require("https");
var jwt = require('jsonwebtoken');
var config = require('./config');
var expressWs = require('express-ws')(app);
var bodyParser = require('body-parser');
var key = config.key;

var dialogFlow = require('./Machines/dialogFlowMachine');
var responseFlow = require('./Machines/responseFlowMachine');
var treeUpdater = require('./Machines/CompilerUtils/machineUpdater');
var bots = require('./bot')
var semaphore = require('semaphore')
var axios = require('axios')
var dfClient = require('./Utils/dfClient');
var databaseAdmin = require('./databaseAdmin');
var path = require('path');
var fs = require('fs');

var df = new dfClient('5c2bca53193e4617b47df5fd37d0fa16');

var semaphores = {}

app.use('/app', express.static('wwwroot'))

app.get('/token', function (req, res) {
    let id_token = req.query.id_token;


    var options = {
        "method": "GET",
        "hostname": "www.googleapis.com",
        "port": null,
        "path": "/oauth2/v3/tokeninfo?id_token=" + id_token,
        "headers": {
        }
    };

    var request = http.request(options, function (response) {
        var chunks = [];

        response.on("data", function (chunk) {
            chunks.push(chunk);
        });

        response.on("end", function () {
            var body = Buffer.concat(chunks);
            try {
                let parsedBody = JSON.parse(body.toString());
                let token = jwt.sign({ user: (parsedBody['email'] + '').split('@')[0] }, key)
                res.json({ "status": true, "token": token })
            } catch (error) {
                console.error(error)
                res.json({ "status": false })
            }
        });
    });

    request.end();
});

app.get('/verify', function (req, res) {
    try {
        let user = jwt.verify(req.query.token, key).user;
        res.json({ valid: "true", user: user })
    }
    catch (error) {
        res.json({ valid: false })
    }
});

app.ws('/message', function (ws, req) {
    ws.on('message', async function (msg) {

        try {
            let message = JSON.parse(msg);
            let res = ws;

            let uuid = jwt.verify(message['user'], key).user;

            let response = await df.callDialogFlow(message['text'], uuid);

            if (response.data.result.actionIncomplete || ("" + response.data.result.fulfillment.speech).toLowerCase().startsWith('should i'))
                res.send(response.data.result.fulfillment.speech);
            else
                handleBot(response.data, res, uuid);

        } catch (error) {
            console.log(error);
            console.log('User is using an un authenticated web socket');
            ws.send("Say restart and try again...");
        }
    });
});

function handleBot(dfResponse, res, uuid) {

    let intent = dfResponse.result.metadata.intentName;

    if(intent == 'restart')
    {
        semaphores[uuid] = undefined;
        bots[uuid] = undefined;
    }

    if (semaphores[uuid] == undefined) {
        semaphores[uuid] = semaphore(1);
    }

    res.semaphore = semaphores[uuid];
    res.uuid = uuid;
    res.df = df;

    if (bots[uuid] == undefined) {
        semaphores[uuid].take(function() {    
            bots[uuid] = new dialogFlow({
                res: res,
                context: dfResponse
            });
        });
        return;
    }

    console.log('Intent is : ' + intent);

    if (intent == 'Default Fallback Intent')
        intent = 'string'

    semaphores[uuid].take(function() {
        bots[uuid].context = dfResponse;
        bots[uuid].res = res;
        bots[uuid].handle(intent, dfResponse, res);
    });
}

app.get('/query', function (request, response) {
    try {
        let user = jwt.verify(request.get('Authorization'), key).user;
        console.log("USER: " + user);
        var options = {
            "method": "POST",
            "hostname": "api.dialogflow.com",
            "port": null,
            "path": "/v1/query?v=20150910",
            "headers": {
                "content-type": "application/json",
                "authorization": "Bearer " + config.dialogFlowClientId
            }
        };

        var req = http.request(options, function (res) {
            var chunks = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                var body = Buffer.concat(chunks);
                try {
                    let data = JSON.parse(body.toString());
                    console.log(JSON.stringify(data));
                    response.send(data["result"]['fulfillment']['displayText']);
                } catch (error) {
                    response.send("Sorry");
                }

            });
        });

        req.write(JSON.stringify({ sessionId: user, query: request.query.string, lang: 'en' }));
        req.end();
    }
    catch (error) {
        res.send("Login and try again");
    }
});

app.get('/dbpass', async function(request, response) {
    try {
        let user = jwt.verify(request.get('Authorization'), key).user;
        let password = await databaseAdmin(user, user);
        response.json({'password': password, 'user': user});
    } catch (error) {
        console.log(error);
        response.json({'password': "Login and try again"});
    }
});

app.get('/trees', function(request, response){
    try {
        let user = jwt.verify(request.get('Authorization'), key).user;
        
        if(!fs.existsSync(path.join(process.cwd(), 'trees', user)))
        {
            response.json([]);
            return;
        }

        let files = fs.readdirSync(path.join(process.cwd(), 'trees', user));
        let trees = {}
        files.map(function(file) {
            trees[file.split('.')[0]] = (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'trees', user, file))));
        });
        response.json(trees);
    } catch (error) {
        console.log(error);
        response.json([]);
    }
});

app.put('/tree/restart', bodyParser.json(), function(request, response) {
    try {
        let user = jwt.verify(request.get('Authorization'), key).user;
        treeUpdater(request.body.bot, user, request.body.tree);
        response.json({'status': "Done"});
    } catch (error) {
        console.log(error);
        response.json({'status': "Fail"});
    }
});

app.listen(5000, () => console.log('BotScript listening on port 5000!'))