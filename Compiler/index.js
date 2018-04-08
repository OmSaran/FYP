PORT = 3000
URL =''

var express = require('express')
var bodyParser = require('body-parser')
var dialogFlow = require('./Machines/dialogFlowMachine');
var responseFlow = require('./Machines/responseFlowMachine');
var bots = require('./bot')
var semaphore = require('semaphore')
const ngrok = require('ngrok');
var urls = ngrok.connect(PORT);
urls.then(function(url) {
    URL = url;
    app.listen(PORT, () => {
        console.log("Listening at " + PORT);
        console.log(URL);
    })
}, function(err) { 
    console.log(err);
})

var app = express()
var semaphores = {}
var jsonParser = bodyParser.json();

app.get('/', (req, res) => {
    res.send(JSON.stringify({value: 1}));
})

var fs = require("fs")
var json = fs.readFileSync("syntaxTree.json", "utf-8");
var syntaxTree = JSON.parse(json)

app.post('/', jsonParser, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    let uuid = req.body.sessionId;

    if(semaphores[uuid] == undefined)
    {
        semaphores[uuid] = semaphore(1);
    }
    
    res.semaphore = semaphores[uuid];
    res.uuid = uuid;

    if (bots[uuid] == undefined) {
        semaphores[uuid].take(function(){
            bots[uuid] = new dialogFlow({
                res: res,
                context: req.body,
                intents: syntaxTree['intents'],
                entities: syntaxTree['entities']
            });
        })
    }

    else
    {
        let intent = 'string';

        if(req.body.result.resolvedQuery == 'yes')
            intent = 'yes';
    
        else if(req.body.result.resolvedQuery == 'no')
            intent = 'no';
        
        semaphores[uuid].take(function(){
            console.log('USER: ' + uuid + ' said : ' + req.body.result.resolvedQuery);
            bots[uuid].handle(intent, req.body, res);
        }); 
    }
    
});
