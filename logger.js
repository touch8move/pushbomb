'use strict';

var events = require('events');
var logger = new events.EventEmitter();
logger.on('log', (event, data) => {
    if (process.env.mode.toLowerCase() == 'dev') {
        console.log(new Date(), event, data);
    }
});
logger.on('warn', (event, data) => {
    console.log(new Date(), event, data);
});
logger.on('err', (event, data) => {
    console.log(new Date(), event, data);
});

module.exports = logger;