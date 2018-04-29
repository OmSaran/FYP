import * as React from "react";
import { Card, CardActions, CardHeader, CardText } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import * as CopyToClipboard from 'react-copy-to-clipboard';

class DataAccess extends React.Component<undefined, DataAccessState> {

    constructor() {
        super(undefined);
        this.state = {text: 'Click on generate to get a new password', password: ''};
        this.getPassword = this.getPassword.bind(this);
    }

    getPassword() {
        var data = null;
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        let context = this;

        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === 4) {
                let data = JSON.parse(this.responseText);
                context.setState({text: 'Username: ' + data['user'] + ' Password: ' + data['password'], password: data['password']});        
            }
        });

        xhr.open("GET", "/dbpass");
        xhr.setRequestHeader("authorization", localStorage['token']);
        xhr.send(data);
    }

    render() {
        return <Card style = {{width: "70%", margin: 20}}>
            <CardHeader
                title="See and modify the data collected by your bots"
                subtitle="You can generate new password here and add it in the database client with database name same as user name and HOST as botc.keygit.info"
            />
            <CardText>
                Password generated here appears only once, make sure to store it somewhere safe.
            </CardText>
            <CardText>
                {this.state.text}
            </CardText>
            <CardActions>
                <FlatButton label="Generate" secondary = {true} onClick = {this.getPassword}/>
                {
                    (this.state.password != '') && <CopyToClipboard text={this.state.password}>
                    <FlatButton label="Copy to clipboard"/>
                  </CopyToClipboard>
                }
            </CardActions>
        </Card>
    }
}

interface DataAccessState {
    password: string;
    text: string;
}

export default DataAccess;