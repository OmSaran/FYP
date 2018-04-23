var axios = require('axios')

function dfClient(token) {

    this.callDialogFlow = async function(query, sessionId) {
        const response = await axios.get('https://api.dialogflow.com/v1/query?v=20150910&lang=en&sessionId=' + sessionId + '&query=' + query, {
            'headers': {
                'Authorization': 'Bearer ' + token
            }
        });
        return response;
    }

    this.deleteContexts = async function(sessionId) {
        const response = await axios.delete('https://api.dialogflow.com/v1/contexts/?sessionId=' + sessionId, {
            'headers': {
                'Authorization': 'Bearer ' + token
            }
        });
    }

    this.setContext = async function(sessionId, context) {
        const reponse = await axios.post(
            'https://api.dialogflow.com/v1/contexts/?sessionId=' + sessionId, 
                [
                    {
                      "lifespan": 25,
                      "name": context,
                      "parameters": {
                      }
                    }
                ]
            , {
            'headers': {
                'Authorization': 'Bearer ' + token
            }
        }

        );
    }
}

module.exports = dfClient;