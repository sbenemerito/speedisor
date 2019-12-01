import React from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import socketIO from 'socket.io-client';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';

import getEnvVars from '../environment';

const { apiUrl } = getEnvVars();


export default class Stats extends React.Component {
  state = {
    location: null
  }

  componentDidMount() {
    const { socket, setSocket, user, token } = this.props;

    this._getLocationPermission();

    if (socket === null) {
      const socket = socketIO(apiUrl, {
        transports: ['websocket'],
        jsonp: false
      });

      socket.connect();

      socket.on('connect', () => {
        setSocket(socket);
        socket.emit('bind token', { token: token });

        Location.watchPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        }, location => {
          socket.emit('stat update', {
            userDetails: user,
            stats: location.coords,
            token
          });

          this.setState({ location });
        });
      });
    }
  }

  render() {
    const { location } = this.state;

    return (
      <View style={styles.container}>
        <Text>
        {
          location ? `Latitiude: ${location.coords.latitude}\n
                      Longitude: ${location.coords.longitude}\n
                      Speed: ${location.coords.speed * 3.6} KPH`
                   : 'null'
        }
        </Text>
      </View>
    );
  }

  _getLocationPermission = async () => {
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied. Speedisor cannot function properly.');
    }
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
