//Initialize function
var init = function () {
    // Path to the text file where the URL is written
    let filePath = 'wgt-package/url.txt';

    tizen.filesystem.resolve(filePath, function(file) {
        file.readAsText(function(url) {
            console.log('Read URL from file:', url);
            window.location.href = url
        }, function(error) {
            console.error('Error reading URL from file:', error);
        });
    }, function(error) {
        console.error('Error resolving file path:', error);
    }, 'r');
};
// window.onload can work without <body onload="">
window.onload = init;

