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
  WebView,
  View
} from 'react-native';
import SettingsList from 'react-native-settings-list';
import { NetworkInfo } from 'react-native-network-info';
import Table from 'react-native-simple-table';

const columns = [
  {
    title: 'Source',
    dataIndex: 'src',
    width: 105
  },
  {
    title: 'Destination',
    dataIndex: 'dst',
    width: 140
  },
  {
    title: 'Bytes',
    dataIndex: 'bytes',
    width: 80
  },
];

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
      <View style={{height:'auto'}}>
      <ListView
        dataSource={this.state.dataSource}
        renderRow={this.renderRow.bind(this)}
        automaticallyAdjustContentInsets={false}
        style={{backgroundColor: 'white'}}
      />
      </View>
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

  renderRow(rowData) {
    //Disable the user's own IP so they can't shut themselves off.
    var disabledVal = false;
    if (this.state.localip == rowData.IP) {
      disabledVal=true;
    }

    return(
      <View style={{flexDirection: 'row', paddingTop: 1}}>
      <View style={styles.messageBox}>
        <Text style={styles.messageBoxBodyText}>{rowData.host + ': ' + rowData.IP}</Text>
        <Switch
          onValueChange={(value) => this.onChangeFunction({value: value, name: rowData.mac})}
          value={this.state.switchArray[rowData.mac]}
          disabled={disabledVal}
        />
      </View>
      </View>
    );
  }
}

class MyVPNExternal extends Component {
    constructor(){
      super();
      this.state = {
        loaded: false,
        hostname: 'foo',
        externalIP: "bar",
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
            externalIP: responseData.ip,
            loaded:true,
          });
        }).done();
    }

    render() {
      if(!this.state.loaded) {
        return (<Text> Data not yet loaded</Text>
        );
      }
      return (
        <View>
        <View style={styles.vpnMessageBox} >
        <Text style={styles.messageBoxBodyText}>
          {'External Hostname: ' + this.state.hostname}</Text>
        </View>
        <View style={styles.vpnMessageBox} >
        <Text style={styles.messageBoxBodyText}>
          {'External IP: ' + this.state.externalIP}</Text>
        </View>
        </View>
      );
    }
}

class MyProviderStatus extends Component {
    constructor(){
      super();
      this.onChangeFunction = this.onChangeFunction.bind(this);
      this.state = {
        loaded: false,
        protectedByVPN: false,
        switchValue: false,
      };
    }

    componentDidMount() {
      this.verifyVPNConnection();
    }

    verifyVPNConnection() {
      fetch('https://www.privateinternetaccess.com/', {
        method: 'GET'
      })
        .then((response) => response.text())
        .then((responseData) => {
          var found = responseData.indexOf('You are protected by PIA');
          console.log('TAMARA: ' + found);
          if (found != -1) {
            this.setState({
              protectedByVPN: true,
              switchValue: true,
              loaded: true,
            });
          } else {
            this.setState({
              protectedByVPN: false,
              switchValue: true,
              loaded: true,
            });
          }
        }).done();
    }

