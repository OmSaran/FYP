module.exports = function(res, text, callback){
    console.log('Replied to USER async : ' + res.uuid + ' with "' + text + '"');
    res.send(text);
}