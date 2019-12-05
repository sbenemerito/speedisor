import React from 'react';
import socketIO from 'socket.io-client';
import { Map, GoogleApiWrapper, Marker } from 'google-maps-react';

import api from '../utils/SpeedisorApi';


class Stats extends React.Component {
  state = {
    liveData: [],
    locationData: []
  }

  componentDidMount() {
    const { token, socket, setSocket } = this.props;

    api.get('/drivers/live', { headers: { Authorization: token } }).then(response => {
      let currentLocationData = response.data.map(item => {
        return { ...item.stats, title: item.userDetails.taxi_name };
      });

      this.setState({ liveData: response.data, locationData: currentLocationData });

      if (socket === null) {
        const socket = socketIO(process.env.REACT_APP_API_URL, {
          transports: ['websocket'],
          jsonp: false
        });

        socket.connect();

        socket.on('connect', () => {
          setSocket(socket);
          socket.emit('bind token', { token: token });

          socket.on('new stats', data => {
            let updatedData = data.map(item => {
              return { ...item.stats, title: item.userDetails.taxi_name };
            });

            this.setState({ liveData: data, locationData: updatedData });
          });
        });
      } else {
        socket.on('new stats', data => {
          let updatedData = data.map(item => {
            return { ...item.stats, title: item.userDetails.taxi_name };
          });

          this.setState({ liveData: data, locationData: updatedData });
        });
      }
    }).catch(error => {
      console.log(error, 'error');
    });
  }

  // componentDidUpdate() {
  //   const { monitoringData } = this.props;

  //   if (monitoringData !== null) {
  //     const { liveData, locationData } = monitoringData;
  //     this.setState({ liveData, locationData });
  //   }
  // }

  render() {
    const { liveData, locationData } = this.state;
    const center = locationData.length > 0 ? { lat: locationData[0].latitude, lng: locationData[0].longitude }
                                           : { lat: 7.0862388, lng: 125.6134375 };

    return (
      <div className="main-container">
      <h1 className="title">Live Monitoring</h1>
        <div style={mapStyles}>
          <Map
            google={this.props.google}
            zoom={13}
            style={mapStyles}
            initialCenter={center}
          >
            {
              locationData.map((coords, index) => {
                return <Marker
                         key={coords.title}
                         position={{ lat: coords.latitude, lng: coords.longitude}}
                         label={`${index + 1}`}
                       />;
              })
            }
          </Map>
        </div>

        <div className="table-container" style={{ marginTop: '30px' }}>
          <table className="table is-fullwidth">
            <thead>
              <tr>
                <th>#</th>
                <th>Taxi</th>
                <th>Driver</th>
                <th>Plate #</th>
                <th>Location</th>
                <th>Speed (KPH)</th>
              </tr>
            </thead>
            <tbody>
              {
                liveData.map((item, index) => {
                  return (
                    <tr key={ index }>
                      <td>{ index + 1 }</td>
                      <td>{ item.userDetails.taxi_name }</td>
                      <td>{ item.userDetails.first_name } { item.userDetails.last_name }</td>
                      <td>{ item.userDetails.plate_number }</td>
                      <td>{ item.stats.latitude }, { item.stats.longitude }</td>
                      <td>{ Math.round((item.stats.speed * 3.6) * 100) / 100 }</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_API_KEY
})(Stats);

const mapStyles = {
  width: '100%',
  height: '600px',
  background: 'black',
  position: 'relative'
};
