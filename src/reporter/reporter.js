const events = require('events');
const JSON = require('circular-json');

class SummaryReporter extends events.EventEmitter {

    constructor(baseReporter, config, options = {}) {
        super();
        this.baseReporter = baseReporter;
        this.config = config;
        this.options = options;
        this.specs = {};
        this.results = {};

        this.on('runner:start', function (runner) {
            this.specs[runner.cid] = runner.specs
            this.results[runner.cid] = {
                passing: 0,
                pending: 0,
                failing: 0
            };
        });

        this.on('suite:start', function (suite) { });

        this.on('test:pending', function (test) {
            this.results[test.cid].pending++;
        });

        this.on('test:pass', function (test) {
            this.results[test.cid].passing++;
        });

        this.on('test:fail', function (test) {
            this.results[test.cid].failing++;
        });

        this.on('runner:end', function (runner) {
        });
        
        this.on('end', function (runner) {
            console.log(JSON.stringify(this.results));
            console.log('\n', JSON.stringify(this.baseReporter.stats));
        });

    }

}

module.exports = SummaryReporter;