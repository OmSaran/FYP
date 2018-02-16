var express = require('express')
var bodyParser = require('body-parser')
var dialogFlow = require('./Machines/dialogFlowMachine');
var bots = require('./bot')
var semaphore = require('semaphore')

var app = express()
var semaphores = {}
var jsonParser = bodyParser.json();

app.get('/', (req, res) => {
    res.send(JSON.stringify({value: 1}));
})

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
                context: req.body
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

app.listen(3000, () => {
    console.log("Listening at 3000");
})