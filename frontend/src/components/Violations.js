import React from 'react';
import { Map, GoogleApiWrapper, Marker } from 'google-maps-react';

import api from '../utils/SpeedisorApi';


class Stats extends React.Component {
  state = {
    violationsData: [],
    locationData: []
  }

  componentDidMount() {
    const { token } = this.props;

    api.get('/violations', { headers: { Authorization: token } }).then(response => {
      let currentLocationData = response.data.map(item => {
        const parsedLocation = item.location.split(', ').map(x => parseFloat(x).toFixed(2));
        return { latitude: parsedLocation[0], longitude: parsedLocation[1] };
      });

      this.setState({ violationsData: response.data, locationData: currentLocationData });
    }).catch(error => {
      console.log(error, 'error');
    });
  }

  render() {
    const { violationsData, locationData } = this.state;
    const center = locationData.length > 0 ? { lat: locationData[0].latitude, lng: locationData[0].longitude }
                                           : { lat: 7.0862388, lng: 125.6134375 };

    return (
      <div className="main-container">
        <h1 className="title">Violations</h1>
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
                          key={index}
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
                <th>Timestamp</th>
                <th>Taxi</th>
                <th>Location</th>
                <th>Speed Limit (KPH)</th>
                <th>Driver Speed (KPH)</th>
              </tr>
            </thead>
            <tbody>
              {
                violationsData.map((item, index) => {
                  return (
                    <tr key={ item.id }>
                      <td>{ index + 1 }</td>
                      <td>{ item.date_created }</td>
                      <td>{ item.taxi_name }</td>
                      <td>{ item.location }</td>
                      <td>{ item.max_speed }</td>
                      <td>{ item.driver_speed }</td>
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
