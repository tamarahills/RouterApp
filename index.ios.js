/**
 * App to remotely control the Router
 * https://github.com/tamarahills/RouterApp
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  Button,
  Image,
  Switch,
  Alert,
  ListView,
  View
} from 'react-native';
import SettingsList from 'react-native-settings-list';
import { NetworkInfo } from 'react-native-network-info';

const onButtonPress = () => {
};

class MyDinnerList extends Component {
  constructor(){
    super();
    this.onValueChange = this.onValueChange.bind(this);
    this.state = {
      switchValue: false,
      loaded: false,
      host: null,
      devices: [],
      localip: null,
      ssid: null,
    };
  }

  componentDidMount() {
    NetworkInfo.getIPAddress(ip => {
      this.setState({
        localip: ip,
      });
    });

    NetworkInfo.getSSID(ssid => {
      this.setState({
        ssid: ssid,
      });
    });
    this.fetchData();
  }

  fetchData() {
    fetch('http://127.0.0.1:8080/devices/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
      .then((response) => response.json())
      .then((responseData) => {
        this.setState({
          devices: responseData.deviceList,
          loaded: true,
        });
      }) .done();
    }

  render() {
    if(!this.state.loaded) {
      return (
        <View style={{backgroundColor:'gray',flex:1}}>
          <Text> Data not yet loaded </Text>
        </View>
      );
    }
    return (
      <View style={{backgroundColor:'gray',flex:1}}>
      <View style={{flex:1, marginTop:50}}>
        <SettingsList>
          <SettingsList.Header headerText='Devices' headerStyle={{color:'white'}}/>
          {
            this.state.devices.map((y) => {
              var canSwitch = true;
              // Turn off the ability to turn off wifi for this user if
              // they are the one running this app.
              if(0 === y.IP.localeCompare(this.state.localip)) {
                canSwitch = false;
              }
              return (<SettingsList.Item title={y.host + ':' + y.IP}
                hasNavArrow={false}
                hasSwitch={canSwitch}
                switchState={this.state.switchValue}
                switchOnValueChange={this.onValueChange}
                disabled={false} />);
            })
          }
        </SettingsList>
      </View></View>
    );
  }
  onValueChange(value){
    //this.setState({switchValue: value});
  }
}

class MyVPNList extends Component {
    constructor(){
      super();
      this.onValueChange = this.onValueChange.bind(this);
      this.state = {
        switchValue: false,
        loaded: false,
        hostname: null,
        externalIP: null,
      };
    }

    componentDidMount() {
      this.getExternalNetworkInfo();
    }

    getExternalNetworkInfo() {
      fetch('https://ipinfo.io/json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
        .then((response) => response.json())
        .then((responseData) => {
          this.setState({
            hostname: responseData.hostname,
            loaded: true,
            externalIP: responseData.ip,
          });
        }).done();
    }

    render() {
      if(!this.state.loaded) {
        return (
          <View style={{backgroundColor:'gray',flex:1}}>
            <Text> Data not yet loaded </Text>
          </View>
        );
      }
      return (
        <View style={{backgroundColor:'gray',flex:1}}>
          <View style={{flex:1, marginTop:50}}>
            <SettingsList>
            	<SettingsList.Header headerText='VPN Status' headerStyle={{color:'white'}}/>
              <SettingsList.Item
                hasNavArrow={false}
                switchState={this.state.switchValue}
                switchOnValueChange={this.onValueChange}
                hasSwitch={true}
                title='VPN Status'/>
                <SettingsList.Item
                  hasNavArrow={false}
                  hasSwitch={false}
                  title={'Current External hostname: ' +this.state.hostname} />
                <SettingsList.Item
                  hasNavArrow={false}
                  hasSwitch={false}
                  title={'Current External IP: ' +this.state.externalIP} />
            </SettingsList>
          </View>
        </View>
      );
    }
  onValueChange(value){
    this.setState({switchValue: value});
  }
}

export default class RouterApp extends Component {
  render() {
    return (
      <View style={styles.container}>
      <MyDinnerList />
      <Button onPress={onButtonPress} title="Pause Internet" color="#FF0000" accessibilityLabel="Learn more about this purple button" />
      <MyVPNList />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#F5FCFF',
    flexDirection: 'column'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('RouterApp', () => RouterApp);
