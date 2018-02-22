var beautify = require('js-beautify').js_beautify;
var fs = require('fs');
let stateTemplate = fs.readFileSync('./Machines/CompilerUtils/mbStateTemplate.txt', 'utf-8')
let dialogTemplate = fs.readFileSync('./Machines/CompilerUtils/mbotDialogTemplate.txt', 'utf-8')

function generator(microBots)
{
    let dialogs = {}
    for(bot in microBots)
    {
        let botStates = microBots[bot]
        let states = []
        let newDialog = dialogTemplate;
        for(state in botStates)
        {
            let newState = stateTemplate.replace('#stateName', state + "State");
            // add option for response as template
            let code;
            let response = botStates[state]['response'];

            if(response['type'] == 'text')
                code = 'replier(this.uuid, "' + response['value'] + '");'
            
            else if(response['type'] == 'mb')
            {
                let botName = reponse['value'] + 'Bot';
                code = 'bots[this.uuid] = new ' + botName + '({uuid: this.uuid, parent: this, rootIntent: this.rootIntent})';
                newDialog = newDialog.replace('//require', 'var ' + botName + '= require("./' + botName + '");\n//require');
            }

            else
            {
                // This is a databse operation, pass response to databseCodeGen to get code for that.
            }

            newState = newState.replace('#code', code).replace('#code', code)
            //Generating transitions
            let transitions = botStates[state]['transitions'];
            let entryCode = ''

            if(transitions != undefined)
            {
                entryCode += Object.keys(transitions);
                for(transition in transitions)
                {
                    // for this to be triggered, syntax tree should have name parameter which will be used to put it in the datastore.
                    transitionCode = transitions[transition]['name'] == undefined ? '' : 'data[this.uuid]["store"]["' + transitions[transition]['name'] + '"] = data[this.uuid]["context"].result.resolvedQuery;'
                    if(transitions[transition]['nextState'] != undefined)
                    {
                        transitionCode += 'this.transition("' + transitions[transition]['nextState'] + 'State");'
                    }

                    else
                    {
                        transitionCode += 'replier(this.uuid, "' + transitions[transition]['reply'] + '");'
                    }

                    newState = newState.replace('//transitions', transition + ': function(){' + transitionCode + '},' + '\n//transitions')
                }
            }

            newState = newState.replace('//transitions', '"*": function() {this.parent.handle("back", data[this.uuid]["intent"], this.rootIntent);}');
            newState = newState.replace('//expected', 'data[this.uuid]["expectedIntents"][this.rootIntent] = ["' + entryCode.replace(',', '","') + '"]')
            newDialog = newDialog.replace('//states', newState + ',\n//states');
        }
        dialogs[bot + "Bot"] = (beautify(newDialog));
    }
    return dialogs;
}

module.exports = generator