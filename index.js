'use strict';

var Emitter   = require('superemitter');
var raf       = require('raf');
var oop       = require('oop-utils');
var $win      = null;
var winHeight = null;
var winWidth  = null;

var handlers = {
    scroll: [],
    width: [],
    height: []
};
function setupHandlers() {
    $win = WaypointWatcher.$(window);
    winHeight = $win.height();
    winWidth  = $win.width();

    var scrollWorking = false;
    function handleScroll() {
        /* jshint boss:true, plusplus:false */
        var scroll = $win.scrollTop();

        var fns = handlers.scroll;
        var index = fns.length;
        while (index--) {
            fns[index](scroll);
        }

        scrollWorking = false;
    }
    $win.on('scroll resize', function() {
        if (scrollWorking) {
            return;
        }
        scrollWorking = true;
        raf(handleScroll);
    });

    var resizeWorking = false;
    function handleResize() {
        /* jshint boss:true, plusplus:false */
        winWidth = $win.width();
        winHeight = $win.height();

        var fns = handlers.width;
        var index = fns.length;
        while (index--) {
            fns[index](winWidth);
        }

        fns = handlers.height;
        index = fns.length;
        while (index--) {
            fns[index](winHeight);
        }

        resizeWorking = false;
    }
    $win.on('resize', function() {
        if (resizeWorking) {
            return;
        }
        resizeWorking = true;
        raf(handleResize);
    });
}

// ====

/**
 * Watch for scroll and resize events
 *
 * @constructor
 * @extends {Emitter}
 * @param {String}  type
 * @param {Element} $anchor
 * @param {Function} percent
 * @param {Boolean} bottom
 */
function WaypointWatcher(type, $anchor, percent, bottom) {
    var self = this;

    if (!$win) {
        setupHandlers();
    }

    Emitter.call(self);

    self.$         = WaypointWatcher.$;
    self.type      = type;
    self.$anchor   = $anchor;
    self._scroll   = null;
    self._value    = null;
    self.percent   = percent;
    self._state    = {};
    self._handlers = [];
    self.paused    = false;

    if ('scroll' === type) {
        var handler = null;

        if (self.$anchor) {
            if (true === bottom) {
                self._value = $win.scrollTop() + winHeight -
                    self.$anchor.offset().top;
            } else {
                self._value = $win.scrollTop() - self.$anchor.offset().top;
            }

            handler = function handler(scroll) {
                self._scroll = scroll;
                if (true === bottom) {
                    self._value = scroll + winHeight -
                        self.$anchor.offset().top;
                } else {
                    self._value = scroll - self.$anchor.offset().top;
                }
                self._trigger();
            };
        } else {
            self._value = $win.scrollTop();

            handler = function handler(scroll) {
                self._value = self._scroll = scroll;
                self._trigger();
            };
        }

        handlers.scroll.push(handler);
        if (self.percent) {
            handlers.height.push(function() {
                handler(self._scroll);
            });
        }
    } else {
        handlers[type].push(function(value) {
            self._value = value;
            self._trigger();
        });
    }

    raf(function() {
        self._trigger();
    });
}

module.exports = WaypointWatcher;
var proto = oop.inherits(WaypointWatcher, Emitter);

/**
 * Range helper
 *
 * @param {Object} opts
 * @param {Funciton} handler
 * @return {WaypointWatcher}
 */
proto.range = function range(opts, handler) {
    var self = this;

    var index = null;
    var value = self._rangeChecker(opts.min, opts.max, opts.process);
    var fn    = self._rangeHandler(value, handler);

    function addHandler() {
        if ('number' === typeof index) {
            return;
        }
        index = self._handlers.push(fn) - 1;
    }
    function removeHandler() {
        if ('number' !== typeof index) {
            return;
        }
        self._handlers.splice(index, 1);
        index = null;
    }

    var goneOverStart = false;
    var goneOverEnd = false;
    opts.startEmitter.on(opts.start, function(over) {
        if (over && !goneOverStart) {
            addHandler();
            handler('enter:down', opts.min);
            goneOverStart = true;
        } else if (goneOverStart) {
            removeHandler();
            handler('exit:up', opts.min);
            goneOverStart = false;
        }
    });
    opts.endEmitter.on(opts.end, function(over) {
        if (over && !goneOverEnd) {
            removeHandler();
            handler('exit:down', opts.max);
            goneOverEnd = true;
        } else if (goneOverEnd) {
            addHandler();
            handler('enter:up', opts.max);
            goneOverEnd = false;
        }
    });

    return self;
};

/**
 * Create handler for ranges
 *
 * @param {Function} process
 * @param {Function} handler
 * @return {Function}
 */
proto._rangeHandler = function _rangeHandler(process, handler) {
    var self     = this;
    var previous = null;
    return function() {
        var value = process(self._value);
        if (value === previous) {
            return;
        }
        previous = value;
        handler('value', previous);
    };
};

/**
 * Utility for keeping values in range
 *
 * @param {Number} min
 * @param {Number} max
 * @param {Function} process
 * @return {Function}
 */
proto._rangeChecker = function _rangeChecker(min, max, process) {
    return function(value) {
        if (process) {
            value = process(value);
        }

        if (min > value) {
            return min;
        } else if (max < value) {
            return max;
        }
        return value;
    };
};

/**
 * Trigger some events, maybe.
 *
 * @return {WaypointWatcher}
 */
proto._trigger = function _trigger() {
    if (this.paused) {
        return this;
    }

    if (this.percent) {
        this._value = (this._value / this.percent()) * 100;
    }

    var offset          = this._value;
    var state           = this._state;
    var waypoints       = this._eventKeys;
    var waypointsLength = waypoints.length;
    var waypoint        = null;
    for (var i = 0; i < waypointsLength; i += 1) {
        waypoint = +waypoints[i];

        if (offset > waypoint && true !== state[waypoint]) {
            state[waypoint] = true;
            this.emit(waypoint, true);
        } else if (offset < waypoint && false !== state[waypoint]) {
            state[waypoint] = false;
            this.emit(waypoint, false);
        }
    }

    /* jshint boss:true, plusplus:false */
    // Trigger handlers if any
    var fns = this._handlers;
    var index = fns.length;
    if (index) {
        while (index--) {
            fns[index]();
        }
    }

    return this;
};

/**
 * Resume the watcher
 *
 * @return {WaypointWatcher}
 */
proto.resume = function resume() {
    if (!this.paused) {
        return this;
    }

    this.paused = false;
    this._trigger();
    return this;
};

/**
 * Pause the watcher
 *
 * @return {WaypointWatcher}
 */
proto.pause = function pause() {
    this.paused = true;
    return this;
};
