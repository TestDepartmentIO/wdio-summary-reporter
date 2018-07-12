const events = require('events');

class SummaryReporter extends events.EventEmitter {

    constructor(baseReporter, config, options = {}) {
        super();
        this.baseReporter = baseReporter;
        this.config = config;
        this.options = options;
        console.log('#################', this.baseReporter);
    }

}

module.exports = SummaryReporter;