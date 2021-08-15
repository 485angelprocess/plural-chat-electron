const Store = require('./store.js');

//const ipcRenderer = require('ipc-renderer');
const pluralchatData = {};

pluralchatData.system = new Store({
  //Data about system
  configName: 'system',
  defaults: {
    system:
      [{
        name: "front1",
        shortname: "1",
        preferences: {},
        shares: []
      },
      {
        name: "front2",
        shortname: null,
        preferences: {},
        shares: []
      },
      {
        name: "front3",
        shortname: null,
        preferences: {},
        shares: []
      }]
  }
});

// Message
pluralchatData.message = new Store({
  configName: 'messagestore',
  defaults: {
    direct: [], //TODO: Generalize as server tags
    posts: []
  }
});

// Preferences are stored as separate data files
// Idea is to allow for manual editing
pluralchatData.preferences = {};

// Log when alters front
pluralchatData.frontlog = new Store({
  configName: 'frontlog',
  defaults: {
    log: [
      {
        name: 'name',
        type: 'login',
        date: new Date()
      }
    ]
  }
});

function preprocess_system(system_data){
/*
  Decode JSON file
*/
  const system = system_data = system_data.data.system;
  // Open preferences file for each alter
  for (var i = 0; i < system.length; i++){
    const profile_name = system[i].name;
    const defaults = {
      logfront: 'onSendMessage'
    }
    if (!system[i].preferences.configfile){
      // Create new preferences file
      pluralchatData.preferences[profile_name] = new Store({
        configName: profile_name + 'Preferences',
        defaults: defaults
      });

    }
    else{
      // Open existing preferences file
      pluralchatData.preferences[profile_name] = new Store({
        path: system[i].preferences.configfile,
        defaults: defaults
      });
    }
    // Save path to preferences file in alter data
    system[i].preferences.configfile = pluralchatData.preferences[profile_name].path;
  }
}

pluralchatData.all_data_stores = function(){
  /* Util function returns all
    data stores as an array
    (flattens data)
  */
  stores = [];
  stores.push(pluralchatData.system);
  stores.push(pluralchatData.message);
  stores.push(pluralchatData.frontlog);
  for (key in pluralchatData.preferences){
    stores.push(pluralchatData.preferences[key]);
  }
  return stores;
}

function preprocess_message(msg_data){
  /*
  Decode json for message data
  */

  // Convert all date fields to Date objects
  for (tag in msg_data.data){
    console.log("[System] Message tags", tag)
    console.log("[System] Message tag data", msg_data.data[tag]);
    for (var i = 0; i < msg_data.data[tag].length; i++){
      msg_data.data[tag][i]['date'] = new Date(msg_data.data[tag][i]['date']);
      console.log("Date", msg_data.data[tag][i]['date']);
    }
  }
  return msg_data;
}

preprocess_message(pluralchatData.message);
preprocess_system(pluralchatData.system);

pluralchatData.system.write();

module.exports = { pluralchatData }
