const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function WebOSLauncher(baseBrowserDecorator, args, config, logger) {
    baseBrowserDecorator(this);

    const log = logger.create('launcher.webos');

    this._start = (url) => {
        log.info('Launching webOS browser with URL: ' + url);

        // Path to your packaged web app
        const appPath = path.resolve(__dirname, '../../apps/webos/test-app/com.dashjs.app_1.0.0_all.ipk');

        // Command to install the web app
        const installCommand = `ares-install ${appPath}`;

        // Write the URL to a file or local storage that the app can read
        const urlFilePath = path.resolve(__dirname, '../../apps/webos/test-app/tmp/url.txt');
        fs.writeFileSync(urlFilePath, url);

        exec(installCommand, (error, stdout, stderr) => {
            if (error) {
                log.error(`Install exec error: ${error}`);
                return;
            }
            log.info(`Install stdout: ${stdout}`);
            log.info(`Install stderr: ${stderr}`);

            // Command to launch the web app
            //let escapedUrl = encodeURI('https://google.com/?dsi=1234');
            //let escapedUrl = 'https://www.google.com/';
            let escapedUrl = url;
            escapedUrl = escapedUrl.replace('localhost', '192.168.178.20');
            log.info(`Target url is ${escapedUrl}`);
            const launchCommand = `ares-launch com.dashjs.app --params "{'url':'${escapedUrl}'}"`;

            exec(launchCommand, (error, stdout, stderr) => {
                if (error) {
                    log.error(`Launch exec error: ${error}`);
                    return;
                }
                log.info(`Launch stdout: ${stdout}`);
                log.info(`Launch stderr: ${stderr}`);
            });
        });
    };
}

WebOSLauncher.$inject = ['baseBrowserDecorator', 'args', 'config', 'logger'];

module.exports = {
    'launcher:WebOS': ['type', WebOSLauncher]
};
