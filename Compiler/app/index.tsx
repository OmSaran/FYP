import * as React from "react";
import * as ReactDOM from "react-dom";
import Chat from './components/Chat'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import * as injectTapEventPlugin from 'react-tap-event-plugin';

// const App = () => (
//     <MuiThemeProvider>
//       <Chat />
//     </MuiThemeProvider>
//   );

class App extends React.Component<undefined, undefined>
{
    constructor() {
        super(undefined);
    }

    render() {
        return (
            <MuiThemeProvider>
                <Chat />
            </MuiThemeProvider>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('app'));