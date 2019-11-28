import React from 'react';
import { StyleSheet } from 'react-native';

import Login from './components/Login';
import Stats from './components/Stats';

export default class App extends React.Component {
  state = {
    user: null,
    token: null,
    socket: null
  }

  setAuth = ({ user, token }) => {
    this.setState({ user, token });
  }

  setSocket = (socket) => {
    this.setState({ socket });
  }

  render() {
    const { socket, token, user } = this.state;

    return user === null ? <Login setAuth={this.setAuth} />
                         : <Stats user={user} token={token} setSocket={this.setSocket} socket={socket} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
