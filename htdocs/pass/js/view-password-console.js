(function () {
  'use strict';

  function trying() {
    console.log('Trying...');
  }

  function printDone(message) {
    console.log(message);
    console.log('Done');
  }

  function PasswordConsoleView() {
    this.dobrowse =
    this.doread   =
    this.doedit   =
    this.doadd    =
    this.dodel    =
    this.dodebug  = (_ => {});
  }

  PasswordConsoleView.prototype = {
    browse() {
      trying();
      this.dobrowse().then(this.onbrowse);
    },

    onbrowse(values) {
      printDone(values);
    },

    read(key) {
      trying();
      this.doread(key).then(this.onread);
    },

    onread(value) {
      printDone(value);
    },

    edit(key, value) {
      console.log('Not trying...I have not written that yet.');
    },

    add(key, value) {
      trying();
      this.doadd(key, value).then(this.onadd);
    },

    onadd(bool) {
      printDone(bool);
    },

    del(key) {
      trying();
      this.dodel(key).then(this.ondel);
    },

    ondel(bool) {
      printDone(bool);
    },

    dump(key) {
      trying();
      console.log('Debugging password key', key);
      this.dodump(key).then(this.ondump);
    },

    ondump(ciphertext) {
      if (ciphertext === null) {
        printDone('Fetch failed. Ciphertext null.');
      } else {
        console.log('---Begin Ciphertext---');
        console.log(ciphertext);
        console.log('---End Ciphertext---');
        console.log('Done.');
      }
    }
  };

  app.PasswordConsoleView = PasswordConsoleView;
})();
