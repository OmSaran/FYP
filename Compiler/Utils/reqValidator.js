
var _ = require('underscore');

var reqValidator = {}
reqValidator.validateParams = function(body, params) {
    if(!_.isArray(params)) {
        console.log ('Expecting an array');
        return False
    }
    for(var i=0; i<params.length; i++) {
        if(!_.has(body, params[i])) {
            console.log(params[i]);
            return false;
        } 
    }
    return true;
}

module.exports = reqValidator;