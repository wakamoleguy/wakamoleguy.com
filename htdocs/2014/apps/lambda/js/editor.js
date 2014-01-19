if (typeof MultiTouch === 'undefined') MultiTouch = {};

MultiTouch.EditorView = Backbone.View.extend({

  initialize: function () {
    if (!this.model) {
      this.model = new MultiTouch.Expression();
    }

    this.parent = this.options.parent;

    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'destroy', this.remove);

    this.$el.hammer().
      on('doubletap', '> .view > .name',  $.proxy(this.editName, this)).
      on('doubletap', '> .view > .param', $.proxy(this.editParam, this)).
      on('tap', $.proxy(this.select, this)).
      on('swipe', $.proxy(this.onSwipe, this));

    this.render();
  },

  render: function () {
    var model = this.model,
        $el = this.$el;

    $el.addClass('expression');
    $el.toggleClass('variable', model.isVariable());
    $el.toggleClass('abstraction', model.isAbstraction());
    $el.toggleClass('application', model.isApplication());
    $el.toggleClass('unknown',
                    !(model.isVariable() ||
                      model.isAbstraction() ||
                      model.isApplication()));

    if (model.isVariable()) {
      $el.html(MultiTouch.EditorView.Variable.template(this.model.toJSON()));
    } else if (model.isAbstraction()) {
      $el.html(MultiTouch.EditorView.Abstraction.template(this.model.toJSON()));
    } else if (model.isApplication()) {
      $el.html(MultiTouch.EditorView.Application.template(this.model.toJSON()));
    } else {
      $el.html(MultiTouch.EditorView.template());
    }

    this.expView && this.expView.remove();
    this.funView && this.funView.remove();
    this.argView && this.argView.remove();

    if (model.has('exp')) {
      this.expView = new MultiTouch.EditorView({
        model: model.get('exp'),
        parent: this
      });
      this.$('> .view > .exp > *').replaceWith(this.expView.el);
    }
    if (model.has('fun')) {
      this.funView = new MultiTouch.EditorView({
        model: model.get('fun'),
        parent: this
      });
      this.$('> .view > .fun > *').replaceWith(this.funView.el);
    }
    if (model.has('arg')) {
      this.argView = new MultiTouch.EditorView({
        model: model.get('arg'),
        parent: this
      });
      this.$('> .view > .arg > *').replaceWith(this.argView.el);
    }

    return this;
  },

  editName: function () {
    var done = $.proxy(this.editedName, this);
    this.$el.addClass('editing');

    input.open(done);

    return false;
  },
  editedName: function () {
    var value = input.close();
    if (value) {
      recent.addVariable(value);
      this.model.set('name', value);
    }
    this.$el.removeClass('editing');

    this.select();
    return false;
  },

  editParam: function () {
    var done = $.proxy(this.editedParam, this);
    this.$el.addClass('editing');

    input.open(done);

    return false;
  },
  editedParam: function () {
    var value = input.close();
    if (value) {
      recent.addVariable(value);
      this.model.set('param', value);
    }
    this.$el.removeClass('editing');

    this.expView.select();
    return false;
  },

  swapWith: function (model) {
    this.model.swapWith(model);
    this.select();
    return this;
  },

  applyTo: function (model) {
    this.model.applyTo(model);
    this.argView.select();
    return this;
  },

  select: function (e) {
    if (selectedView) selectedView.deselect();
    this.$el.addClass('selected');
    selectedView = this;

    if (e) {
      return false;
    } else {
      return this;
    }
  },

  deselect: function () {
    this.$el.removeClass('selected');
    return this;
  },

  onParenLeft: function () {
    this.model.applyTo();
    if (this.funView.model.get('term') === 'expression') {
      this.funView.select();
    } else {
      this.argView.select();
    }
    return false;
  },

  onParenRight: function () {
    if (this.parent) {
      this.parent.select();
    }
    return false;
  },

  onLambda: function () {
    this.model.swapWith({
      term: 'abstraction',
      param: 'x',
      exp: {}
    });
    this.select().editParam();
    return false;
  },

  onSwipe: function (e) {
    if (e.gesture.touches.length === 3) {
      this.model.swapWith({
        term: 'expression'
      });
      this.select();
      return false;
    }
  }

}, {
  Variable: {
    template: _.template($('#variable-template').html())
  },

  Abstraction: {
    template: _.template($('#abstraction-template').html())
  },

  Application: {
    template: _.template($('#application-template').html())
  },

  template: _.template($('#unknown-template').html())
});
