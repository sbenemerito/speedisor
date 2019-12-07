import React from 'react';
import './App.scss';
import logo from '../assets/logo.png';

import Login from './Login';
import Stats from './Stats';
import Drivers from './Drivers';
import Violations from './Violations';


class App extends React.Component {
  state = {
    user: null,
    token: null,
    socket: null,
    screen: 'stats',
    monitoringData: null
  }

  setScreen = (screen) => {
    this.setState({ screen });
  }

  setAuth = ({ user, token }) => {
    this.setState({ user, token });
  }

  setSocket = (socket) => {
    this.setState({ socket });
  }

  render() {
    const { monitoringData, user, token, socket, screen } = this.state;

    if (user === null) {
      return <Login setAuth={this.setAuth} />;
    }

    const screenMap = {
      stats: <Stats user={user} token={token} socket={socket} setSocket={this.setSocket} monitoringData={monitoringData}/>,
      drivers: <Drivers token={token} />,
      violations: <Violations token={token} />
    }

    return (
      <div className="container main-container">
        <img src={logo} alt="Logo" style={{ width: '5%' }} />
        <h1 className="title">Speedisor</h1>
        <p className="subtitle">
          A taxi monitoring app<br/><br/>
          <span className="buttons">
            <a
              className={ screen === 'stats' ? "button is-link" : "button is-info" }
              onClick={() => this.setScreen('stats')}
            >
              Live Monitoring
            </a>
            <a
              className={ screen === 'drivers' ? "button is-link" : "button is-info" }
              onClick={() => this.setScreen('drivers')}
            >
              Drivers
            </a>
            <a
              className={ screen === 'violations' ? "button is-link" : "button is-info" }
              onClick={() => this.setScreen('violations')}
            >
              Violations
            </a>
          </span>
        </p>
        {
          screenMap[screen]
        }
      </div>
    );
  }
}

export default App;
