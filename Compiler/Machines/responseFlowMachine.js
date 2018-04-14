var machina = require('machina')
var replier = require('../Utils/reply')
var machineGenerator = require('./CompilerUtils/machineGenerator')

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

            string: function(context, res)
            {
                this.context = context;
                this.res = res;
                let type = context.result.resolvedQuery + '';
                type = type.toLowerCase();
                
                if(type == 'get')
                    this.transition('dbGetRule');
                else if(type == 'store')
                    this.transition('dbStoreRule');
                else if(type == 'update')
                    this.transition('dbUpdateRule');
                
                else
                {
                    replier(this.res, 'I did not get it, what do you want to do? store or get or update?')
                }
            }
        },

        dbGetRule: {
            _onEnter: function(){
                replier(this.res, 'tell me the table name and parameters you want to get and any filters and response text to use the parameters in with $ in between them. If you want to add a value to the filter manually use = . Example : order$toppings,status$finished=no$Status of your order with @toppings is @status');
            },

            string: function(context, res){
                try {
                    this.context = context;
                    this.res = res;
                    let template = context.result.resolvedQuery + '';
                    let parts = template.split('$');
                    
                    let table = parts[0];
                    let parameters = parts[1];
                    let filter = parts[2];
                    let response = parts[3];

                    this.intents[this.intentNames[this.i]]['response'] = {'value': response, 'type': 'get', 'columns': parameters.split(','), 'filter': filter.length > 0 ? filter.split(',') : [], 'table': table};

                    ++this.i;

                    if(this.i < this.intentNames.length)
                        this.transition('askReply');
                    else
                        this.transition('dfSignIn');
                } 
                catch (e) {
                    console.error(e);
                    replier(this.res, 'Example : order$toppings,status$finished=no$Status of your order with @toppings is @status');
                }
            }
        },

        dbStoreRule: {
            _onEnter: function(){
                replier(this.res, 'Tell me the parameters you want to store and the table in which you want to store them and if you want to store any other parameter not collected in the conversation use =. Example: orders$toppings,status=not confirmed,finished=no,size,base$Your order has been recorded!');
            },

            string: function(context, res){
                try {
                    this.context = context;
                    this.res = res;
                    let template = context.result.resolvedQuery + '';
                    let parts = template.split('$');

                    let table = parts[0];
                    let parameters = parts[1];
                    let response = parts[2];

                    this.intents[this.intentNames[this.i]]['response'] = { 'value': response, 'type': 'store', 'columns': parameters.split(','), 'table': table };

                    ++this.i;

                    if (this.i < this.intentNames.length)
                        this.transition('askReply');
                    else
                        this.transition('dfSignIn');
                } catch (error) {
                    console.error(error);
                    replier(this.res, 'Tell me the parameters you want to store and the table in which you want to store them and if you want to store any other parameter not collected in the conversation use =. Example: orders$toppings,status=not confirmed,finished=no,size,base$Your order has been recorded!');
                }
            },
        },

        dbUpdateRule: {
            _onEnter: function(){
                replier(this.res, 'Let me know the parameters you want to update and table name. Example: orders$size,finished=yes');
            },
            string: function(context, res){
                try {
                    this.context = context;
                    this.res = res;
                    let template = context.result.resolvedQuery + '';
                    let parts = template.split('$');

                    let table = parts[0];
                    let parameters = parts[1];

                    this.intents[this.intentNames[this.i]]['response'] = {'type': 'update', 'columns': parameters.split(','), 'table': table };

                    ++this.i;

                    if (this.i < this.intentNames.length)
                        this.transition('askReply');
                    else
                        this.transition('dfSignIn');
                } catch (error) {
                    console.error(error);
                    replier(this.res, 'Tell me the parameters you want to store and the table in which you want to store them and if you want to store any other parameter not collected in the conversation use =. Example: orders$toppings,status=not confirmed,finished=no,size,base$Your order has been recorded!');
                }
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