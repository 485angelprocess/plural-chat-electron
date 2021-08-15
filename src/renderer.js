import Vue from '../node_modules/vue/dist/vue.esm.browser.js';

var $ = global.jQuery = require('jquery');

//TODO:
// Vue should be rendered in main threads

// Ipc renderer is electron frontend for requesting data
const ipcRenderer = require('electron').ipcRenderer;

// Load system data
//const systemdata = ipcRenderer.sendSync('system-read', '');

Vue.component('alter-id', {
  /*
  Display alter identifications
  */
  props: ['activealter', 'alter'],
  emits: ['select-alter'],
  computed: {
    displayname: function(){
      if (!this.alter.shortname || this.alter.shortname.length === 0){
        return this.alter.name;
      }
      else{
        return this.alter.shortname;
      }
    },
    active: function(){
      if (!this.activealter){
        return false;
      }
      //TODO: apply shares
      if (this.alter.name === this.activealter.name){
        return true;
      }
    }
  },
  methods: {
    selectAlter(){
      this.$emit('select-alter', this.alter);
    }
  },
  template: `<button
              v-on:click="selectAlter"
              :class="{ alteractiveselect: active }">
              {{ displayname }}</button>`

});

Vue.component('message-window', {
  /* Parent component for messaging context */
  props: ['activealter', 'system'],
  data: function(){
    return {
      channel: 'direct', // active message serv er
    }
  },
  computed: {
    activealterdisplay: function(){
      // Display string for logged in user
      if (!this.activealter){
        return "logged out";
      }
      else if (!!this.activealter.shortname){
        return "hello " + this.activealter.shortname;
      }
      else{
        return "hello " + this.activealter.name;
      }
    }
  },
  methods: {
    selectAlter: function(alter){
      // Select new active alter for message context
      this.$emit("login", alter);
    }
  },
  template: `
    <div id="messagewindow">
      <button class="windowcontrolbutton"
        v-on:click="$emit('switchwindow', 'preferences')">
        Preferences
      </button>

      <alter-id
        v-for="item in system"
        v-bind:activealter="activealter"
        v-bind:alter="item"
        v-bind:key="item.id"
        v-on:select-alter="selectAlter"
      ></alter-id>

      <h1>{{ activealterdisplay }}</h1>

      <message-feed
        v-bind:alter="activealter"
        v-bind:tag="channel">
      </message-feed>
    </div>
  `
});

Vue.component('message-feed',{
  /*
  Message parent component
  */
  props: ['alter', 'tag'],
  data: function(){
    return {
      number: 50,
      messages: []
    };
  },
  watch: {
    alter: function(){
      this.loadmessages();
    },
    number: function(){
      this.loadmessages();
    }
  },
  updated: function(){
    this.$nextTick(function(){
      // Scroll to bottom when view has been rendered
      this.scrollToBottom();
    })
  },
  methods: {
    scrollToBottom: function(){
      /*
        Scroll to bottom of messages
      */
      const el = this.$refs.messagefeed;

      if (el){
        el.scrollTop = el.scrollHeight;
      }
    },
    loadmessages: function(){
      /*
      Load messages with filter
      */
      var mdata;
      mdata = ipcRenderer.sendSync('message-read', {
        tag: this.tag,
        number: this.number,
        target: this.alter
      });
      //console.log(mdata);
      if (mdata === undefined){
        this.messages = [];
      }
      this.messages = mdata;
      this.scrollToBottom();
    },
    sendMessage: function(text, recipient){
      /*
      Send a new message,
      update message database
      and reload active message data
      */
      if (!recipient){
        recipient = "all"; // default to all
      }
      var request = {"tag": this.tag,
                "text": text,
                "sender": this.alter.name,
                "receiver": recipient
                }

      console.log("Sending message", request);
      ipcRenderer.on('message-error', (event, arg) => {
        console.error(arg);
      });
      ipcRenderer.on('message-log', (event, arg) => {
        console.log(arg);
        this.loadmessages(); // reload messages
      });
      ipcRenderer.send('message-write', request);
    }
  },
  template:`<div class="messages">
      <div ref="messagefeed" class="messagefeed">
        <message
          v-for="m in messages"
          v-bind:msg="m"
          v-bind:alter="alter"
          v-bind:key="m.id"
        ></message>
      </div>
      <message-input
        v-if="!!alter"
        v-on:send-message="sendMessage"
      />
    </div>
    `
});

Vue.component('message', {
  /*
  Display a single message
  */
  props: ['msg', 'alter'],
  computed: {
    datedisplay: function(){
      return this.msg.date.toUTCString();
    },
    id: function(){
      return this.msg.date.getTime();
    },
    messageSender: function(){
      // Computes to True is the message is sent from the currently logged in user
      if (! this.alter){
        return false;
      }
      return (this.msg.sender) === this.alter.name;
    }
  },
  template:`
      <div class="messagebox">
      <p :class="[{ messageSender }, messageSender ? '' : 'messageRecipient']">
      <span class="messagetext">{{ msg.text }}</span>
      <span class="messagerecipientfield">[{{ msg.sender }} to {{ msg.target }}]</span>
      <span class="messagedatefield">{{ datedisplay }}</span></p>
      </div>`
});

Vue.component('message-input', {
  /*
  Message input box

  TODO: add selection for recipients
  */
    data: function(){
      return {
        msgtext: "",
        recipient: ""
      }
    },
    methods: {
      sendMessage: function(){
        /* Send message by emitting to message feed */
        this.$emit('send-message', this.msgtext);
        this.msgtext = "";
      },
      sendMessageKey: function(e){
        /* Send message on enter pressed */
        if (e.keyCode === 13){
          this.sendMessage();
        }
      }
    },
    template:
      `
      <div class="messageinput">
        <input
          v-model="msgtext"
          v-on:keyup="sendMessageKey"
        >
        <button v-on:click="sendMessage">send</button>
      </div>
      `
});

