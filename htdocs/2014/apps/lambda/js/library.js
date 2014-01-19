if (typeof MultiTouch === 'undefined') MultiTouch = {};

MultiTouch.Library = Backbone.Collection.extend({
  model: MultiTouch.Expression,
  localStorage: new Backbone.LocalStorage('DevLibrary')
});

MultiTouch.LibraryView = Backbone.View.extend({
  tagName: 'ul',

  initialize: function () {
    this.listenTo(this.collection, 'add remove', this.render);

    this.views = {};

    this.appendEl = this.options.appendEl;

    this.render();
  },

  render: function () {
    var last, newVar = $('#new-var');

    if (this.appendEl) this.appendEl.detach();
    this.$el.find('*').detach();

    _.each(this.collection.models, function (expression) {
      var cid = expression.cid;
      if (this.views[cid]) {
        this.views[cid].$el.remove();
        delete this.views[cid];
      }
      this.views[cid] = new MultiTouch.LibraryItemView({
        model: expression
      });
      this.$el.append(this.views[cid].$el);
      last = this.views[cid].$el;
    }, this);

    if (this.appendEl) this.$el.append(this.appendEl);

    var top = $('#side').height() - this.$el.outerHeight();
    this.$el.css({ top: top });

    return this;
  }
});

MultiTouch.LibraryItemView = Backbone.View.extend({
  tagName: 'li',

  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

    this.$el.hammer().
      on('tap', $.proxy(this.insert, this)).
      on('swipe', $.proxy(this.destroy, this));

    this.render();
  },

  render: function () {
    this.$el.html(_.escape(this.model.get('displayName')));
    return this;
  },

  insert: function () {
    if (selectedView && selectedView.model) {
      selectedView.model.swapWith(this.model.toJSON());
      if (this.model.isVariable()) {
        recent.addVariable(this.model.get('name'));
      }
    }
    return false;
  },

  destroy: function () {
    return false;
  }
});
