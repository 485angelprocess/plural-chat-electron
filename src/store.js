/*
Utilities for saving and loading data

Cherry
Plural Chat
August 2021
*/

const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { ipcMain } = require('electron');

class Store {
  constructor(opts){
    /*
    Create object for storing data

    :opts:
      :configName: filename
      :path: (optional direct file path)
      :defaults: options for parsing data file
    */
    if (!!opts.configName){
      //Get Path of local user data from renderer or backend
      const userDataPath = (electron.app || electron.remote.app).getPath('userData');

      this.path = path.join(userDataPath, opts.configName + '.json');
      this.configName = opts.configName;
    }
    else if (!!opts.path){
      this.path = opts.path;
      this.configName = path.basename(this.path, '.json');
    }

    if (!!this.path){
      this.data = parseDataFile(this.path, opts.defaults);
    }
    // TODO: invalid arguments... raise
  }

  get(key){
    /*
    Get keyed property of data
    */
    return this.data[key];
  }

  set(key, val){
    /*
    Set keyed property of data
    */
    this.data[key] = val;
    try{
      //Synchronous file reads can be used for local application
      console.log("[Store] Set key, writing", this.path);
      fs.writeFileSync(this.path, JSON.stringify(this.data));
    }
    catch(error){
      console.error("[Store] Error writing data:", error);
    }
  }

  write(){
    /* Write data to json file */
    try{
      console.log("[Store] Saved data", this.path);
      fs.writeFileSync(this.path, JSON.stringify(this.data));
    }
    catch(error){
      console.error("[Store] Error writing data", error);
    }
  }

  clear(){
    /* Helper to clear all data in config data */
    this.data = {};
    this.write();
  }
}

function parseDataFile(filePath, defaults){
  /*
  Read data from file
  :arg filepath: name of file
  :arg defaults: default values
  :returns: json data on success
  :retunrs: defaults if error reading file
  */
  try{
    return JSON.parse(fs.readFileSync(filePath));
  }
  catch (error){
    console.log("Error parsing data file", error);
    return defaults;
  }
}

module.exports = Store
