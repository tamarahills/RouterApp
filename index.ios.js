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

class MyListView extends Component {
  constructor() {
    super();
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      dataSource: ds.cloneWithRows(['row 1', 'row 2']),
      loaded: false,
      switchMap: new Map(),
      taskCreated: false,
      switchArray: {},
      devices: {},
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
    fetch('http://192.168.1.1:8080/devices/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
    .then((response) => response.json())
    .then((responseData) => {
        console.log(responseData.deviceList);
        var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        this.setState({
          dataSource: ds.cloneWithRows(responseData.deviceList),
          devices: responseData.deviceList,
          loaded: true,
        });
        const tmp= {};
      for(var i=0; i <responseData.deviceList.length; i++) {
        tmp[responseData.deviceList[i].mac] = responseData.deviceList[i].enabled;
      }
        this.setState({
          switchArray: tmp,
        });
    }) .done();
  }

  render() {
    return (
      <ListView
        dataSource={this.state.dataSource}
        renderRow={this.renderRow.bind(this)}
      />
    );
  }

  onChangeFunction(newState) {
    const tmp = this.state.switchArray;
    tmp[newState.name] = newState.value;

    var data= {
      mac: newState.name,
      value: newState.value,
    };

    fetch('http://192.168.1.1:8080/pause/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(function(response) {
      console.log(response);
    })
    .catch(function(response) {
      Alert.alert('Error', 'Unable to toggle the internet for this device')
      console.log(response);
    }).done();

    //TODO:  Try and move this inside of the .then clause.
    this.setState({
      switchArray: tmp,
    });
  }

  //TODO:  need conditional rendering on the user's device.
  renderRow(rowData) {
    return(
      <View style={{flexDirection: 'row', paddingTop: 20}}>
        <Text>{rowData.host + ': ' + rowData.IP}</Text>
        <Switch
          style={{marginBottom: 10}}
          onValueChange={(value) => this.onChangeFunction({value: value, name: rowData.mac})}
          value={this.state.switchArray[rowData.mac]}
        />
      </View>
    );
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
        protectedByVPN: false,
        enabled: false,
      };
    }

    componentDidMount() {
      this.getExternalNetworkInfo();
      this.verifyVPNConnection();
      this.getVPNStatusFromRouter();
    }

    verifyVPNConnection() {
      fetch('https://www.privateinternetaccess.com/', {
        method: 'GET'
      })
        .then((response) => response.text())
        .then((responseData) => {
          var found = responseData.indexOf('You are protected by PIA');
          if (found != -1) {
            this.setState({
              protectedByVPN: true,
            });
          } else {
            this.setState({
              protectedByVPN: false,
            });
          }
        }).done();
    }

    getVPNStatusFromRouter() {
      fetch('http://192.168.1.1:8080/vpnStatus/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
        .then((response) => response.json())
        .then((responseData) => {
          this.setState({
            enabled: (0 == responseData.vpnStatus.localeCompare('enabled'))? true: false,
            loaded: true,
          });
        }) .done();
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
      var statusString, colorString;
      if(this.state.protectedByVPN) {
        statusString = 'You are protected by PIA';
        colorString = styles.green;
      } else {
        statusString = 'Your privacy is not protected';
        colorString = styles.red;
      }


      return (
        <View style={{backgroundColor:'gray',flex:1}}>
          <View style={{flex:1, marginTop:50}}>
            <SettingsList>
            	<SettingsList.Header headerText='VPN Status' headerStyle={{color:'white'}}/>
              <SettingsList.Item
                hasNavArrow={false}
                switchState={this.state.enabled}
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
                <SettingsList.Item
                  hasNavArrow={false}
                  hasSwitch={false}
                  titleStyle={colorString}
                  title={statusString} />
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
      <Text style={{
        backgroundColor:'gray',
        marginTop:20}}>Pause Internet for Devices:</Text>
      <MyListView />
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
  red: {
    color: 'red',
  },
  green: {
    color: 'green',
  }
});

AppRegistry.registerComponent('RouterApp', () => RouterApp);
