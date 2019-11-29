import React from 'react';
import logo from '../assets/logo.png';

import api from '../utils/SpeedisorApi';


class Login extends React.Component {
  state = {
    username: null,
    password: null
  }

  handleUsername = (event) => {
    this.setState({ username: event.target.value });
  }

  handlePassword = (event) => {
    this.setState({ password: event.target.value });
  }

  handleLogin = () => {
    const body = {
      username: this.state.username,
      password: this.state.password
    };

    api.post('/login/operator', body).then(response => {
      this.props.setAuth(response.data);
    }).catch(error => {
      alert(error.response.data.error);
    });
  }

  render() {
    return (
      <div className="container main-container">
        <img src={logo} alt="Logo" />
        <h1 className="title">Speedisor</h1>
        <p className="subtitle">
          A taxi monitoring app
        </p>

        <div className="field">
          <label className="label">Username</label>
          <div className="control has-icons-left">
            <input className="input" type="text" placeholder="Your username" onChange={this.handleUsername} />
            <span className="icon is-small is-left">
              <i className="fas fa-user"></i>
            </span>
          </div>
        </div>

        <div className="field">
          <label className="label">Password</label>
          <div className="control has-icons-left">
            <input className="input" type="password" placeholder="Your password" onChange={this.handlePassword} />
            <span className="icon is-small is-left">
              <i className="fas fa-lock"></i>
            </span>
          </div>
        </div>

        <div className="buttons">
          <a className="button is-link" onClick={this.handleLogin}>Submit</a>
        </div>
      </div>
    );
  }
}

export default Login;
