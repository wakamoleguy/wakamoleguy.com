if (typeof MultiTouch === 'undefined') MultiTouch = {};

MultiTouch.Expression = Backbone.Model.extend({
  defaults: {
    term: 'expression',
    displayName: ''
  },

  initialize: function () {
    var children = {};

    if (this.has('exp') && !(this.get('exp') instanceof MultiTouch.Expression)) {
      children.exp = new MultiTouch.Expression(this.get('exp'));
    }
    if (this.has('fun') && !(this.get('fun') instanceof MultiTouch.Expression)) {
      children.fun = new MultiTouch.Expression(this.get('fun'));
    }
    if (this.has('arg') && !(this.get('arg') instanceof MultiTouch.Expression)) {
      children.arg = new MultiTouch.Expression(this.get('arg'));
    }
    this.set(children);
  },

  parse: function (json) {
    if (json.exp) json.exp = new MultiTouch.Expression(json.exp);
    if (json.fun) json.fun = new MultiTouch.Expression(json.fun);
    if (json.arg) json.arg = new MultiTouch.Expression(json.arg);
    delete json.id;

    return json;
  },

  swapWith: function (model) {
    if (model instanceof MultiTouch.Expression) model = model.toJSON();

    model = this.parse(model);

    this.clear({silent: true});
    this.set(model);

    return this;
  },

  applyTo: function (arg) {
    var fun;

    fun = this.toJSON();
    if (arg instanceof MultiTouch.Expression) arg = arg.toJSON();

    this.clear({silent: true});
    this.set({
      term: 'application',
      fun: new MultiTouch.Expression(fun),
      arg: new MultiTouch.Expression(arg)
    });

    return this;
  },

  toVariable: function (name) {
    this.clear({silent: true});
    this.set({
      term: 'variable',
      name: name
    });

    return this;
  },

  toAbstraction: function (param, exp) {
    if (exp instanceof MultiTouch.Expression) exp = exp.toJSON();

    this.clear({silent: true});
    this.set({
      term: 'abstraction',
      param: param,
      exp: new MultiTouch.Expression(exp)
    });

    return this;
  },

  toApplication: function (fun, arg) {
    if (fun instanceof MultiTouch.Expression) fun = fun.toJSON();
    if (arg instanceof MultiTouch.Expression) arg = arg.toJSON();

    this.clear({silent: true});
    this.set({
      term: 'application',
      fun: new MultiTouch.Expression(fun),
      arg: new MultiTouch.Expression(arg)
    });

    return this;
  },

  isVariable: function () {
    return this.get('term') === 'variable';
  },

  isAbstraction: function () {
    return this.get('term') === 'abstraction';
  },

  isApplication: function () {
    return this.get('term') === 'application';
  },

  toJSON: function () {
    var clone = _.clone(this.attributes);
    if (clone.exp) clone.exp = clone.exp.toJSON();
    if (clone.fun) clone.fun = clone.fun.toJSON();
    if (clone.arg) clone.arg = clone.arg.toJSON();

    return clone;
  }

}, {
  Variable: function (name) {
    return (new this()).toVariable(name);
  },

  Abstraction: function (param, exp) {
    return (new MultiTouch.Expression()).toAbstraction(param, exp);
  },

  Application: function (fun, arg) {
    return (new MultiTouch.Expression()).toApplication(fun, arg);
  }
});
