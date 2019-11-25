import React from 'react';
import { StyleSheet, Text, View, Button, Image, TextInput, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';

import api from '../utils/SpeedisorApi';
import getEnvVars from '../environment';

const { apiUrl } = getEnvVars();


export default class App extends React.Component {
  state = {
    username: null,
    password: null
  }

  handleUsername = (text) => {
    this.setState({ username: text });
  }

  handlePassword = (text) => {
    this.setState({ password: text });
  }

  handleLogin = () => {
    const body = {
      username: this.state.username,
      password: this.state.password
    };

    api.post('/login/driver', body).then(response => {
      this.props.setAuth(response.data);
    }).catch(error => {
      Alert.alert(error.response.data.error);
    });
  }

  render() {
    const { username, password } = this.state;

    return (
      <View style={styles.container}>
        <View style={{
          marginRight: 'auto',
          marginLeft: 'auto',
          marginBottom: 30,
        }}> 
          <Image
            source={require("../assets/icon.png")}
          /> 
        </View>

        <Text>Username</Text>
        <View style={{
          borderBottomColor: '#000000',
          borderBottomWidth: 1,
          marginBottom: 20,
        }}>
          <TextInput
            editable
            maxLength={16}
            onChangeText={this.handleUsername}
          />
        </View>

        <Text>Password</Text>
        <View style={{
          borderBottomColor: '#000000',
          borderBottomWidth: 1,
          marginBottom: 30,
        }}>
          <TextInput
            editable
            secureTextEntry
            onChangeText={this.handlePassword}
          />
        </View>

        <View style={{
          marginRight: 'auto',
          marginLeft: 'auto',
        }}> 
          <Button
            title="Submit"
            onPress={this.handleLogin}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  }
});
