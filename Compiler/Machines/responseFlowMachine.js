var machina = require('machina')
var replier = require('../Utils/reply')
var replierAsync = require('../Utils/replyAsync')
var machineGenerator = require('./CompilerUtils/machineGenerator')

module.exports = machina.Fsm.extend({

    initialize: function (options) {
        this.res = options.res;
        this.context = options.context
        this.intents = options.intents;
        this.entities = options.entities;
        this.botName = options.botName;
        this.i = 0;
        this.intentNames = Object.keys(this.intents);
    },

    initialState: "askReply",

    states:{
        askReply: {
            _onEnter: async function(){
                await this.res.df.setContext(this.context.sessionId, 'reply');
                replier(this.res, 'Tell me what I should reply with when the user tells me ' + this.intentNames[this.i] + ' intention, should I perform a fetch data from any table and store or should I reply with static text.');
                replierAsync(this.res, 'Tell data for data operation and then reply');
                replierAsync(this.res, 'tell text to reply with static text');
            },

            '*': function(context, res){
                console.log("came here");
                
                
                let type = this.context.result.resolvedQuery + '';
                type = type.toLowerCase();
                
                if(type == 'data')
                    this.transition('getDbRule');
                else if(type == 'text')
                    this.transition('getStaticText');
                else
                    replier(this.res, 'Sorry I did not understand, let me know if it is data or text');
            }
        },  

        getDbRule: {
            _onEnter: function(){
                replier(this.res, 'What do you want to do get parameters, store parameters or update parameters. Reply with get, store or update');
            },

            dbGetRule_yes: function(context, res) {
                
                
                let contexts = context.result.contexts;
                let table = context.result.contexts[contexts.length - 1].parameters.tableName;
                let parameters = context.result.contexts[contexts.length - 1].parameters.coloumnNames.split(",");
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

            '*': function(context, res)
            {
                
                
                let type = this.context.result.resolvedQuery + '';
                type = type.toLowerCase();
            
               replier(this.res, 'I did not get it, what do you want to do? store or get or update?')
                
            }
        },
        
        getStaticText: {
            _onEnter: function(){
                replier(this.res, 'ok, tell me what I should respond with, I will tell the exact same thing when the user\'s intention is ' + this.intentNames[this.i]);
            },

            '*': function(context, res){
                
                
                
                

                this.intents[this.intentNames[this.i]]['response'] = {'value': this.context.result.resolvedQuery, 'type': 'text'};
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

            '*': function(context, res){
                
                
                let accessToken = this.context.result.resolvedQuery;
                // create Dialogflow model
                this.transition('codeGen', accessToken);
            }
        },

        codeGen: {
            _onEnter: function(accessToken){
                let syntaxTree = {"intents": this.intents, "entities": this.entities, 'token': accessToken};
                console.log(JSON.stringify(syntaxTree));
                self = this;
                replier(self.res, "Generating your bot..... ");
                replierAsync(self.res, "Deploying your bot..");
                machineGenerator.createBot(syntaxTree, this.context.sessionId, this.botName, function(error, msg) {
                    if(error) {
                        return replierAsync(self.res, 'Failed to deploy bot!');
                    }
                    if(msg.instruction)
                        replierAsync(self.res, msg.instruction);
                    if(msg.address)
                        replierAsync(self.res, "Deployed your bot with ip - " + msg.address);
                });
            },

            '*': function(context, res){
                
                
                replier(this.res, 'Thank you for using this service to generate your own bot, you can tell restart to create a new bot now.');
            }
        }
    }
});