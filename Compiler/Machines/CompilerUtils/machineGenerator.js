var beautify = require('js-beautify').js_beautify;
var fs = require('fs');
var ncp = require('ncp').ncp;
var needle = require('needle');
var microBotGenerator = require('./microBotGenerator')
var databaseCodeGen = require('./dataBaseCodeGen')
var entities = require('../../entities');
var intents = require('../../intents');
var dialogFlow = require('../../DialogFlow');


let stateTemplate = fs.readFileSync('./Machines/CompilerUtils/stateTemplate.txt', 'utf-8')
let dialogTemplate = fs.readFileSync('./Machines/CompilerUtils/dialogTemplate.txt', 'utf-8')
let indexTemplate = fs.readFileSync('./Machines/CompilerUtils/indexTemplate.txt', 'utf-8')
let updateTemplate = fs.readFileSync('./Machines/CompilerUtils/updateCode.txt', 'utf-8')

// let port = 5001;

function getStateEntryCode(response, intent)
{
    if(response['type'] == 'text')
        return 'replier(this.uuid, "' + response['value'] + '");';
    
    else if(response['type'] == 'store')
    {
        //Default table being used, need to change this, ask table name from the user in responseFlowMachine
        // context.result.parameters
        let code = databaseCodeGen.getStoreCode(response) + '\nreplier(this.uuid, "' + response['value'] + '");';  
        return code;
    }

    else if(response['type'] == 'mb')
    {
        return 'bots[this.uuid] = new ' + response['value'] + 'Bot({uuid: this.uuid, parent: this, rootIntent:"' + intent + '"});'
    }

    else if(response['type'] == 'get')
    {
        return databaseCodeGen.getRetrieveCode(response);
    }

    else if(response['type'] == 'update')
    {
        return databaseCodeGen.getUpdateCode(response);
    }

    else
    {
        //DELETE operation
    }
}

function createStates(syntaxTree)
{
    let states = []
    let intents = Object.keys(syntaxTree["intents"]);

    for(let i = 0; i < intents.length; ++i)
    {
        let newState = stateTemplate.replace('#stateName', intents[i] + "State");

        // CODE generation part
        let response = syntaxTree["intents"][intents[i]]["response"];
        let code = getStateEntryCode(response, intents[i]);
        
        if(response['type'] == 'update' || response['type'] == 'delete')
        {
            // replace newState's transition with this transition code
            newState = newState.replace('//transitions', databaseCodeGen.getTransitionCode(response, updateTemplate + ',\n//transitions'));
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

function getDialog(syntaxTree)
{
    let intents = Object.keys(syntaxTree["intents"])
    let states = createStates(syntaxTree);
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

function createBot(syntaxTree, user, cb)
{
    let rootDialog = beautify(getDialog(syntaxTree));
    let indexFile = beautify(getIndexFile(Object.keys(syntaxTree["intents"])));
    let microBots = microBotGenerator(syntaxTree['microBots']);

    // let dir = './OutputBots/' + user;
    var port;
    var deployURL = 'http://localhost:27015'
    needle.post(deployURL + '/deploy/port', {'user': user }, function(err, res) {
        if (err) {
            console.log('ERROR!!');
            return console.log(err.body);
        }
        port = res.body.port;
        botCount = res.body.botCount;
        indexFile = indexFile.replace('#PORT', port).replace('#PORT', port);
        for(subIntent in syntaxTree['subIntents'])
        {
            syntaxTree['intents'][subIntent] = syntaxTree['subIntents'][subIntent];
        }

        let df = dialogFlow(syntaxTree['token']);
        df.entities.create(syntaxTree, function(error, results) {
            if(error) {
                return console.log("error in entity creation!");
            }
            df.intents.useWebHook(() => {console.log('Done default')});
            df.intents.create(syntaxTree, function(error, results) {        
                if(error) {
                    return console.log (error + "\n\nError in intents creation \n\n");
                }
            })
        });

        mBots = [];

        for(mb in microBots) {
            mBots.push(microBots[mb].replace('#machineName', mb + 'Bot'));
            rootDialog = rootDialog.replace('//require', 'var ' + mb + ' = require("' + './' + mb + '");\n//require');
        }
        console.log(mBots);
        obj = {
            'user': user,
            'botCount': botCount,
            'port': port,
            'indexFile': indexFile,
            'rootDialog': rootDialog,
            'mBots': mBots
        }
        needle.post(deployURL + '/deploy/', obj, function(res, err) {
            console.log('HOSTED!');
            console.log(port);
            cb(port);
        })
    })
}

function deployBot(userId, count) {

}

module.exports = createBot;


/* TODO:
1. Send all the files with the expanded template to the deployService.
2. In the deployService, replace port for the index file.
3. Copy the files to the appropriate directory. (Moving same logic to deployService.)
*/