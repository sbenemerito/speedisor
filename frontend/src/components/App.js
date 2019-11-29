import React from 'react';
import './App.scss';

import Login from './Login';


class App extends React.Component {
  state = {
    user: null,
    token: null,
    socket: null,
    screen: 'stats'
  }

  setAuth = ({ user, token }) => {
    this.setState({ user, token });
  }

  setSocket = (socket) => {
    this.setState({ socket });
  }

  render() {
    const { user, screen } = this.state;

    if (user === null) {
      return <Login setAuth={this.setAuth} />;
    }

    const screenMap = {
      stats: <h1>Stats</h1>,
      drivers: <h1>Drivers</h1>,
      violations: <h1>Violations</h1>
    }

    return screenMap[screen];
  }
}

export default App;
