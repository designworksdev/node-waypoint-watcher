# waypoint-watcher

Watch for scrollTop events etc


## Usage

    var WW = require('waypoint-watcher');

    var watcher = new WW('scroll');

    // 100px
    watcher.scroll.on('100', function(over) {
        if (over) {
            // Gone over the waypoint
        } else {
            // Back under the waypoint
        }
    });

