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
                replier(this.res, 'Enter in the format (get|store$col1,col2,col3$reply text @col1 @col2$filtercol1=param1,filtercol2=cu) cu is used to refer current user, cu will be there in every row your bot stores.');
            },

            string: function(context, res)
            {
                this.context = context;
                this.res = res;
                try 
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
            }
        },

        codeGen: {
            _onEnter: function(){
                // replace this line with google device login to get user name
                machineGenerator({"intents": this.intents, "entities": this.entities}, this.context.sessionId);
                replier(this.res, "Generating your bot.....");
            },

            string: function(context, res){
                this.context = context;
                this.res = res;
                replier(this.res, 'Thank you for using this service to generate your own bot');
            }
        }
    }
});