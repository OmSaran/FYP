var machina = require('machina')
var replier = require('../Utils/reply')
var machineGenerator = require('./CompilerUtils/machineGenerator')
// context.result.prameters 
module.exports = machina.Fsm.extend({

    initialize: function (options) {
        this.res = options.res;
        this.context = options.context
        this.intents = options.intents;
        this.entities = options.entities;
        this.i = 0;
        this.intentNames = Object.keys(this.intents);
    },

    initialState: "askReply",

    states:{
        askReply: {
            _onEnter: function(){
                replier(this.res, 'Tell me what I should reply with when the user tells me ' + this.intentNames[this.i] + ' intention, should I perform a fetch data from any table and store or should I reply with static text. Tell db for data operation and then reply or tell txt to reply with static text');
            },

            string: function(context, res){
                console.log("came here");
                this.context = context;
                this.res = res;
                let type = context.result.resolvedQuery + '';
                type = type.toLowerCase();
                
                if(type == 'data')
                    this.transition('getDbRule');
                else if(type == 'text')
                    this.transition('getStaticText');
                else
                    replier(this.res, 'Sorry I did not understand, tell is it db or text');
            }
        },  

        getDbRule: {
            _onEnter: function(){
                replier(this.res, 'What do you want to do get parameters, store parameters or update parameters. Reply with get, store or update');
            },

            dbGetRule_yes: function(context, res) {
                this.context = context;
                this.res = res;
                let contexts = context.result.contexts;
                let table = context.result.contexts[contexts.length - 1].parameters.tableName;
                let parameters = context.result.contexts[contexts.length - 1].parameters.columnNames.split(",");
                let filter = context.result.contexts[contexts.length - 1].parameters.filter;
                let response = context.result.contexts[contexts.length - 1].parameters.responseText;

                this.intents[this.intentNames[this.i]]['response'] = {'value': response, 'type': 'get', 'columns': parameters, 'filter': filter.length > 0 ? filter.split(',') : [], 'table': table};

                ++this.i;

                if(this.i < this.intentNames.length)
                    this.transition('askReply');
                else
                    this.transition('dfSignIn');
            },

            dbGetRule_no: function(context, res) {
                    this.transition('askReply');
            },

            dbStoreRule_yes: function(context, res){
                this.context = context;
                this.res = res;
                console.log(JSON.stringify(context));
                let contexts = context.result.contexts;
                let table = context.result.contexts[contexts.length - 1].parameters.tableName;
                let parameters = context.result.contexts[contexts.length - 1].parameters.coloumnNames.split(",");
                let response = context.result.contexts[contexts.length - 1].parameters.responseText;

                this.intents[this.intentNames[this.i]]['response'] = { 'value': response, 'type': 'store', 'columns': parameters, 'table': table };

                ++this.i;

                if (this.i < this.intentNames.length)
                    this.transition('askReply');
                else
                    this.transition('dfSignIn');
            },

            dbStoreRule_no: function(context, res) {
                this.transition('askReply');
            },

            dbUpdateRule_yes: function(context, res) {
                this.context = context;
                this.res = res;
                let contexts = context.result.contexts;
                let table = context.result.contexts[contexts.length - 1].parameters.tableName;
                let parameters = context.result.contexts[contexts.length - 1].parameters.coloumnNames.split(",")

                this.intents[this.intentNames[this.i]]['response'] = {'type': 'update', 'columns': parameters, 'table': table };

                ++this.i;

                if (this.i < this.intentNames.length)
                    this.transition('askReply');
                else
                    this.transition('dfSignIn');
            },

            dbUpdateRule_no: function(context, res){
                this.transition('askReply')
            },

            string: function(context, res)
            {
                this.context = context;
                this.res = res;
                let type = context.result.resolvedQuery + '';
                type = type.toLowerCase();
            
               replier(this.res, 'I did not get it, what do you want to do? store or get or update?')
                
            }
        },
        
        getStaticText: {
            _onEnter: function(){
                replier(this.res, 'ok, tell me what I should respond with, I will tell the exact same thing when the user\'s intention is ' + this.intentNames[this.i]);
            },

            string: function(context, res){
                this.context = context;
                this.res = res;
                this.context = context;
                this.res = res;

                this.intents[this.intentNames[this.i]]['response'] = {'value': context.result.resolvedQuery, 'type': 'text'};
                ++this.i;

                if(this.i < this.intentNames.length)
                    this.transition('askReply');

                else
                    this.transition('dfSignIn');
            }
        },

        dfSignIn: {
            _onEnter: function(){
                replier(this.res, 'Sign into https://console.dialogflow.com/ and create an agent. Once the agent is created, click on the gear icon on the left navigation bar and copy the developer access token and paste it here');
            },

            string: function(context, res){
                this.context = context;
                this.res = res;
                let accessToken = context.result.resolvedQuery;
                // create Dialogflow model
                this.transition('codeGen', accessToken);
            }
        },

        codeGen: {
            _onEnter: function(accessToken){
                let syntaxTree = {"intents": this.intents, "entities": this.entities, 'token': accessToken};
                console.log(JSON.stringify(syntaxTree));
                self = this;
                machineGenerator(syntaxTree, this.context.sessionId, function(port) {
                    replier(self.res, "Generating your bot..... " + 'http://52.226.73.198:' + port);
                });                
            },

            string: function(context, res){
                this.context = context;
                this.res = res;
                replier(this.res, 'Thank you for using this service to generate your own bot');
            }
        }
    }
});

/* try 
                {
                    let text = context.result.resolvedQuery + '';
                    text = text.toLowerCase();
                    let parts = text.split('$');
                    let type;

                    if(parts[0] == 'store' || parts[0] == 'get')
                        type = parts[0]
                    else
                        throw new Error('Not a valid operation');
                    
                    let reply = parts[2];
                    let columns = parts[1].split(',');
                    
                    let filter = {}
                    if(type == 'get' && parts.length > 3)
                    {
                        let filterTypes = parts[3].split(',');
                        for(let i = 0; i < filterTypes.length; ++i)
                        {
                            let filterParts = filterTypes[i].split('=');
                            filter[filterParts[0]] = filterParts[1];
                        }
                    }
                    
                    this.intents[this.intentNames[this.i]]['response'] = {'value': reply, 'type': type, 'columns': columns, 'filter': filter};
                    ++this.i;

                    if(this.i < this.intentNames.length)
                        this.transition('askReply');
                    else
                        this.transition('codeGen');
                }

                catch (error) 
                {
                    console.log(error);
                    replier(this.res, 'Sorry I did not understand that');
                }*/