'use strict';

var $        = require('jquery');
var Emitter  = require('superemitter');

var $win     = $(window);
var handlers = {
    scroll: [],
    resize: []
};

$win.on('scroll', function() {
    var scroll = $win.scrollTop();

    var fns = handlers.scroll;
    var fnsLength = fns.length;
    var fn = null;
    for (var i = 0; i < fnsLength; i += 1) {
        fn = fns[i];
        fn(scroll);
    }
});
$win.on('resize', function() {
    var width = $win.width();
    var height = $win.height();

    var fns = handlers.resize;
    var fnsLength = fns.length;
    var fn = null;
    for (var i = 0; i < fnsLength; i += 1) {
        fn = fns[i];
        fn(width, height);
    }
});

// ====

/**
 * Watch for scroll and resize events
 *
 * @constructor
 * @extends {Emitter}
 * @param {String}  type
 * @param {Element} $anchor
 */
function WaypointWatcher(type, $anchor) {
    var self = this;

    self.$anchor = $anchor;
    self._offset = null;
    self._width  = null;
    self._height = null;

    self.scroll = null;
    self.width  = null;
    self.height = null;

    self._state = {
        scroll: {},
        width: {},
        height: {}
    };

    if ('scroll' === type) {
        self.scroll = new Emitter();

        if (self.$anchor) {
            self._offset = self.$anchor.offset().top - $win.scrollTop();

            handlers.scroll.push(function(scroll) {
                self._offset = self.$anchor.offset().top - scroll;
                self._onScroll();
            });
        } else {
            self._offset = $win.scrollTop();

            handlers.scroll.push(function(scroll) {
                self._offset = scroll;
                self._onScroll();
            });
        }

        setTimeout(function() {
            self._onScroll();
        }, 0);
    } else if ('resize' === type) {
        self.width   = new Emitter();
        self.height  = new Emitter();

        self._width  = $win.width();
        self._height = $win.height();

        handlers.resize.push(function(width, height) {
            self._width  = width;
            self._height = height;
            self._onResize();
        });

        setTimeout(function() {
            self._onResize();
        }, 0);
    }
}

module.exports = WaypointWatcher;
var proto = WaypointWatcher.prototype;

/**
 * On scroll
 *
 * @return {WaypointWatcher}
 */
proto._onScroll = function _onScroll() {
    return this._trigger(
        this.scroll,
        this._offset,
        this._state.scroll
    );
};

/**
 * Trigger some events, maybe.
 *
 * @param {Emitter} emitter
 * @param {Number}  offset
 * @param {Object}  state
 * @return {WaypointWatcher}
 */
proto._trigger = function _trigger(emitter, offset, state) {
    var waypoints       = emitter._eventKeys;
    var waypointsLength = waypoints.length;
    var waypoint        = null;
    for (var i = 0; i < waypointsLength; i += 1) {
        waypoint = +waypoints[i];

        if (offset > waypoint && true !== state[waypoint]) {
            state[waypoint] = true;
            emitter.emit(waypoint, true);
        } else if (offset < waypoint && false !== state[waypoint]) {
            state[waypoint] = false;
            emitter.emit(waypoint, false);
        }
    }

    return this;
};

/**
 * On resize
 *
 * @return {WaypointWatcher}
 */
proto._onResize = function _onResize() {
    this._trigger(
        this.width,
        this._width,
        this._state.width
    );
    this._trigger(
        this.height,
        this._height,
        this._state.height
    );

    return this;
};
