(function () {
  'use strict';

  let el = {
    section: document.getElementById('sync'),
    offline: document.getElementById('sync-offline'),
    pin:     document.getElementById('sync-pin'),
    match:   document.getElementById('sync-match'),
    online:  document.getElementById('sync-online'),

    setupButton: document.getElementById('sync-setup'),
    pinInput: document.querySelector('#sync-pin [name="pin"]'),
    connectButton: document.getElementById('sync-connect'),
    matchA: document.getElementById('sync-match-a'),
    matchB: document.getElementById('sync-match-b'),
    approveButton: document.getElementById('sync-approve'),
    denyButton: document.getElementById('sync-deny'),
    disconnectButton: document.getElementById('sync-disconnect'),
    certButton: document.getElementById('sync-cert')
  };

  let states = ['offline', 'pin', 'match', 'online'];

  function SyncView() {
    this.state = 'offline';
    this.doconnect = () => { this.onconnect('abcd', 'wxyz'); };
    this.dostop = () => {};
    this.doapprove = () => { this.onverify(); };

    /* Wire the DOM to various methods */
    el.setupButton.addEventListener('click', this.setup.bind(this), false);
    el.connectButton.addEventListener('click', this.connect.bind(this), false);
    el.approveButton.addEventListener('click', this.approve.bind(this), false);
    el.denyButton.addEventListener('click', this.deny.bind(this), false);
    el.disconnectButton.addEventListener('click', this.disconnect.bind(this), false);

    el.certButton.addEventListener('click', _ => {
      if (window.confirm('You are about to send your private key to the remote crypt. Are you sure?')) {
        this.dosynccert();
      }
    }, false);
  }

  SyncView.prototype = {
    setState(state) {
      if (states.indexOf(state) === -1) {
        return;
      }

      this.state = state;
      states.forEach(s => el.section.classList.toggle(s, s === state));
    },

    setup() {
      if (this.state !== 'offline') {
        console.log('setup from bad state');
      } else {
        el.pinInput.disabled = false;
        el.connectButton.disabled = false;
        this.setState('pin');
      }
    },

    connect() {
      if (this.state !== 'pin') {
        console.log('connect from bad state');
      }
      let pin = el.pinInput.value;
      el.pinInput.disabled = true;
      el.connectButton.disabled = true;

      this.doconnect(pin);
    },

    onconnect(fingerprintA, fingerprintB) {
      el.matchA.innerHTML = fingerprintA;
      el.matchB.innerHTML = fingerprintB;

      el.approveButton.disabled = false;
      el.denyButton.disabled = false;
      this.setState('match');
    },

    approve() {
      if (this.state !== 'match') {
        console.log('approve from bad state');
      } else {
        this.doapprove();
        el.approveButton.disabled = true;
        el.denyButton.disabled = true;
      }
    },

    deny() {
      if (this.state !== 'match') {
        console.log('deny from bad state');
      } else {
        this.dostop();
        this.setState('offline');
      }
    },

    onverify() {
      this.setState('online');
      el.approveButton.disabled = false;
      el.denyButton.disabled = false;
    },

    onmessage(msg) {
      console.log('Verified message received', msg);
    },

    disconnect() {
      this.dostop();
      this.setState('offline');
    },

    ondisconnect() {
      this.disconnect();
    }
  };

  app.SyncView = SyncView;
})();
