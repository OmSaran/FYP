var _ = require('underscore');
var request = require('request');
var async = require('async');
var entities = {};

var URI = 'https://api.dialogflow.com/v1/entities';

function sendRequest(options, callback) {
    request(options, function(error, response) {
        if (error) 
            return callback(error, null);
        callback(null, response.body.status);
    })
}

entities = function(devToken) {
    var ent = {};
    ent.devToken = devToken;
    ent.create = function(tree, callback) {
        var optionsList = [];
        _.mapObject(tree.entities, function(val, key, obj) {
            var entriesArr =  _.map(val, function(str) { return { value: str } });
            
            var body = {
                name: key,
                entries: entriesArr
            }

            var options = {
                headers: {
                    'Authorization': 'Bearer ' + ent.devToken,
                    'Content-Type': 'application/json'
                },
                'uri': URI,
                'method': 'POST',
                'json': true,
                'body': body
            };
            
            optionsList.push(options);
        });
        console.log(optionsList);
        async.map(optionsList, sendRequest, function(error, results) {
            if(error) {
                console.log('errore!!');
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    return ent;
}

module.exports = entities;