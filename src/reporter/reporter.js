const events = require('events');
const fs = require('fs-extra');
const base64Img = require('base64-img');


const html = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Test Screenshots</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.1/css/bulma.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #333;
        }

        .test {
            width: 90%;
            margin: 3rem auto;
        }

        .screenshots-scroll-container {
            overflow-x: scroll;
        }

        .screenshots {
            padding: 10px 5px 10px 10px;
            white-space: nowrap;
            background: #bbb;
        }

        .screenshots img {
            width: 300px;
            margin-right: 5px;
        }
    </style>
</head>

<body>
    <div class="modal">
        <div class="modal-background"></div>
        <div class="modal-content">
            <p class="image">
                <img id="show-me" src="#" alt="">
            </p>
        </div>
        <button class="modal-close is-large" aria-label="close"></button>
    </div>
    {{result-summary}}
    <div class="container>
        <div class="tests">
            {{content}}
        </div>
    </div>
    <script type="text/javascript">
        var imgs = document.querySelectorAll('.screenshot-img');
        var modalEl = document.querySelector('.modal');
        var modalImgEl = document.querySelector('#show-me');

        // Register onClick listeners on thumbnails
        for (let i = 0; i < imgs.length; i++) {
            imgs[i].addEventListener('click', function updateModal(event) {
                modalImgEl.setAttribute('src', event.target.src);
                modalEl.classList.add('is-active');
            });
        }

        // Register onClick listener on the modal
        modalEl.addEventListener('click', function hideModal(event) {
            var isActive = modalEl.classList.contains('is-active');
            if (isActive) {
                modalEl.classList.remove('is-active');
            }
        });
    </script>
</body>

</html>
`

const resultSummaryTemplate = `
<section class="section has-background-light">
    <div class="container">
        <div class="columns has-text-centered">
            <div class="column">
                <div class="notification">
                    <h1 class=" title is-size-10">Total</h1>
                    <h1 class=" title is-size-8">{{total}}</h1>
                </div>
            </div>
            <div class="column">
                <div class="notification is-primary">
                    <h1 class=" title is-size-10">Passed</h1>
                    <h1 class=" title is-size-8">{{passed}}</h1>
                </div>
            </div>
            <div class="column">
                <div class="notification is-danger">
                    <h1 class=" title is-size-10">Failed</h1>
                    <h1 class=" title is-size-8">{{failed}}</h1>
                </div>
            </div>
            <div class="column">
                <div class="notification is-warning">
                    <h1 class=" title is-size-10">Skipped</h1>
                    <h1 class=" title is-size-8">{{skipped}}</h1>
                </div>
            </div>
        </div>
    </div>
</section>
`

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

        this.on('runner:screenshot', function (runner) {
            const cid = runner.cid;
            const stats = this.baseReporter.stats;
            const results = stats.runners[cid];
            const specHash = stats.getSpecHash(runner);
            const spec = results.specs[specHash];
            const lastKey = Object.keys(spec.suites)[Object.keys(spec.suites).length - 1];
            const currentTestKey = Object.keys(spec.suites[lastKey].tests)[Object.keys(spec.suites[lastKey].tests).length - 1];
            spec.suites[lastKey].tests[currentTestKey].screenshots.push(runner.filename);
        });

        this.on('runner:end', function (runner) {
        });

        this.on('end', function (runner) {
            let screenshotsCode = '';
            const runners = Object.keys(this.baseReporter.stats.runners);
            let total = 0, passed = 0, failed = 0, skipped = 0;
            // runners
            for (let cid of runners) {
                passed += this.results[cid].passing;
                failed += this.results[cid].failing;
                skipped += this.results[cid].pending;
                total = passed  + failed + skipped;
                let runnerInfo = this.baseReporter.stats.runners[cid];
                // specs
                for (let specId of Object.keys(runnerInfo.specs)) {
                    let specInfo = runnerInfo.specs[specId];
                    screenshotsCode += `<div class="box"><h4 class="title is-4">Spec: ${specInfo.files[0]}</h4>`;
                    // suites
                    for (let suiteName of Object.keys(specInfo.suites)) {
                        var suiteInfo = specInfo.suites[suiteName];
                        if (!suiteInfo.uid.includes('before all')
                            && !suiteInfo.uid.includes('after all')
                            && Object.keys(suiteInfo.tests).length > 0) {
                            screenshotsCode += `<div class="box"><h4 class="subtitle is-4">${suiteInfo.title}</h4>`;    
                            for (let testId of Object.keys(suiteInfo.tests)) {
                                const div1Opening = '<div class="test">';
                                const divClosing = '</div>';
                                const h1 = `<p class="subtitle is-5">${suiteInfo.tests[testId].title}</p>`
                                const div2Opening = '<div class="screenshots">';
                                const div3Opening = '<div class="screenshots-scroll-container">';

                                const imagesHtml = suiteInfo.tests[testId].screenshots.reduce((accumulator, currentValue) => {
                                    var data = base64Img.base64Sync(currentValue);
                                    return `${accumulator}<img class="screenshot-img" src="${data}" />`
                                }, '');
                                screenshotsCode += div1Opening + h1 + div2Opening + div3Opening + imagesHtml + divClosing.repeat(3);
                            }
                            screenshotsCode += '</div>';
                        }
                    }
                    screenshotsCode += '</div>';
                }
            }
            const resultSummaryHtml = resultSummaryTemplate
                                            .replace('{{total}}', total)
                                            .replace('{{passed}}', passed)
                                            .replace('{{failed}}', failed)
                                            .replace('{{skipped}}', skipped);
                                            
            const finalHtml = html.replace('{{result-summary}}', resultSummaryHtml).replace('{{content}}', screenshotsCode);

            const fileName = 'summary-report.html';

            if (this.config.reporterOptions
                && this.config.reporterOptions.summaryReporter
                && this.config.reporterOptions.summaryReporter.outputDir) {

                if (fs.pathExistsSync(this.config.reporterOptions.summaryReporter.outputDir)) {
                    fs.outputFileSync(`${this.config.reporterOptions.summaryReporter.outputDir}/${fileName}`, finalHtml);
                    return;
                }
            }
            fs.outputFileSync(`./${fileName}`, finalHtml);
        });
    }
}

module.exports = SummaryReporter;