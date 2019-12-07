import React from 'react';

import api from '../utils/SpeedisorApi';


class Drivers extends React.Component {
  state = {
    driverData: [],
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6Im9wZXJhdG9yIiwiaWF0IjoxNTc1NjgwNzkwLCJleHAiOjE1NzU3NjcxOTB9.br3h8Nxti-oANzwuY92ZieOe7_dQYiFvdjMsTZ4IghQ"
  }

  handleInput = (field, event) => {
    const updateObj = {};
    updateObj[field] = event.target.value;

    this.setState(updateObj);
  }

  handleSubmit = (event) => {
    // const { token } = this.props;
    const { token } = this.state;
    console.log(token, 'token');

    event.preventDefault();

    api.post('/drivers/create', this.state, { headers: { Authorization: token } }).then(response => {
      let currentData = this.state.driverData;
      currentData.push(response.data);

      this.setState({ driverData: currentData });
    }).catch(error => {
      alert(error.response.data.error);
    });
  }

  componentDidMount() {
    // const { token } = this.props;
    const { token } = this.state;

    api.get('/drivers', { headers: { Authorization: token } }).then(response => {
      this.setState({ driverData: response.data });
    }).catch(error => {
      console.log(error, 'error');
    });
  }

  render() {
    const { driverData } = this.state;

    return (
      <div className="main-container">
        <h1 className="title">Drivers</h1>
        <div className="table-container" style={{ marginTop: '30px' }}>
          <table className="table is-fullwidth">
            <thead>
              <tr>
                <th>Taxi</th>
                <th>Name</th>
                <th>Plate #</th>
                <th>Address</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {
                driverData.map(item => {
                  return (
                    <tr key={ item.id }>
                      <td>{ item.taxi_name }</td>
                      <td>{ item.first_name } { item.last_name }</td>
                      <td>{ item.plate_number }</td>
                      <td>{ item.address }</td>
                      <td>{ item.contact_number }</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>

        <hr style={{ background: 'black' }} />
        <h1 className="title">Add Driver</h1>
        
        <form onSubmit={this.handleSubmit}>
          <div className="field">
            <label className="label">Username</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('username', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-user"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Password</label>
            <div className="control has-icons-left">
              <input className="input" type="password" required="required" onChange={(event) => this.handleInput('password', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-lock"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Confirm Password</label>
            <div className="control has-icons-left">
              <input className="input" type="password" required="required" onChange={(event) => this.handleInput('password2', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-lock"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">First Name</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('first_name', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-user"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Last Name</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('last_name', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-user"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Taxi Name</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('taxi_name', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-car"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Plate Number</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('plate_number', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-car"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Address</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('address', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-home"></i>
              </span>
            </div>
          </div>

          <div className="field">
            <label className="label">Contact Number</label>
            <div className="control has-icons-left">
              <input className="input" type="text" required="required" onChange={(event) => this.handleInput('contact_number', event)} />
              <span className="icon is-small is-left">
                <i className="fas fa-phone"></i>
              </span>
            </div>
          </div>

          <div className="buttons">
            <input type="submit" className="button is-link" value="Submit" />
          </div>
        </form>
      </div>
    );
  }
}

export default Drivers;

const mapStyles = {
  width: '100%',
  height: '600px',
  background: 'black',
  position: 'relative'
};