Vue.component('preferences-window', {
  /* Parent  window for preferences context */
  props: ['activealter', 'system'],
  data: function(){
    return {
      // TODO: dynamically define
      configfields: [{name: 'all', id: 0},
                {name: 'system', id: 1},
                {name: 'messagestore', id: 2},
                {name: 'frontlog', id: 3}]
    }
  },
  computed: {
    alterfields: function(){
      /* Format alter fields for clear form */
      var fields = [];
      for (var i = 0; i < this.system.length; i++){
        fields.push({name: this.system[i].name, id: this.system[i].id});
      }
      return fields;
    }
  },
  template: `
    <div id="preferenceswindow">
      <button class="windowcontrolbutton"
        v-on:click="$emit('switchwindow', 'messaging')">
        Messaging
      </button>

      <add-alter-form
        v-bind:system="system"
        v-on:new-user-added="$emit('reload-system')">
      </add-alter-form>

      <clear-data-form
        v-bind:fields="configfields"
        v-bind:requestype="'configfile'"
        v-bind:prompt="'data'">
      </clear-data-form>

      <clear-data-form
        v-bind:fields="alterfields"
        v-bind:requesttype="'alter'"
        v-bind:prompt="'alter'"
        v-on:cleared-data="$emit('reload-system')">
      </clear-data-form>
    </div>
  `
});

Vue.component('add-alter-form', {
  /* Add new headmates */
  props: ['system'],
  data: function(){
    return {
      name: "",
      shortname: "",
      reply: ""
    }
  },
  computed: {
    shares: function(){
      var s = [];
      for (var i = 0; i < this.system.length; i++){
        s.push({name: this.system[i].name, id: i, selected: false});
      }
      return s;
    }
  },
  methods: {
    addUser: function(){
      var sharenames = [];
      for (var i = 0; i < this.shares.length; i++){
        if (this.shares[i].selected){
          sharenames.push(this.shares[i].name)
        }
      }
      console.log("Adding new user", this.name);
      console.log("User shares with", sharenames);

      ipcRenderer.on('system-write-error', (event, arg) => {
        this.reply = "Error: " + arg;
      });

      ipcRenderer.on('system-write-log', (event, arg) => {
        this.reply = arg;
      });

      ipcRenderer.send("system-write", {
        name: this.name,
        shortname: this.shortname,
        shares: sharenames
      });
      this.$emit('new-user-added');
    }
  },
  template: `
    <div class="addalterform">
      <p>Add new user:</p>
      <span>Name: (must be unique)</span>
      <input
        v-model="name"/>
      <br/>

      <span>Shortname: (how name will be displayed)</span>
      <input
        v-model="shortname"/>
      <br/>

      <span>Shares: (user will be able to see all messages to these users)</span>
      <ul>
        <alter-selection
          v-for="s in shares"
          v-bind:name="s.name"
          v-on:input="s.selected = $event">
        </alter-selection>
      </ul>

      <button v-on:click="addUser">Add User</button>
      <p>{{ reply }}</p>
    </div>
  `
});

Vue.component('alter-selection', {
  /* Radio button selector for an alter
    Emits true/false on selected
  */
  props: ['name', 'selected'],
  template: `
    <li class="alterselectionradio">
      <input type="radio"
        v-bind:name="name"
        v-bind:value="name"
        v-on:input="$emit('input', $event.target.value)"/>
      <label for="name">{{ name }}</label>
    </li>
  `
});

Vue.component('clear-data-form', {
  /* Clear data */
  props: ['fields', 'requesttype', 'prompt'],
  data: function(){
    return {
      cleardatafield: undefined,
      response: ""
    }
  },
  methods: {
    clearDataRequest(){
      /* Clear data */
      if (!this.cleardatafield){
        return null;
      }
      ipcRenderer.on('clear-data-reply', (event, arg) => {
        // On async reply
        console.log("Clear data reply", arg);
        this.response = arg;
        this.$emit('cleared-data');
      });
      var request = {};
      request[this.requesttype] = this.cleardatafield;
      ipcRenderer.send("clear-data", request);
    }
  },
  template: `
    <div id="cleardataform">
      <label for="cleardatatype">Clear {{ prompt }}:</label>
      <select
        name="cleardatatype"
        v-model="cleardatafield">
        <option
          v-for="f in fields"
          :value="f.name"
          :key="f.id">
          {{ f.name }}
        </option>
      </select>
      <button v-on:click="clearDataRequest()">
        Clear data
      </button>
      <span>{{ response }}</span>
    </div>
  `
});

Vue.component('add-user-form', {
  /* Add user to system */
});

var app = new Vue({
    el: '#app',
    data: {
      title: "pluralchat",
      activewindow: "messaging",
      loggedInAlter: null,
      system: undefined
    },
    computed: {
      displayMessaging: function() {
        return (this.activewindow === "messaging");
      },
      displayPreferences: function() {
        return (this.activewindow === "preferences");
      }
    },
    created(){
      this.loadSystemData();
    },
    methods: {
      loginNewAlter(alter){
        console.log("Logging in as", alter);
        this.loggedInAlter = alter;
      },
      switchWindow(window){
        this.activewindow = window;
      },
      loadSystemData(){
        // Read alters into component
        var systemdata = ipcRenderer.sendSync('system-read', '');
        if (!!systemdata.system){
          // Auto assign ids
          // Note this forces an order
          // of headmates rather than let the system choose it
          for (var i = 0; i < systemdata.system; i++){
            systemdata.system[i].id = i;
          }
          this.system = systemdata.system;
        }
        console.log("Loaded system", this.system);
      }
    }
});
