module.exports = function(res, text, callback){
    console.log('Replied to USER: ' + res.uuid + ' with "' + text + '"');
    res.send(text);
    res.semaphore.leave();
}