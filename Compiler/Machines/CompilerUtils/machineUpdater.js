var fs = require('fs');
var path = require('path');

function machineUpdater(bot, user, body) {
    let filePath = path.join(process.cwd(), 'trees', user, bot + '.json');
    console.log(filePath);
    if(fs.existsSync(filePath))
        fs.writeFileSync(filePath, body, 'utf-8');
}

module.exports = machineUpdater;