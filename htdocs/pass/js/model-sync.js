(function () {
  'use strict';

  let domain = 'waka-pass.onsip.com';

  let states = ['offline', 'connecting', 'connected', 'verified'];

  function Sync() {
    this.wasFirst = null;
    this.state = 'offline';

    this.doverify =
    this.onverify =
    this.oncert =
    this.onpass = () => {};
  }

  Sync.prototype = {
    /* Enter your PIN, connect, and discover endpoints */
    register(pin) {
      if (this.state !== 'offline') {
        console.error("register from bad state");
        return;
      }

      this.state = 'connecting';

      this.ua = new SIP.UA({
        uri: '' + pin + '@' + domain,
        traceSip: true
      });

      this.ua.on('registered', response => {
        if (!response) return;
        let contacts = response.getHeaders('Contact');
        if (contacts.length > 1) {
          console.log('I am not first');
          this.wasFirst = false;
          this.ua.unregister();
          this.session = this.ua.invite('' + pin + '@' + domain, {
            media: {
              constraints: {},
              dataChannel: true
            }
          });
          this.session.on('accepted', response => {
            this.session.data.remote_fingerprint = this.getfingerprint(response.body);
            this.session.data.local_fingerprint = this.getfingerprint(this.session.request.body);
            if (this.session.mediaHandler.dataChannel) {
              this.verify();
            } else {
              this.session.mediaHandler.on('dataChannel', _ => this.verify());
            }
          });
          this.session.on('terminated', _ => {
            this.stop();
          });

        } else {
          console.log('Nobody here yet');
          this.wasFirst = true;
          this.ua.on('invite', session => {
            this.ua.unregister();
            this.session = session;

            this.session.mediaHandler.on('getDescription', sdp => {
              this.session.data.local_fingerprint = this.getfingerprint(sdp.sdp);
              this.session.data.remote_fingerprint = this.getfingerprint(this.session.request.body);
            });

            this.session.mediaHandler.on('dataChannel', _ => this.verify());

            this.session.accept({
              media: {
                constraints: {},
                dataChannel: true
              }
            });

            this.session.on('terminated', _ => {
              this.stop();
            });
          });
        }


      });
    },

    /* Verify dtls fingerprint */
    getfingerprint(sdp) {
      let parser = /\r\na=fingerprint.* (.*)\r\n/;
      let match = sdp.match(parser);
      return (match && match.length >= 2) ? match[1] : null;
    },

    verify() {
      if (this.state !== 'connecting') {
        console.error("verify from bad state");
        return;
      }

      this.state = 'connected';
      this.dataChannel = this.session.mediaHandler.dataChannel;
      this.dataChannel.onmessage = this.gotmessage.bind(this);
      let local = this.session.data.local_fingerprint;
      let remote = this.session.data.remote_fingerprint;

      console.log('Please manually verify!');
      console.log('You are: ', local);
      console.log('They are: ', remote);

      if (this.wasFirst) {
        this.doverify(local, remote);
      } else {
        this.doverify(remote, local);
      }
    },

    approve() {
      if (this.state !== 'connected') {
        console.error('approve from bad state');
        return;
      }
      this.local_approved = true;
      this.dataChannel.send('OK');
      this.check();
    },

    check() {
      if (this.state !== 'connected') {
        console.error('check from bad state');
      } else if (this.local_approved && this.remote_approved) {
        this.state = 'verified';
        console.log('Verified!');
        this.onverify();
      }
    },

    gotmessage(event) {
      if (event.data === 'OK') {
        this.remote_approved = true;
        this.check();
      } else  if (this.state === 'verified') {
        this.onmessage(event.data);

        let json = JSON.parse(event.data);
        let type = json.type;
        let data = json.data;

        if (type === 'cert') {
          console.log('received encrypted cert');
          this.oncert(data);
        }
        if (type === 'pass') {
          console.log('received encrypted password', data);
          this.onpass(data);
        }
      } else {
        console.warn('message blocked, not yet trusted');
      }
    },

    stop() {
      if (!this.ua) {
        return;
      }
      this.ua.stop();
      this.dataChannel = this.session = this.ua = this.wasFirst = null;
      this.local_approved = this.remote_approved = false;
      this.state = 'offline';
      this.ondisconnect();
    },

    send(type, data) {
      if (this.state !== 'verified') {
        console.log('send from bad state');
        return;
      }

      this.dataChannel.send(JSON.stringify({
        type: type,
        data: data
      }));
    }
  };

  app.Sync = Sync;

})();
