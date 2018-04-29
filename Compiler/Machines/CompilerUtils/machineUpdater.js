var fs = require('fs');
var path = require('path');
var machineGenerator = require('./machineGenerator.js')

function machineUpdater(bot, user, body, cb) {
    let filePath = path.join(process.cwd(), 'trees', user, bot + '.json');
    console.log(filePath);
    if(fs.existsSync(filePath))
        fs.writeFileSync(filePath, body, 'utf-8');
    machineGenerator.updateBot(body, user, bot, function(err, results) {
        if(err) {
            return cb('Error', null)
        }
        cb(null, results)
    })
}

module.exports = machineUpdater;