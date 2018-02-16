var _ = require('underscore');
var request = require('request');
var entities = require('./entities.js');
var intents = require('./intents.js');

var tree = require('./syntaxTree.json');

var developerToken = '6c1dd845314b4843827b5cd88366eb00'

entities.create(developerToken, tree, function(error, results) {
    if(error) {
        return console.log("error in entity creation!");
    }
    console.log(results);
    intents.create(developerToken, tree, function(error, results) {        
        if(error) {
            return console.log (error + "\n\nError in intents creation \n\n");
        }
        console.log(results)
    })
});