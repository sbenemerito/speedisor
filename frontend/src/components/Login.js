import React from 'react';
import logo from '../assets/logo.png';

import api from '../utils/SpeedisorApi';


class Login extends React.Component {
  state = {
    username: null,
    password: null,
    password2: null,
    screen: 'login'
  }

  changeScreen = () => {
    const { screen } = this.state;

    if (screen === 'login') this.setState({ screen: 'signup' });
    else this.setState({ screen: 'login' });
  }

  handleInput = (field, event) => {
    const updateObj = {};
    updateObj[field] = event.target.value;

    this.setState(updateObj);
  }

  handleSubmit = () => {
    const { username, password, password2, screen } = this.state;
    const submitLink = screen === 'login' ? '/login/operator' : 'signup';
    const body = {
      username,
      password,
      password2
    };

    api.post(submitLink, body).then(response => {
      this.props.setAuth(response.data);
    }).catch(error => {
      alert(error.response.data.error);
    });
  }

  render() {
    const { screen } = this.state;

    return (
      <div className="container main-container">
        <img src={logo} alt="Logo" />
        <h1 className="title">Speedisor</h1>
        <p className="subtitle">
          A taxi monitoring app
        </p>

        {
          this.state.screen === 'login'
            ? <h3 style={{ marginBottom: '20px' }}>No account yet? <a onClick={this.changeScreen}>Signup here.</a></h3>
            : <h3 style={{ marginBottom: '20px' }}>Already have an account? <a onClick={this.changeScreen}>Login.</a></h3>
        }

        <div className="field">
          <label className="label">Username</label>
          <div className="control has-icons-left">
            <input className="input" type="text" placeholder="Your username" onChange={(event) => this.handleInput('username', event)} />
            <span className="icon is-small is-left">
              <i className="fas fa-user"></i>
            </span>
          </div>
        </div>

        <div className="field">
          <label className="label">Password</label>
          <div className="control has-icons-left">
            <input className="input" type="password" placeholder="Your password" onChange={(event) => this.handleInput('password', event)} />
            <span className="icon is-small is-left">
              <i className="fas fa-lock"></i>
            </span>
          </div>
        </div>

        {
          screen === 'login' ? null : (
            <div className="field">
              <label className="label">Confirm Password</label>
              <div className="control has-icons-left">
                <input className="input" type="password" placeholder="Confirm password" onChange={(event) => this.handleInput('password2', event)} />
                <span className="icon is-small is-left">
                  <i className="fas fa-lock"></i>
                </span>
              </div>
            </div>
          )
        }

        <div className="buttons">
          <a className="button is-link" onClick={this.handleSubmit}>Submit</a>
        </div>
      </div>
    );
  }
}

export default Login;