    render() {
      if(!this.state.loaded) {
        return (<Text> Data not yet loaded</Text>
        );
      }
      var protectedString, colorString;
      if(this.state.protectedByVPN) {
        protectedString = 'Your privacy is protected by Mozilla.';
        colorString = styles.vpnMessageBoxGreen;
      } else {
        protectedString = 'You are not protected by VPN!';
        colorString = styles.vpnMessageBoxRed;
      }
      return (
        <View>
        <View style={colorString} >
        <Text style={styles.messageBoxBodyText}>
          {protectedString} </Text>
        <Switch
          value={this.state.protectedByVPN}
          onValueChange={(value) => this.onChangeFunction({value: value})}
          disabled={false}
        />
        </View>
        </View>
      );
    }
  onChangeFunction(value){
    this.setState({switchValue: value.value});
    var data = { enabled : value.value, };
    fetch('http://192.168.1.1:8080/toggleVpn/', {
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
  }
}

class MyWeb extends Component {
  render() {
    let custom = {'Cookie': "sysauth=71c51986bcbd9b81914eb8ad9391c12a;"};

    return ( <WebView source={{uri: 'http://192.168.1.1/cgi-bin/luci/admin/status/realtime/connections',
            headers: custom}}
          style={{marginTop: 20}} />);
  }
}

class ConnTable extends Component {
  constructor(){
    super();
    this.state = {
      loaded: false,
    };
  }

  componentDidMount() {
    setInterval(function() {
      this.getExternalNetworkInfo();
    }.bind(this), 5000);
  }

  getExternalNetworkInfo() {
    fetch('http://192.168.1.1:8080/connections', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
      .then((response) => response.json())
      .then((responseData) => {
        this.setState({
          dataSource: responseData.connections,
          loaded:true,
        });
      }).done();
  }

  render() {
    if(!this.state.loaded) {
      return (<View><Text> Loading data </Text></View>);
    }
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Active Connections</Text>
        <Table height={320} columnWidth={60} columns={columns} dataSource={this.state.dataSource} />
      </View>
    );
  }
}

export default class RouterApp extends Component {
  render() {
    return (
      <View style={styles.container}>
      <View style={{backgroundColor: 'gray'}} >
      <MyWeb />
      <Text style={styles.topMessageBoxTitleText}>Pause Internet for Devices</Text>
      </View>
      <MyListView />
      <View style={{backgroundColor: 'gray'}} >
        <Text style={styles.topMessageBoxTitleText}>VPN Status</Text>
      </View>
      <MyProviderStatus />
      <MyVPNExternal />
      <View style={{backgroundColor: 'gray'}} >
        <Text style={styles.topMessageBoxTitleText}>Active Connections</Text>
      </View>
      <ConnTable />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /*justifyContent: 'space-between',*/
    backgroundColor: '#F5FCFF',
    flexDirection: 'column'
  },
  messageBox:{
        backgroundColor:'#E66000',
        width:415,
        paddingTop:18,
        paddingBottom:20,
        paddingLeft:20,
        paddingRight:20,
        borderRadius:10
    },
    topMessageBoxTitleText:{
        fontWeight:'bold',
        color:'#fff',
        textAlign:'center',
        fontSize:20,
        marginTop:10,
        marginBottom:10,
        backgroundColor: 'gray'
    },
    messageBoxTitleText:{
        paddingTop:15,
        fontWeight:'bold',
        color:'#fff',
        textAlign:'left',
        fontSize:20,
        marginBottom:1,
        backgroundColor: 'gray'
    },
    vpnMessageBox:{
          backgroundColor:'#E66000',
          width:415,
          paddingTop:10,
          paddingBottom:20,
          paddingLeft:20,
          paddingRight:20,
          borderRadius:10,
          marginBottom:1
      },
      vpnMessageBoxRed:{
            backgroundColor:'#E66000',
            width:415,
            paddingTop:10,
            paddingBottom:20,
            paddingLeft:20,
            paddingRight:20,
            borderRadius:10,
            marginBottom:1,
            borderWidth: 5,
            borderColor: 'red'
        },
        vpnMessageBoxGreen:{
              backgroundColor:'#E66000',
              width:415,
              paddingTop:10,
              paddingBottom:20,
              paddingLeft:20,
              paddingRight:20,
              borderRadius:10,
              marginBottom:1,
              borderWidth: 5,
              borderColor: 'green'
          },
    vpnMessageBoxTitleText:{
        paddingTop:0,
        fontWeight:'bold',
        color:'#fff',
        textAlign:'left',
        fontSize:20,
        marginTop: 0,
        marginBottom:1,
        backgroundColor: 'gray',
        borderRadius: 10
    },
    messageBoxBodyText:{
        color:'#fff',
        fontSize:16,
    },
    messageBoxBodyTextRed:{
        color:'red',
        fontSize:16,
    },
    messageBoxBodyTextGreen:{
        color:'green',
        fontSize:16,
    }
});

AppRegistry.registerComponent('RouterApp', () => RouterApp);
