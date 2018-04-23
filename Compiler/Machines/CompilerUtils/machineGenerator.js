var beautify = require('js-beautify').js_beautify;
var fs = require('fs');
var ncp = require('ncp').ncp;
var needle = require('needle');
var microBotGenerator = require('./microBotGenerator')
var databaseCodeGen = require('./dataBaseCodeGen')
var entities = require('../../entities');
var intents = require('../../intents');
var dialogFlow = require('../../DialogFlow');
var request = require('request');
var app = require('express')()
var expressWs = require('express-ws')(app);
const WebSocket = require('ws');
var path = require('path');

let stateTemplate = fs.readFileSync('./Machines/CompilerUtils/stateTemplate.txt', 'utf-8')
let dialogTemplate = fs.readFileSync('./Machines/CompilerUtils/dialogTemplate.txt', 'utf-8')
let indexTemplate = fs.readFileSync('./Machines/CompilerUtils/indexTemplate.txt', 'utf-8')
let updateTemplate = fs.readFileSync('./Machines/CompilerUtils/updateCode.txt', 'utf-8')
let databaseUtilsTemplate = fs.readFileSync('./Machines/CompilerUtils/databaseUtils.txt', 'utf-8');

function getStateEntryCode(response, intent, botCount)
{
    if(response['type'] == 'text')
        return 'replier(this.uuid, "' + response['value'] + '");';
    
    else if(response['type'] == 'store')
    {
        //Default table being used, need to change this, ask table name from the user in responseFlowMachine
        // context.result.parameters
        let code = databaseCodeGen.getStoreCode(response, botCount) + '\nreplier(this.uuid, "' + response['value'] + '");';  
        return code;
    }

    else if(response['type'] == 'mb')
    {
        return 'bots[this.uuid] = new ' + response['value'] + 'Bot({uuid: this.uuid, parent: this, rootIntent:"' + intent + '"});'
    }

    else if(response['type'] == 'get')
    {
        return databaseCodeGen.getRetrieveCode(response, botCount);
    }

    else if(response['type'] == 'update')
    {
        return databaseCodeGen.getUpdateCode(response, botCount);
    }

    else
    {
        //DELETE operation
    }
}

function createStates(syntaxTree, botCount)
{
    let states = []
    let intents = Object.keys(syntaxTree["intents"]);

    for(let i = 0; i < intents.length; ++i)
    {
        let newState = stateTemplate.replace('#stateName', intents[i] + "State");

        // CODE generation part
        let response = syntaxTree["intents"][intents[i]]["response"];
        let code = getStateEntryCode(response, intents[i], botCount);
        
        if(response['type'] == 'update' || response['type'] == 'delete')
        {
            // replace newState's transition with this transition code
            newState = newState.replace('//transitions', databaseCodeGen.getTransitionCode(response, updateTemplate + ',\n//transitions', botCount));
        }

        newState = newState.replace("#code", code);
        
        // create states here
        for(let j = 0; j < intents.length; ++j)
        {
            // Add transitions here
            if(intents[j] != intents[i])
            {
                newState = newState.replace('//transitions', intents[j] + ': async function(){Logger.log(this.uuid, this.name + " got event : ' + intents[j] + '"); this.transition("' + intents[j] + 'State")},\n//transitions');
            }

            else
            {
                newState = newState.replace('//transitions', intents[j] + ': async function(){Logger.log(this.uuid, this.name + " got event : ' + intents[j] + '");' + code + '},\n//transitions');  
            }
        }
        states.push(newState);
    }
    return states;
}

function getDialog(syntaxTree, botCount)
{
    let intents = Object.keys(syntaxTree["intents"])
    let states = createStates(syntaxTree, botCount);
    let dialog = dialogTemplate;

    for(let i in states)
    {
        dialog = dialog.replace('//states', states[i] + ',\n//states');
    }

    for(let i in intents)
    {
        dialog = dialog.replace('//allTransitions', intents[i] + ': function(){this.transition("' + intents[i] + 'State")},\n//allTransitions');
    }
    return dialog;
}

function getIndexFile(intents)
{
    let indexFile = indexTemplate + '';
    for(let i = 0; i < intents.length; ++i)
    {
        let condition = 'else if';
        
        if(i == 0)
            condition = 'if';

        indexFile = indexFile.replace('//event', condition + '(intent == "' + intents[i] + '")\nbots[uuid].handle("' + intents[i] + '", req.body, res);\n//event');
    }
    return indexFile;
}

function getDirectoryPathForUser(user)
{
  let syntaxTreeStorePath = path.join(process.cwd(), 'trees');

    if(!fs.existsSync(syntaxTreeStorePath))
        fs.mkdirSync(syntaxTreeStorePath);
    
    let userTreeStorePath = path.join(syntaxTreeStorePath, user);

    if(!fs.existsSync(userTreeStorePath))
        fs.mkdirSync(userTreeStorePath);

    return userTreeStorePath;
}

function createBot(syntaxTree, user, botName, cb)
{  
    let botCount = fs.readdirSync(getDirectoryPathForUser(user)).length + 1;
    botCount = botName + '_' + botCount;

    let fileName = "bot" + botCount + '.json';
    fs.writeFileSync(path.join(getDirectoryPathForUser(user), fileName), JSON.stringify(syntaxTree, null, '\t'), 'utf-8');

    if(!fs.existsSync('./OutputBots'))
        fs.mkdirSync('./OutputBots');

    let dir = './OutputBots/' + user;
    if(!fs.existsSync(dir))
        fs.mkdirSync(dir);

    let rootDialog = beautify(getDialog(syntaxTree, botCount));
    let indexFile = beautify(getIndexFile(Object.keys(syntaxTree["intents"])));
    let microBots = microBotGenerator(syntaxTree['microBots']);
    
    let databaseUtils = databaseUtilsTemplate.replace('#user', user);

    for(subIntent in syntaxTree['subIntents'])
    {
        syntaxTree['intents'][subIntent] = syntaxTree['subIntents'][subIntent];
    }

    let df = dialogFlow(syntaxTree['token']);
    df.entities.create(syntaxTree, function(error, results) {
        if(error) {
            return console.log("error in entity creation!");
        }
        df.intents.useWebHook(() => {
            console.log('Done default')
        });
        df.intents.create(syntaxTree, function(error, results) {        
            if(error) {
                return console.log (error + "\n\nError in intents creation \n\n");
            }
        })
    });
    cb(null, 'Starting to deploy your bot!');

    mBots = [];

    for(mb in microBots) {
        mBots.push(microBots[mb].replace('#machineName', mb + 'Bot'));
        rootDialog = rootDialog.replace('//require', 'var ' + mb + ' = require("' + './' + mb + '");\n//require');
    }
    obj = {
        'user': user,
        'botCount': botCount,
        'indexFile': indexFile,
        'rootDialog': rootDialog,
        'mBots': mBots,
        'databaseUtils': databaseUtils
    }

    const ws = new WebSocket('ws://localhost:27015' + '/deploy', {
        perMessageDeflate: false
    });
    ws.on('open', function open() {
        ws.send(JSON.stringify({method: 'POST', payload: obj}));
    })
    ws.on('message', function(msg) {
        msg = JSON.parse(msg);
        if(msg.status == 500) {
            cb('Error');
        }
        cb(null, msg.address);
        ws.close()
    })

}

function deployBot(userId, count) {

    
}

module.exports = createBot;