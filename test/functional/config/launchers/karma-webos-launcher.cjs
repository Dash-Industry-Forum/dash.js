const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const {getHostIp} = require('./common.cjs');

function WebOSLauncher(baseBrowserDecorator, args, config, logger) {
    baseBrowserDecorator(this);

    const log = logger.create('launcher.webos');

    this._start = (url) => {
        log.info('Launching webOS browser with URL: ' + url);

        // Path to your web app directory
        const appDir = path.resolve(__dirname, '../../apps/webos/test-app');
        const appPackagePath = path.resolve(appDir, 'com.dashjs.app_1.0.0_all.ipk');

        // Command to package the web app
        const packageCommand = `ares-package ${appDir} -o ${appDir}`;

        exec(packageCommand, (error, stdout, stderr) => {
            if (error) {
                log.error(`Package exec error: ${error}`);
                return;
            }
            log.info(`Package stdout: ${stdout}`);
            log.info(`Package stderr: ${stderr}`);

            // Command to install the web app
            const installCommand = `ares-install ${appPackagePath}`;

            exec(installCommand, (error, stdout, stderr) => {
                if (error) {
                    log.error(`Install exec error: ${error}`);
                    return;
                }
                log.info(`Install stdout: ${stdout}`);
                log.info(`Install stderr: ${stderr}`);

                // Command to launch the web app
                const hostIp = getHostIp();
                let escapedUrl = url;
                escapedUrl = escapedUrl.replace('localhost', hostIp);
                log.info(`Target url is ${escapedUrl}`);
                const launchCommand = `ares-launch com.dashjs.app -o --params "{'url':'${escapedUrl}'}"`;

                exec(launchCommand, (error, stdout, stderr) => {
                    if (error) {
                        log.error(`Launch exec error: ${error}`);
                        return;
                    }
                    log.info(`Launch stdout: ${stdout}`);
                    log.info(`Launch stderr: ${stderr}`);
                });
            });
        });
    };
}

WebOSLauncher.$inject = ['baseBrowserDecorator', 'args', 'config', 'logger'];

module.exports = {
    'launcher:WebOS': ['type', WebOSLauncher]
};
