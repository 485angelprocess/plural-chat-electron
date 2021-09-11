// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');

const { pluralchatData } = require('./src/system.js')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// API for requesting data on system

/*********************************************************/
// system-read
//  returns all basic identification data on alters
/*********************************************************/
ipcMain.on('system-read', (event, arg) => {
  /*
  Get system Data
  :returns: system: {} on null arg
  :returns: alter data if argument is index of alter
  */
  console.log("System read request:", arg);
  if (!arg || arg.length === 0){
    event.returnValue = pluralchatData.system.data;
  }
});

/****************************************************/
// system-write
//  write new alter to system
//  input:
//  {
//    "name": "uniqueidenitifier",
//    "shortname": "name that is displayed",
//    "shares": list of alter names this alter shares with
//  }
//  asynchronous reply:
//    'system-write-error' on invalid arguments
//    'system-write-log' on alter created
/****************************************************/
ipcMain.on('system-write', (event, arg) => {
  // Check that alter name is valid
  const systemData = pluralchatData.system.data.system;

  var newalter = {};

  if (!arg['name'] || arg['name'].length <= 0){
    event.reply("system-write-error", "undefined alter name");
    return null;
  }
  // Check for alter name uniqueness
  // Update this check if I find a better way to
  // have uniqueness in alters
  arg['name'] = String(arg['name']);

  for (var i = 0; i < systemData.length; i++){
    if (systemData[i].name === arg['name']){
      event.reply("system-write-error", "alter names must be unique");
      return null;
    }
  }

  newalter['name'] = arg['name'];

  // Get unique id
  if (!arg['id']){
    var id = 0;
    for (var i = 0; i < systemData.length; i++){
      id = systemData[i].id + 1;
    }
    newalter['id'] = id;
  }
  else{
    var id = int(alter['id']);
    for (var i = 0; i < systemData.length; i++){
      if (id == systemData[i].id){
        event.reply("system-write-error", "alter ids must be unique");
        return null;
      }
    }
    newalter['id'] = id;
  }

  // Optional shortname
  if (!!arg['shortname']){
    newalter['shortname'] = String(arg['shortname']);
  }

  // Append shares
  if (!!arg['shares'] && !!arg['shares'].length){
    newalter['shares'] = []
    for (var i = 0; i < arg['shares'].length; i++){
      newalter['shares'].push(String(arg['shares'][i]));
    }
  }

  newalter['preferences'] = {};

  systemData.push(newalter);
  pluralchatData.system.write(); // Update json file

  event.reply("system-write-log", "wrote " + newalter['name'] + " to system");
});

/****************************************/
// system-write
//  create new message server
//  {
//    "name": "servername"
//  }
// returns async "server-response" string message
ipcMain.on('server-write', (event, arg) => {
  console.log("Creating message server", arg.name);
  if (!arg.name){
    event.reply("server-response", "no server name specified");
    return null;
  }
  for (s in pluralchatData.message.data){
    if (s === arg.name){
      event.reply("server-response", "server already exists");
      return null;
    }
  }
  pluralchatData.message.data[arg.name] = [];
  pluralchatData.message.write();
  event.reply("server-response", "server " + arg.name + " created");
});

/************************************/
// server-delete
// delete a server from message server
// {
//  "name": "servername"
// }
// returns async "server-reponse" string message
ipcMain.on('server-delete', (event, arg) => {
  console.log("Deleting server", arg.name);
  if (!arg.name){
    event.reply("server-response", "no server name specified");
    return null;
  }
  for (s in pluralchatData.message.data){
    if (s === arg.name){
      delete pluralchatData.message.data[arg.name];
      pluralchatData.message.write();
      console.log("Deleted server", arg.name);
      event.reply("server-response", "deleted server " + arg.name);
      return null;
    }
  }
  event.reply("server-response", "server does not exist");
});

/***************************************/
// server-read
// get names of all servers
// returns sync array of string tags
ipcMain.on('server-read', (event, arg) => {
  tags = [];
  for (key in pluralchatData.message.data){
    tags.push(key);
  }
  console.log("Sending servers", tags)
  event.returnValue = tags;
});

