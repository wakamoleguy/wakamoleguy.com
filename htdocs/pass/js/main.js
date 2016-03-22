(function () {
  'use strict';

  /***
   *
   * Feature detection!
   *
   **/
  if (!('serviceWorker' in navigator)) {
    throw new Error('ServiceWorker API is required.');
  }

  if (!self.fetch) {
    throw new Error('Fetch API is required.');
  }

  /**
   * Sets up a new CryptApp client
   *
   * @param {String} name The name of your new CryptApp client.
   * @param {} models.crypt The encryption storage backend to use
   * @param {} views.password The view to display passwords
   */
  function CryptApp(name, models, views) {
    this.cryptModel = models.crypt;
    this.passwordView = views.password;
    this.syncModel = models.sync;
    this.syncView = views.sync;

    // Wire stuff together now, please.
    this.cryptModel.doaddok = this.passwordView.addok.bind(this.passwordView);
    this.passwordView.dobrowse = this.cryptModel.browse.bind(this.cryptModel);
    this.passwordView.doread = this.cryptModel.read.bind(this.cryptModel);
    this.passwordView.doedit = this.cryptModel.edit.bind(this.cryptModel);
    this.passwordView.doadd = this.cryptModel.add.bind(this.cryptModel);
    this.passwordView.dodel = this.cryptModel.del.bind(this.cryptModel);
    this.passwordView.dodump = this.cryptModel.dump.bind(this.cryptModel);

    this.syncView.dostop = this.syncModel.stop.bind(this.syncModel);
    this.syncView.doconnect = this.syncModel.register.bind(this.syncModel);
    this.syncView.doapprove = this.syncModel.approve.bind(this.syncModel);
    this.syncModel.doverify = this.syncView.onconnect.bind(this.syncView);
    this.syncModel.onverify = this.syncView.onverify.bind(this.syncView);
    this.syncModel.onmessage = this.syncView.onmessage.bind(this.syncView);
    this.syncModel.ondisconnect = this.syncView.ondisconnect.bind(this.syncView);

    this.syncView.dosynccert = _ => {
      return this.cryptModel.getCert().then(cert => {
        this.syncModel.send('cert', cert);
      });
    };
    this.syncModel.oncert = (cert) => {
      this.cryptModel.putCert(cert);
      this.cryptModel.browse().then(values => {
        if (!values) return;
        return Promise.all(values.map(url => {
          return this.cryptModel.del(url.match(/.*\/([^/]*)\/$/)[1]);
        }));
      }).then(_ => {
        this.passwordView.browse();
      });
    };

    this.syncModel.onpass = (pass) => {
      this.cryptModel.add(pass.key, pass.value, true).then(_ => {
        this.passwordView.onadd(true, pass.key);
      });
    };

    this.passwordView.dosyncpass = (name) => {
      return this.cryptModel.dump(name).then(ciphertext => {
        return this.syncModel.send('pass', {
          key: name,
          value: ciphertext
        });
      });
    };

    /* Initialize? */
    this.passwordView.browse();
  }


  let crypt = new CryptApp('crypt-app', {
    crypt: new app.Crypt(),
    sync: new app.Sync()
  }, {
    //password: new app.PasswordConsoleView(),
    password: new app.PasswordListView(),
    sync: new app.SyncView()
  });

  app.crypt = crypt;

})();
