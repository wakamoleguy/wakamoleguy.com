_.extend(Hammer.gestures, {
  Lambda: {
    name: 'lambda',
    index: 55,
    defaults: {
      lambda: true,
      lambda_min_paren_bulge: .15,
      lambda_min_lambda_dist: 20
    },
    handler: function parenGesture(ev, inst) {
      if (ev.touches.length > 1) {
        // Only one finger, please!
        return;
      }

      switch(ev.eventType) {
      case Hammer.EVENT_START:
        this.maxDeltaX = 0;
        this.minDeltaX = 0;
        break;

      case Hammer.EVENT_MOVE:
        this.maxDeltaX = Math.max(this.maxDeltaX, ev.deltaX);
        this.minDeltaX = Math.min(this.minDeltaX, ev.deltaX);
        break;

      case Hammer.EVENT_END:
        var bulgeLeft, bulgeRight, bulge, dir;

        bulgeRight = this.maxDeltaX - Math.max(0, ev.deltaX);
        bulgeLeft = this.minDeltaX - Math.min(0, ev.deltaX);

        if (bulgeRight && bulgeLeft) {
          return;
        } else if (bulgeRight) {
          dir = 'right';
          bulge = bulgeRight;
        } else {
          dir = 'left';
          bulge = -bulgeLeft;
        }

        if (bulge > inst.options.lambda_min_paren_bulge * Math.abs(ev.deltaY)) {
          // Check to see if it bulged enough to be a paren
          Hammer.gesture.current.name = this.name;
          inst.trigger('paren', ev);
          inst.trigger('paren' + dir, ev);

        } else if (ev.distance > inst.options.lambda_min_lambda_dist &&
                   ((ev.angle > -160 && ev.angle < -110) ||
                    (ev.angle > 20 && ev.angle < 70))) {
          // Up-left or down-right
          inst.trigger('lambda', ev);
        }

        break;
      }
    },
    maxDeltaX: 0,
    minDeltaX: 0
  }
});

Hammer.defaults.prevent_default = true;
Hammer.gestures.Touch.defaults.prevent_default = true;
Hammer.gestures.Drag.defaults.drag_block_horizontal = true;
Hammer.gestures.Drag.defaults.drag_block_vertical = true;
