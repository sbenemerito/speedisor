import React from 'react';
import './App.scss';
import logo from '../assets/logo.png';

function App() {
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
          <input className="input" type="text" placeholder="Your username"/>
          <span className="icon is-small is-left">
            <i className="fas fa-user"></i>
          </span>
        </div>
      </div>

      <div className="field">
        <label className="label">Password</label>
        <div className="control has-icons-left">
          <input className="input" type="password" placeholder="Your password"/>
          <span className="icon is-small is-left">
            <i className="fas fa-lock"></i>
          </span>
        </div>
      </div>

      <div className="buttons">
        <a className="button is-primary">Primary</a>
        <a className="button is-link">Link</a>
      </div>
    </div>
  );
}

export default App;
