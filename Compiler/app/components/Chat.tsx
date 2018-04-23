import * as React from "react";
import { GoogleLogin } from 'react-google-login';
var Widget = require('react-chat-widget').Widget;
var addResponseMessage  = require('react-chat-widget').addResponseMessage;
import 'react-chat-widget/lib/styles.css';
import AppBar from 'material-ui/AppBar';
import FlatButton from 'material-ui/FlatButton';

class Chat extends React.Component<{}, ChatState>
{
    constructor() {
        super({});
        this.googleFailure = this.googleFailure.bind(this)
        this.googleSuccess = this.googleSuccess.bind(this)
        this.handleNewUserMessage = this.handleNewUserMessage.bind(this);
        this.state = { authState: AuthStates.verifying, ws: null }
    }

    googleSuccess(response: any) {
        console.log('LOGGED IN as ' + response.Zi.id_token);
        let context = this;
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === 4 && this.status == 200) {
                console.log(this.responseText);
                let data = JSON.parse(this.responseText);
                if (data['status']) {
                    localStorage['token'] = data['token'];
                    context.setState({ authState: AuthStates.loggedIn });
                    context.showChatScreen();
                }
            }
        });

        xhr.open("GET", "/token?id_token=" + response.Zi.id_token);
        xhr.send();
    }

    showChatScreen(){
        let button: any = document.querySelector('.launcher');   
                    button.click();
                    addResponseMessage("Hey!");
    }

    googleFailure() {
        console.log('LOGGED OUT')
    }

    componentDidMount() {
        if(localStorage['token'] == undefined)
            this.setState({authState: AuthStates.loggedOut});
        
        var data = null;
        let context = this;
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === 4) {
                console.log(this.responseText);
                let data = JSON.parse(this.responseText);
                if (data['valid']) {
                    context.setState({ authState: AuthStates.loggedIn});
                    context.showChatScreen();
                }
                else
                    context.setState({authState: AuthStates.loggedOut})
            }
        });

        xhr.open("GET", "/verify?token=" + localStorage['token']);
        xhr.send(data);
    }

    handleNewUserMessage(newMessage: string){
        var data = null;

        if(this.state.ws == null) {
            let webSocket = new WebSocket("ws://localhost:5000/message");
            let context = this;
            this.setState({ws: webSocket});
            webSocket.onopen = function() {
                context.sendMessage(webSocket, newMessage);
            }
            webSocket.onmessage = function(event) {
                addResponseMessage(event.data);
            }
        }

        else
            this.sendMessage(this.state.ws, newMessage);
    }

    sendMessage(webSocket: WebSocket, text: string) {
        webSocket.send(JSON.stringify({user: localStorage['token'], text: text}));
    }

    render() {
        let button = null;
        let content = null;

        if(this.state.authState == AuthStates.loggedOut)
        {    
            let googleLogin: any = <GoogleLogin
                clientId="73442255804-vncq031noc9anfj3td8q07dt02pllpve.apps.googleusercontent.com"
                buttonText="Login"
                onSuccess={this.googleSuccess}
                onFailure={this.googleFailure}
                style = {{visibility: 'hidden'}}
            />;
            button = (<FlatButton label = "LOGIN" onClick = {() => {googleLogin.click()}}>{googleLogin}</FlatButton>)
            content = <p>Let us show a card here</p>
        }

        else if(this.state.authState == AuthStates.loggedIn)
        {
            button = (
        <FlatButton onClick = {() => {localStorage.clear(); window.location.reload()}} label = "Logout"/>
            )
            content = <Widget handleNewUserMessage={this.handleNewUserMessage} title="Bot Compiler" subtitle="Talk to me to create your own bot!" showCloseButton = {false}/>;
        }

        return (
            <div>
            <AppBar
            title={<span>BotC</span>}
            iconElementRight={button}
            />
            {content}
            </div>
        );
    }
}

enum AuthStates { loggedIn, loggedOut, verifying }

interface ChatState {
    authState: AuthStates,
    ws: WebSocket
}

export default Chat