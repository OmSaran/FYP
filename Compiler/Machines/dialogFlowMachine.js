var machina = require('machina')
var replier = require('../Utils/reply')
var bots = require('../bot')
var responseBot = require('./responseFlowMachine')

module.exports = machina.Fsm.extend({

    initialize: function (options) {
        this.res = options.res;
        this.context = options.context;
        this.intents = {} // "intent": {"utternaces": [], "parameters": }
        this.entities = {} // "entity": []
        this.intentName = ""
        this.entitiyTypes = { dateTime: "@sys.date-time", number: "@sys.number", text: "@sys.any" }
        replier(this.res, "Hey, I will help you build a bot by asking you a few questions" + ". What would you like to call this bot?");
    },

    initialState: 'askName',

    states: {
        askName: {
            _onEnter: async function() {
                await this.res.df.deleteContexts(this.context.sessionId);
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;
                this.botName = context.result.resolvedQuery;
                this.transition('confirmBotName');
            }
        },

        confirmBotName: {
            _onEnter: function() {
                replier(this.res, "Ok, Shall I name it as " + this.botName + "?");
            },

            yes: function(context, res) {
                this.res = res;
                this.context = context;
                this.transition('askIntentName');
            },

            no: function(context, res) {
                this.res = res;
                this.context = context;
                this.transition('askName');
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;
                replier(this.res, "sorry :( ");
            }
        },

        askIntentName: {
            _onEnter: function () {
                replier(this.res, "Ok, Tell me an activity your bot can do");
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;
                this.intentName = context.result.resolvedQuery.replace(/[\W_]+/g,"_");
                this.transition('confirmIntentName');
                // this.transition('askEntityName');
            },
        },

        confirmIntentName: {
            _onEnter: function () {
                replier(this.res, "ok, confirm adding the new query-type " + this.intentName + " (yes/no)");
            },

            yes: function (context, res) {
                this.res = res;
                this.context = context;
                this.transition("askIfEntitiesNeeded");
            },

            no: function (context, res) {
                this.res = res;
                this.context = context;
                replier(this.res, "Ok, I will not add it. Enter new query-type for me to help you further :)");
                this.transition('askIntentName');
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;
                replier(this.res, "sorry :( ");
            }
        },

        askIfEntitiesNeeded: {
            _onEnter: function () {
                let reply = "Do you wish to collect any fields with the current intent " + this.intentName + " ? (yes/ no)";
                replier(this.res, reply);
            },

            yes: function (context, res) {
                this.res = res;
                this.context = context;
                this.transition("askEntityName");
            },

            no: function (context, res) {
                this.res = res;
                this.context = context;
                this.transition("askUtterances");
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;
                replier(this.res, "Sorry, I did not understand that. Do you want your new bot to collect any fields with the current intent " + this.intentName + " ? (yes/ no)");
            }
        },

        askEntityName: {

            _onEnter: function() {
                // console.log(this);
                replier(this.res,
                    "Enter your field name"
                );
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;

                var fieldName = String(this.context.result.resolvedQuery);
                fieldName = fieldName.toLowerCase();

                this.entity = {
                    name: fieldName,
                    stateMachine: this
                };

                this.transition('askEntityType');
            }
        },

        askEntityType: {
            _onEnter: function() {
                replier(this.res,
                    "Enter the type of the field. Supported types are num, test, dateTime" + 
                    "If you want your field to take only a set of values type them " + 
                    "in this fashion - 'value1, value2..' "
                );
            },

            string: function(context, res) {
                this.res = res;
                this.context = context;

                var fieldType = String(context.result.resolvedQuery);                

                var fieldName = this.entity.name;

                if (fieldType == 'num')
                    fieldType = this.entitiyTypes['number'];

                else if (fieldType == 'text')
                    fieldType = this.entitiyTypes['text'];

                else if (fieldType == 'dateTime')
                    fieldType = this.entitiyTypes['dateTime'];

                else {
                    //create entity
                    let values = fieldType.split(',');
                    fieldType = "@" + fieldName;

                    if (this.entities[fieldName] == undefined) {
                        this.entities[fieldName] = [];
                        for (let i = 0; i < values.length; ++i)
                            this.entities[fieldName].push(values[i]);
                    }
                }

                this.entity.type = fieldType;
                this.transition('askEntityList');
            }
        },

        askEntityList: {
            _onEnter: function() {

                this.entity.create = function () {

                    if (this.stateMachine.intents[this.stateMachine.intentName] == undefined)
                        this.stateMachine.intents[this.stateMachine.intentName] = { "parameters": [] }

                    this.stateMachine.intents[this.stateMachine.intentName]["parameters"].push({ 
                        "name": this.name, 
                        "type": this.type, 
                        "isList": this.isList 
                    });

                    this.stateMachine.transition("askMoreEntity");
                }

                replier(this.res,
                    "Is the field a list? i.e can it take more than one value?"
                );
            },

            yes: function(context, res) {
                this.res = res;
                this.context = context; 

                this.entity.isList = true;
                this.entity.create();

                this.transition('askMoreEntity');
            },

            no: function(context, res) {
                this.res = res;
                this.context = context;

                this.entity.isList = false;                
                this.entity.create();

                this.transition('askMoreEntity');
            }
        },

        askEntity: {
            _onEnter: function () {
                replier(this.res, 
                    "Enter your field name and the type of the field you are expecting " + 
                    "(for example if the field is numberOfPeople the type will be number) " + 
                    "by a '$' default supported types are num, text, dateTime. " + 
                    "If you want your field to take only a set of values type them " + 
                    "in this fashion after $ 'value1, value2' type the last " + 
                    "value list if your field can take multiple values at once (example pizza toppings)"
                );
            },

            string: function (context, res) {
                this.res = res;
                this.context = context;
                try {
                    let text = context.result.resolvedQuery + "";
                    let parts = text.split('$');
                    let fieldName = parts[0].toLowerCase();
                    let fieldType = parts[1].toLowerCase();
                    let isList = false;

                    if (parts.length == 3)
                        isList = parts[2].trim() == 'list';

                    if (fieldType == 'num')
                        fieldType = this.entitiyTypes['number'];

                    else if (fieldType == 'text')
                        fieldType = this.entitiyTypes['text'];

                    else if (fieldType == 'dateTime')
                        fieldType = this.entitiyTypes['dateTime'];

                    else {
                        //create entity
                        let values = fieldType.split(',');
                        fieldType = "@" + fieldName;

                        if (this.entities[fieldName] == undefined) {
                            this.entities[fieldName] = [];
                            for (let i = 0; i < values.length; ++i)
                                this.entities[fieldName].push(values[i]);
                        }
                    }

                    if (this.intents[this.intentName] == undefined)
                        this.intents[this.intentName] = { "parameters": [] }

                    this.intents[this.intentName]["parameters"].push({ "name": fieldName, "type": fieldType, "isList": isList });

                    this.transition("askMoreEntity");
                }
                catch (error) {
                    console.error(error);
                    replier(this.res, "Sorry I did not understand what you said, try again");
                }
            }
        },
        // TODO: Ask before adding entity

        askMoreEntity: {
            _onEnter: function () {
                replier(this.res, "Do you want to add more entities? (yes/no)");
            },

            yes: function (context, res) {
                this.context = context;
                this.res = res;
                this.transition("askEntityName");
            },

            no: function (context, res) {
                this.context = context;
                this.res = res;
                this.transition("askUtterances");
            },

            string: function (context, res) {
                this.context = context;
                this.res = res;
                replier(this.res, "I did not quite get that, please tell yes or no");
            }
        },

        askUtterances: {
            _onEnter: function () {
                replier(this.res, "So how do you expect your customers to convey this query to your new assistant ? Let me know them, enter a $ between them");
            },

            string: function (context, res) {
                this.context = context;
                this.res = res;
                if (this.intents[this.intentName] == undefined)
                        this.intents[this.intentName] = { "parameters": [] }
                let text = context.result.resolvedQuery + "";
                let utternaces = text.split('$');
                this.intents[this.intentName]["utterances"] = utternaces;
                this.transition("askMoreIntents");
                console.log(JSON.stringify({ intents: this.intents, entities: this.entities }, '\t', null));
            }
        },

        askMoreIntents: {
            _onEnter: function () {
                replier(this.res, "Do you wish to add more intents? (yes/no)");
            },

            yes: function (context, res) {
                this.res = res;
                this.context = context;
                this.transition('askIntentName');
            },

            no: function (context, res) {
                this.res = res;
                this.context = context;
                let uuid = context.sessionId;
                console.log('changing bot')
                bots[uuid] = new responseBot({context: context, res: res, intents: this.intents, entities: this.entities, botName: this.botName});
            }
        }
    }
});