ipcMain.on('message-read', (event, arg) => {
  /*
  Get message data
  request: {
    tag: "tagname",
    number: number of messages (uint),
    target: filter to messages sent to this alter
    datefrom: filter messages from this date
    dateto: filter messages to this date
  }
  returns undefined on error
  returns messages on sucess:
    [{
      "sender": "altersentfrom",
      "receiver": "all" / "altersentto" / "groupname",
      "date": Date,
      ...
    }
    ...]
  */
  console.log("[message-read] Message read request:", arg)
  if (!arg['tag']){
    event.returnValue = undefined;
    return -1;
  }
  data = pluralchatData.message.data[arg['tag']];

  if (data === undefined){
    event.returnValue = data;
    return -1;
  }

  if (!arg['target']){
    event.returnValue = undefined;
    return -1;
  }

  if (!!arg['target']){
    filtereddata = [];

    // Filter by message recipient
    // TODO:
    // add functionality for groups
    for (var i = 0; i < data.length; i++){
      const message = data[i];
      const msg_target = String(data[i]["target"]);
      if (msg_target === "all"){
        filtereddata.push(message);
      }
      else if (msg_target === arg['target'].name){
        filtereddata.push(message);
      }
      else if (data[i]["sender"] === arg['target'].name){
        // Also get messages sent from this person
        filtereddata.push(message);
      }
      else{
        for (share in arg['target'].shares){
          if (msg_target === share || data[i]["sender"] === share){
            filtereddata.push(message);
          }
        }
      }
    }

    data = filtereddata;
  }

  if (!!arg['sender']){
    filtereddata = [];

  // Allow for filtering by sender
      for (message in data){
        if (message["sender"] === arg['sender']){
          filtereddata.push(message);
        }
      }
      data = filtereddata;
  }

  //Sort by most recent date
  //TODO: run tests that this is not backwards
  data = data.sort(function(a, b){
    return a['date'] > b['date']
  });

  //Truncate by most recent date
  if (!!arg['datefrom']){
    filtereddata = [];
    for (message in data){
      if (message["date"] < arg['datefrom']){
        filtereddata.push(message);
      }
    }
    data = filtereddata;
  }

  //Truncate by latest date
  if (!!arg['dateto']){
    filtereddata = [];
    for (message in data){
      if (message["date"] > arg['dateto']){
        filtereddata.push(message);
      }
    }
    data = filtereddata;
  }

  // Only take the n most recent messages
  // Do this after filtering everyting else
  if (!!arg.number && arg.number > 0){
    if (data.length > arg.number){
      data = data.slice(arg.number - data.length, data.length);
    }
  }

  console.log("[message-read] Message read reply", data)

  event.returnValue = data;
});

ipcMain.on('message-write', (event, arg) => {
  /*
  Message format
  {
    "type": "tag",
    "text": "balh asdfasdgh",
    "sender": "altername",
    "receiver": "alternames", "all", or list of alternames,
    "meta": {
      .... cosmetic information etc
    }
    "date": date, optional
  }
  */
  newmessage = {};
  messagetag = arg["tag"];
  if (!messagetag){
    event.reply("message-error", "undefined message tag");
    return null;
  }
  if (!arg["text"] || arg["text"].length === 0){
    event.reply("message-error", "empty message text");
    return null;
  }
  newmessage["text"] = arg["text"];
  if (!arg["sender"]){
    event.reply("message-error", "empty message sender");
    return null;
  }

  //TODO: make actually efficient :p / trim and etc
  //Also this currently assumes longname is unique
  matches = false;
  for (var i = 0; i < pluralchatData.system.data.system.length; i++){
    alter = pluralchatData.system.data.system[i];
    //console.log("[Message-write] comparing senders", alter, arg["sender"]);
    if (alter["name"] === arg["sender"]){
      matches = true;
      newmessage["sender"] = alter["name"];
    }
  }

  if (matches == false){
    event.reply("message-error", "invalid message sender");
    return null;
  }

  if (!arg["meta"]){
    newmessage["meta"] = {};
  }

  if (!arg["date"]){
    newmessage["date"] = new Date();
  }

  if (!arg["receiver"]){
    event.reply("message-error", "invalid message recipient");
    return null;
  }

  newmessage["target"] = arg["receiver"];

  // Create new tag if it doesn't exist
  if (!pluralchatData.message.data[messagetag]){
    pluralchatData.message.data[messagetag] = [];
  }

  pluralchatData.message.data[messagetag].push(newmessage);
  pluralchatData.message.write();
  console.log("[message-write] wrote new message", newmessage);
  console.log("[message-write] new messagedata", pluralchatData.message);
  event.reply("message-log", "wrote message");
});

/****************************************************/
// Clear all data
// input:
//  {
//    "configfile": "configfile" (optional)
//    "alter": "alter" // clear only alter
//  }
// On no input, delete all data files
/***************************************************/
ipcMain.on('clear-data', (event, arg) => {
  console.log("Clear data arguments", arg);
  if (!!arg['alter']){
    for (var i = 0; i < pluralchatData.system.data.system.length; i++){
      if (pluralchatData.system.data.system[i].name === arg['alter']){
        pluralchatData.system.data.system.splice(i, 1);
        pluralchatData.system.write();
        event.reply("clear-data-reply", "cleared alter " + arg['alter']);
        return null;
      }
    }
  }
  const stores = pluralchatData.all_data_stores();
  if (!arg['configfile']){
    event.reply("clear-data-reply", "no configfile given");
  }
  else if (arg['configfile'] === "all"){
    // Clear all data
    for (var i = 0; i < stores.length; i++){
      stores[i].clear();
    }
    event.reply("clear-data-reply", "cleared all data");
  }
  else{
    for (var i = 0; i < stores.length; i++){
      if (arg['configfile'] === stores[i].configName){
        stores[i].clear();
        event.reply("clear-data-reply", "cleared " + arg['configfile']);
        return null;
      }
    }
  }
});
