const events = require('events');
const JSON = require('circular-json');
const fs = require('fs-extra');
const base64Img = require('base64-img');
const sharp = require('sharp');
const sizeOf = require('image-size');
const wait = require('wait.for');


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

        h2 {
            font-size: 1.5rem;
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
    <div class="tests">
        --content--
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
            for (let cid of runners) {
                let runnerInfo = this.baseReporter.stats.runners[cid];
                for (let specId of Object.keys(runnerInfo.specs)) {
                    let specInfo = runnerInfo.specs[specId];
                    for (let suiteName of Object.keys(specInfo.suites)) {
                        var suiteInfo = specInfo.suites[suiteName];
                        if (!suiteInfo.uid.includes('before all')
                            && !suiteInfo.uid.includes('after all')
                            && Object.keys(suiteInfo.tests).length > 0) {
                            for (let testId of Object.keys(suiteInfo.tests)) {
                                const div1Opening = '<div class="test">';
                                const divClosing = '</div>';
                                const h2 = `<h2>${suiteInfo.tests[testId].title}</h2>`
                                const div2Opening = '<div class="screenshots">';
                                const div3Opening = '<div class="screenshots-scroll-container">';

                                const newPathsOfScreenshots = suiteInfo.tests[testId].screenshots.map(path => {
                                    const { width, height } = sizeOf(path);
                                    if (width > 900 && height > 650) {
                                        const newFileName = path.replace('.png', '-resized.png');
                                        wait.launchFiber(function(){
                                            wait.for(this.resizeImage, path, 900, 650, newFileName);
                                        });
                                        return newFileName;
                                    }
                                    return path;
                                });
                                    
                                const imagesHtml = newPathsOfScreenshots.reduce((accumulator, currentValue) => {
                                    var data = base64Img.base64Sync(currentValue);
                                    return `${accumulator}<img class="screenshot-img" src="${data}" />`
                                }, '');
                                screenshotsCode += div1Opening + h2 + div2Opening + div3Opening + imagesHtml + divClosing.repeat(3);
                            }
                        }
                    }
                }
            }
            const finalHtml = html.replace('--content--', screenshotsCode);
            fs.writeFileSync('./summaryreport.html', finalHtml);
        });
    }

    resizeImage(input, width, height, output) {
        return sharp(input).resize(width, height).toFile(output);
    }
}

module.exports = SummaryReporter;