var beautify = require('js-beautify').js_beautify;
var fs = require('fs');
var ncp = require('ncp').ncp;
var microBotGenerator = require('./microBotGenerator')

let stateTemplate = fs.readFileSync('./Machines/CompilerUtils/stateTemplate.txt', 'utf-8')
let dialogTemplate = fs.readFileSync('./Machines/CompilerUtils/dialogTemplate.txt', 'utf-8')
let indexTemplate = fs.readFileSync('./Machines/CompilerUtils/indexTemplate.txt', 'utf-8')

let port = 5000;

function generateJson(arr)
{
    let json = '{';
    for(let i = 0; i < arr.length; ++i)
    {
        if(arr[i] != 'user')
            json = json + '"' + arr[i] + '": "" + data[this.uuid]["context"].result.parameters["' + arr[i] + '"],'; 

        else
            json = json + '"' + arr[i] + '": "" + data[this.uuid]["context"].sessionId,';
    }
    json = json.substr(0, json.length - 1) + '}';
    return json;
}

function getStoreCode(response)
{
    let columns = response['columns'];
    let json = generateJson(columns);
    json = json.replace('}', ', "user": data[this.uuid]["context"].sessionId}');
    return 'await dbUtils.addValues("' + response['table'] + '",' + json + ' );';
}

function getRetrieveCode(response)
{
    let filters = Object.keys(response['filter']);
    let json = generateJson(filters);
    let code = 'let rows = await dbUtils.getColumns("' + response['table'] + '", ' + json + ', ' + '["' + response['columns'] + '"]); let template = "' + response['value'] + '"; let reply = ""; for(let i = 0; i < rows.length; ++i){ let temp = template; let row = rows[i]; let keys = Object.keys(row); for(let j = 0; j < keys.length; ++j){temp = temp.replace("@"+keys[j], row[keys[j]])} reply += temp;}\n replier(this.uuid, reply);';
    return code;
}

function getStateEntryCode(response, intent)
{
    if(response['type'] == 'text')
        return 'replier(this.uuid, "' + response['value'] + '");';
    
    else if(response['type'] == 'store')
    {
        //Default table being used, need to change this, ask table name from the user in responseFlowMachine
        // context.result.parameters
        let code = getStoreCode(response) + '\nreplier(this.uuid, "' + response['value'] + '");';  
        return code;
    }

    else if(response['type'] == 'mb')
    {
        return 'bots[this.uuid] = new ' + response['value'] + 'Bot({uuid: this.uuid, parent: this, rootIntent:"' + intent + '"});'
    }

    else
    {
        return getRetrieveCode(response);
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
        let code = getStateEntryCode(syntaxTree["intents"][intents[i]]["response"], intents[i]);
        newState = newState.replace("#code", code);
        
        // create states here
        for(let j = 0; j < intents.length; ++j)
        {
            // Add transitions here
            if(intents[j] != intents[i])
            {
                newState = newState.replace('//transitions', intents[j] + ': function(){this.transition("' + intents[j] + 'State")},\n//transitions');
            }

            else
            {
                newState = newState.replace('//transitions', intents[j] + ': async function(){' + code + '},\n//transitions');  
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

function createBot(syntaxTree, user)
{
    let rootDialog = beautify(getDialog(syntaxTree));
    let indexFile = beautify(getIndexFile(Object.keys(syntaxTree["intents"])));
    let microBots = microBotGenerator(syntaxTree['microBots']);

    let dir = './OutputBots/' + user;
    indexFile = indexFile.replace('#PORT', port++).replace('#PORT', port);

    if(!fs.existsSync(dir))
        fs.mkdirSync(dir);
    
    const count = fs.readdirSync(dir).length;
    let botDir = dir + '/bot' + count;
    
    fs.mkdirSync(botDir);
    ncp('./Template', botDir, (err) => {
        if(err){
            console.log('ERROR' + err);
        }
        else
        {
            for(mb in microBots)
            {
                fs.writeFileSync(botDir + '/Machines/' + mb + '.js', microBots[mb]);
                rootDialog = rootDialog.replace('//require', 'var ' + mb + ' = require("' + './' + mb + '");\n//require');
            }
                
            fs.writeFileSync(botDir + '/index.js', indexFile, 'utf-8');
            fs.writeFileSync(botDir + '/Machines/RootDialog.js', rootDialog, 'utf-8');
            
            console.log('DONE');
        }
    });
}

module.exports = createBot;
