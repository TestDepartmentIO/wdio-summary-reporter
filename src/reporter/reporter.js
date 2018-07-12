const events = require('events');

class SummaryReporter extends events.EventEmitter {

    constructor(baseReporter, config, options = {}) {
        super();
        this.baseReporter = baseReporter;
        this.config = config;
        this.options = options;
        

        this.on('runner:end', function (runner) {
            console.log('¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢', JSON.stringify(runner));
            console.log('\n#################', JSON.stringify(this.baseReporter));
        });

    }

}

module.exports = SummaryReporter;