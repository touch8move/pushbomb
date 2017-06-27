'use strict';

var events = require('events');
var logger = new events.EventEmitter();
logger.on('newEvent', function(event, data) {
    console.log(new Date(), event, data);
});
module.exports = logger;