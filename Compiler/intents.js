var _ = require('underscore');
var request = require('request');
var async = require('async');

var intents = {};
var URI = 'https://api.dialogflow.com/v1/intents';

function getTemplates(utterances, parameters) {
    for(var i in utterances) {
        for(var j in parameters) {
            utterances[i] = utterances[i].replace(new RegExp(parameters[j].type, 'g'), parameters[j].type + ':' + parameters[j].name);
        }
    }
    return utterances
}

function sendRequest(options, callback) {
    request(options, function(error, response) {
        if (error) 
            return callback(error, null);
        callback(null, response.body.status);
    })
}

intents.create = function(devToken, syntaxTree, callback) {

    var ints = syntaxTree.intents;

    // var threshold = Object.keys(ints).length;
    // var count = 0;

    var optionsArr = [];

    for(key in ints) {
        var templates = getTemplates(ints[key].utterances, ints[key].parameters) 

        var body = {};
        body.name = key;
        body.templates = templates;

        var options = {
            headers: {
                'Authorization': 'Bearer ' + devToken,
                'Content-Type': 'application/json'
            },
            'uri': URI,
            'method': 'POST',
            'json': true,
            'body': body
        };
        
        optionsArr.push(options);
    }
    async.map(optionsArr, sendRequest, function(error, results) {
        if(error) {
            console.log("ERRORR!!!");
            return callback("Fail");
        }
        callback(null, results);        
    })
}

module.exports = intents