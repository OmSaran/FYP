var data = require('../data')

module.exports = function(uuid, text){
    data[uuid]['res'].send(JSON.stringify({"speech": text, "displayText": text}))
    data[uuid]['res'].semaphore.leave();
}