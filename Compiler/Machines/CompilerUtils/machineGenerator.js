var beautify = require('js-beautify').js_beautify;
var fs = require('fs');
var ncp = require('ncp').ncp;
var needle = require('needle');
var microBotGenerator = require('./microBotGenerator')
var databaseCodeGen = require('./dataBaseCodeGen')
var entities = require('../../entities');
var intents = require('../../intents');
var dialogFlow = require('../../DialogFlow');
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

    let fileName = "bot" + botCount + '.json';
    fs.writeFileSync(fileName, JSON.stringify(syntaxTree, null, '\t'));
}

function deployBot(userId, count) {

}

module.exports = createBot;


/* TODO:
1. Send all the files with the expanded template to the deployService.
2. In the deployService, replace port for the index file.
3. Copy the files to the appropriate directory. (Moving same logic to deployService.)
*/