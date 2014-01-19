var input, selectedView, rootView, library, recent, defaultExpressions;

$(function () {

  /** Text input used by Views to prompt user
      for variable/parameter/expression names */
  input = $('#input-overlay');

  input.open = function (callback) {
    this.show().find('input').
      on('blur', callback).
      on('keypress', function (e) {
        if (e.keyCode == 13) return callback();
      }).
      focus();
    return this;
  };

  input.close = function () {
    var child = this.find('input');
    var val = child.val();

    this.hide();
    child.
      off('blur keypress').
      val('').
      blur();

    return val;
  };

  /** Initialize the editor with an empty view */
  rootView = (new MultiTouch.EditorView()).select();
  $('#editor').html(rootView.el);

  $('#editor').hammer({
    prevent_default: true,
    swipe_max_touches: 3,
    drag_max_touches: 2

    /* 'Global' events act on selectedView */
  }).on('parenleft', function (e) {
    return selectedView.onParenLeft(e);
  }).on('parenright', function (e) {
    return selectedView.onParenRight(e);
  }).on('lambda', function (e) {
    return selectedView.onLambda(e);
  }).on('swipe', function (e) {
    return selectedView.onSwipe(e);

    /* dbl touch to drag editor view */
  }).on('dragstart', function () {
    this.dragOrigin = $('#editor').position();
  }).on('drag', function (e) {
    var top, left;
    if (e.gesture.touches.length == 2) {
      if (!this.gestureOrigin) {
        this.gestureOrigin = { x: e.gesture.deltaX, y: e.gesture.deltaY };
      }

      top = Math.max(-2000, Math.min(0, this.dragOrigin.top +
                                     (e.gesture.deltaY - this.gestureOrigin.y)));
      left = Math.max(-2000, Math.min(0, this.dragOrigin.left +
                                      (e.gesture.deltaX - this.gestureOrigin.x)));

      $(this).css({
        top: top,
        left: left
      });
    }
  }).on('dragend', function () {
    this.dragOrigin = this.gestureOrigin = null;
  });


  /** Save button */
  $('#save').hammer().on('tap', function () {
    var done = function () {
      var value = input.close(), toSave;
      if (value) {
        toSave = rootView.model.toJSON();
        toSave.displayName = value;
        toSave = new MultiTouch.Expression(toSave);
        library.add(toSave);
        toSave.save();
      }
    };

    input.open(done);
    return false;
  });

  /** Clear button */
  $('#delete').hammer().on('tap', function () {
    rootView.swapWith({
      term: 'expression'
    }).select();
  });

  /** New Var button */
  $('#new-var').hammer().on('tap', function () {
    selectedView.swapWith({
      term: 'variable',
      name: 'x'
    }).editName();
  });

  /** Help button */
  $('#help').hammer().on('tap', function () {
    $('#help-overlay').toggle();
  });

  /** Recently used list */
  recent = new MultiTouch.Library();
  recent.addVariable = function (name) {
    var existing = this.find(function (model) {
      return model.get('name') === name;
    });

    if (existing) {
      recent.remove(existing, {silent: true});
    }
    recent.add(new MultiTouch.Expression({
      term: 'variable',
      name: name,
      displayName: name
    }, {
      at: recent.length
    }));

    return this;
  };
  new MultiTouch.LibraryView({
    collection: recent,
    el: document.getElementById('recent'),
    appendEl: $('#new-var')
  });

  /** Local Library list */
  library = new MultiTouch.Library();
  library.fetch();
  if (!library.length) {
    library.update(defaultExpressions);
  }

  new MultiTouch.LibraryView({
    collection: library,
    el: document.getElementById('library')
  });

  /** Recent and Library scroll */
  $('#library, #recent').hammer({
    drag_lock_to_axis: true,
    prevent_defaults: true
  }).on('dragstart', function () {
    this.scrollOrigin = $(this).position();
  }).on('drag', function (e) {
    if (!this.scrollOrigin) return;
    var top = Math.max($('#side').height() - $(this).outerHeight(),
                       Math.min(0, this.scrollOrigin.top + e.gesture.deltaY / 2));

    $(this).css({ top: top });
  }).on('dragend', function () {
    this.scrollOrigin = null;
  });
});

defaultExpressions = [
  { displayName: 'TT',
    term: 'abstraction', param: 'x',
    exp: {
      term: 'abstraction', param: 'y',
      exp: {
        term: 'variable', name: 'x'
      }
    }
  },
  { displayName: 'FF',
    term: 'abstraction', param: 'x',
    exp: {
      term: 'abstraction', param: 'y',
      exp: {
        term: 'variable', name: 'y'
      }
    }
  },
  { displayName: '&&',  // \ab. ((a b) F)
    term: 'abstraction', param: 'a',
    exp: {
      term: 'abstraction', param: 'b',

      exp: {
        term: 'application',
        fun: {
          term: 'application',
          fun: { term: 'variable', name: 'a' },
          arg: { term: 'variable', name: 'b' }
        },
        arg: {
          displayName: 'FF',
          term: 'abstraction', param: 'x',
          exp: {
            term: 'abstraction', param: 'y',
            exp: { term: 'variable', name: 'y' }
          }
        }
      }
    }
  },
  { displayName: '||', // \ab. ((a T) b)
    term: 'abstraction', param: 'a',
    exp: {
      term: 'abstraction', param: 'b',

      exp: {
        term: 'application',
        fun: {
          term: 'application',
          fun: { term: 'variable', name: 'a' },
          arg: {
            displayName: 'TT',
            term: 'abstraction', param: 'x',
            exp: {
              term: 'abstraction', param: 'y',
              exp: { term: 'variable', name: 'x' }
            }
          }
        },
        arg: { term: 'variable', name: 'b' }
      }
    }
  },

  { displayName: 'IFTHENELSE', // \abc. ((a b) c)
    term: 'abstraction', param: 'a',
    exp: {
      term: 'abstraction', param: 'b',

      exp: {
        term: 'application',
        fun: {
          term: 'application',
          fun: { term: 'variable', name: 'a' },
          arg: { term: 'variable', name: 'b' }
        },
        arg: { term: 'variable', name: 'c' }
      }
    }
  },
  { displayName: 'ZERO',
    term: 'abstraction', param: 'f',
    exp: {
      term: 'abstraction', param: 'b',
      exp: {
        term: 'variable', name: 'b'
      }
    }
  },

  { displayName: 'SUCC',
    term: 'abstraction', param: 'n',
    exp: {
      term: 'abstraction', param: 'f',
      exp: {
        term: 'abstraction', param: 'b',
        exp: {
          term: 'application',
          fun: { term: 'variable', name: 'f' },
          arg: {
            term: 'application',
            fun: {
              term: 'application',
              fun: { term: 'variable', name: 'n' },
              arg: { term: 'variable', name: 'f' }
            },
            arg: { term: 'variable', name: 'b' }
          }
        }
      }
    }
  }
];
