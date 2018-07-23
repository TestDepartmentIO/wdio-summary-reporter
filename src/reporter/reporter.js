const events = require('events');
const JSON = require('circular-json');

class SummaryReporter extends events.EventEmitter {

    constructor(baseReporter, config, options = {}) {
        super();
        this.baseReporter = baseReporter;
        this.config = config;
        this.options = options;

        this.on('runner:start', function (runner) {
            console.log('Runner:', JSON.stringify(runner));
        });

        this.on('suite:start', function (suite) { });

        this.on('test:pending', function (test) {
            console.log('Cid is', test.cid);
        });

        this.on('test:pass', function (test) {
            console.log(test);
        });

        this.on('runner:end', function (runner) {
        });

    }

}

module.exports = SummaryReporter;