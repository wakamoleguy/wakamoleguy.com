(function () {
  'use strict';

  let el = {
    passlist: document.getElementById('pass-list'),

    passadd: document.getElementById('pass-add'),
    passaddName: document.querySelector('#pass-add [name="name"]'),
    passaddPass: document.querySelector('#pass-add [name="password"]')
  };

  let templateCache = {};

  function Template(id, tag, params) {
    let template = templateCache[id] ||
      (templateCache[id] = document.getElementById(id));

    let node = document.createElement(tag);
    node.innerHTML = template.innerHTML;

    for (let key in params) {
      node.dataset[key] = params[key];
      let keyNode = node.querySelector('.' + key);
      if (keyNode) {
        keyNode.innerHTML = params[key];
      }
    }

    return node;
  }

  function trying() {
    console.log('Trying...');
  }

  function printDone(message) {
    console.log(message);
    console.log('Done');
  }

  function clearList() {
    for (let i = 1; i < el.passlist.children.length; 'no increment') {
      el.passlist.removeChild(el.passlist.children.item(i));
    }
  }

  function PasswordListView() {
    /* Make sure code doesn't crash */
    this.dobrowse =
    this.doread   =
    this.doedit   =
    this.doadd    =
    this.dodel    =
    this.dodebug  =
    this.dosyncpass = (_ => (new Promise(function (r) { r(); })));

    /* Wire the DOM to various methods */
    el.passadd.addEventListener('submit', e => {
      e.preventDefault();
      e.stopPropagation();

      let key = el.passaddName.value;
      let value = el.passaddPass.value;

      // validate key-value

      el.passaddName.value = el.passaddPass.value = '';
      this.add(key, value);
    }, false);
  }

  PasswordListView.prototype = {
    browse() {
      trying();
      this.dobrowse().then(this.onbrowse.bind(this));
    },

    clearList: clearList,

    onbrowse(values) {
      clearList();
      values.forEach(url => {
        let name = url.match(/.*\/([^/]*)\/$/)[1];

        let node = new Template('passlist-item-template', 'li', {
          name: name
        });

        /* Node.addabunchofeventlisteners() */
        node.querySelector('button.delete').addEventListener('click', _ => {
          this.del(name, node);
        }, false);
        node.querySelector('button.view').addEventListener('click', _ => {
          this.read(name, node);
        }, false);
        node.querySelector('button.sync').addEventListener('click', _ => {
          this.dosyncpass(name);
        });

        el.passlist.appendChild(node);
      });
      printDone(values);
    },

    read(key, node) {
      trying();
      this.doread(key).then(value => {
        return this.onread(value, node);
      });
    },

    onread(value, node) {
      if (node) {
        node.querySelector('.secret').innerHTML = value;
      }
      printDone(value);
    },

    edit(key, value) {
      console.log('Not trying...I have not written that yet.');
    },

    add(key, value) {
      trying();
      this.doadd(key, value).then(this.onadd.bind(this));

      let name = key;
      let node = new Template('passlist-item-template', 'li', {
        name: name
      });

      /* Node.addabunchofeventlisteners */
      node.querySelector('button.delete').addEventListener('click', _ => {
        this.del(name, node);
      }, false);
      node.querySelector('button.view').addEventListener('click', _ => {
        this.read(name, node);
      }, false);
      node.querySelector('button.sync').addEventListener('click', _ => {
        this.dosyncpass(name);
      });

      if (el.passlist.children.length < 2) {
        el.passlist.appendChild(node);
      } else {
        el.passlist.insertBefore(node, el.passlist.children.item(1));
      }
    },

    onadd(bool, name) {
      if (name) {
        // Need to add a UI element, because I didn't do this add myself
        let node = new Template('passlist-item-template', 'li', {
          name: name
        });

        /* Node.addabunchofeventlisteners */
        node.querySelector('button.delete').addEventListener('click', _ => {
          this.del(name, node);
        }, false);
        node.querySelector('button.view').addEventListener('click', _ => {
          this.read(name, node);
        }, false);
        node.querySelector('button.sync').addEventListener('click', _ => {
          this.dosyncpass(name);
        });

        if (el.passlist.children.length < 2) {
          el.passlist.appendChild(node);
        } else {
          el.passlist.insertBefore(node, el.passlist.children.item(1));
        }
      }
      printDone(bool);
    },

    del(key, node) {
      trying();
      this.dodel(key).then(bool => {
        this.ondel(bool, node);
      });
    },

    ondel(bool, node) {
      if (bool && node) {
        el.passlist.removeChild(node);
      }
      printDone(bool);
    },

    dump(key) {
      trying();
      console.log('Debugging password key', key);
      this.dodump(key).then(this.ondump.bind(this));
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

  app.PasswordListView = PasswordListView;
})();
