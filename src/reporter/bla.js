const sharp = require('sharp');
const sizeOf = require('image-size');
const wait = require('wait.for');



const screenshots = [
    '/Users/beni/lessons/wdio-summary-reporter/src/reporter/1532452642865.png',
    '/Users/beni/lessons/wdio-summary-reporter/src/reporter/1532452646025.png',
    '/Users/beni/lessons/wdio-summary-reporter/src/reporter/1532452653726.png'
];


const resize = (input, width, height, output) => {
    return sharp(input).resize(width, height).toFile(output);
};

const x = screenshots.map(path => {
    const { width, height } = sizeOf(path);
    if (width > 900 && height > 650) {
        const newFileName = path.replace('.png', '-resized.png');
        wait.launchFiber(function(){
            wait.for(resize, path, 900, 650, newFileName);
        });
        return newFileName;
    }
    return path;
});


console.log(x)