module.exports = function(res, text, callback){
    console.log('Replied to USER: ' + res.uuid + ' with "' + text + '"');
    res.send(JSON.stringify({"speech": text, "displayText": text}));
    res.semaphore.leave();
}