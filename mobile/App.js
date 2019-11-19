import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';

import Login from './components/Login';

export default class App extends React.Component {
  state = {
    user: null,
    location: null
  }

  componentDidMount() {
    this._getLocationPermission();
    Location.watchPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 1000,
      distanceInterval: 1,
    }, location => {
      this.setState({ location });
    });
  }

  setUser(user) {
    this.setState({ user });
  }

  render() {
    const { location, user } = this.state;

    return user === null ? <Login/> : (
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
      this.setState({
        errorMessage: 'Permission to access location was denied',
      });
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
