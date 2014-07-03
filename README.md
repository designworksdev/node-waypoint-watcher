# waypoint-watcher

Watch for scrollTop events etc


## Usage

```js
var WW = require('waypoint-watcher');
WW.$ = jQuery; // Or zepto!

var watcher = new WW('scroll');

// 100px from top of window
watcher.on('100', function(over) {
    if (over) {
        // Gone over the waypoint
    } else {
        // Back under the waypoint
    }
});

// Use a jquery element as a anchor
var $section = $('.section-one');
var section = new WW('scroll', $section);

section.on('0', function(over) {
    // We have reached the element
});

// Percentages!
var sectionPercentage = new WW('scroll', $section, function() {
    // Uses this as the base for the percentage. I.e.
    //     percentage = offset / {base};
    return $section.offset().top;
});
sectionPercentage.on('-50', function(over) {
    if (over) {
        // Over half way to the section!
    }
});

// Ranges!
var $overlay = $('.overlay');
section.range({
    startEmitter: sectionPercentage,
    start: '-50', // Half way to the section for the start point
    endEmitter: section,
    end: '0', // End point at the section itself
    process: function(offset) {
        // Lets work with positive numbers
        offset = -offset;

        // Lets return a opacity to fade in the overlay
        // Start at 0, end at 1
        var halfway = $section.offset().top / 2; // Half way
        var fromHalfway = offset - halfway;

        var opacity = fromHalfway / halfway;
        // Round to two decimal places
        opacity = Math.round(opacity * 100) / 100;

        return opacity;
    },
    min: 0, // min value is 0 opacity
    max: 1 // max value is 1 opacity
}, function(event, value) {
    // event could be: enter:down, exit:down, enter:up, exit:up
    // or: value (when we are still within the range)
    $overlay.css('opacity', value);
});
```
