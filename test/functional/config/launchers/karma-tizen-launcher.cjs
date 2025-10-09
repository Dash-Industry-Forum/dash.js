const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getHostIp } = require('./common.cjs');

function TizenLauncher(baseBrowserDecorator, args, config, logger) {
    baseBrowserDecorator(this);

    const log = logger.create('launcher.tizen');
    const binaryPath = args.binaryPath;
    const deviceId = args.deviceId;
    const sign = args.sign;

    this._start = (url) => {
        log.info('Launching Tizen browser with URL: ' + url);

        // Path to your packaged Tizen web app
        const appPath = path.resolve(__dirname, '../../apps/tizen/');

        // Path to the text file where URL will be written
        const urlFilePath = path.resolve(__dirname, '../../apps/tizen/url.txt');

        // Write the URL to the text file
        const hostIp = getHostIp();
        let escapedUrl = url;
        escapedUrl = escapedUrl.replace('localhost', hostIp);
        fs.writeFileSync(urlFilePath, escapedUrl, 'utf8');
        log.info(`URL written to file: ${urlFilePath}`);

        // Command to package the Tizen web app
        const packageCommand = `${binaryPath} package -t wgt -s ${sign} -o ${appPath} -- ${appPath}`;
        log.info(`Running package command ${packageCommand}`);
        exec(packageCommand, (error, stdout, stderr) => {
            if (error) {
                log.error(`Package exec error: ${error}`);
                return;
            }
            log.info(`Package stdout: ${stdout}`);
            log.info(`Package stderr: ${stderr}`);

            // Command to install the Tizen web app
            const installCommand = `${binaryPath} install -n ${appPath + '/dashjs.wgt'} -t ${deviceId}`;

            exec(installCommand, (error, stdout, stderr) => {
                if (error) {
                    log.error(`Install exec error: ${error}`);
                    return;
                }
                log.info(`Install stdout: ${stdout}`);
                log.info(`Install stderr: ${stderr}`);

                // Extract the package ID from stdout
                const packageIdMatch = stdout.match(/Installed the package: Id\(([^)]+)\)/);
                if (packageIdMatch && packageIdMatch[1]) {
                    const packageId = packageIdMatch[1];
                    log.info(`Extracted package ID: ${packageId}`);

                    // Command to launch the Tizen web app
                    const launchCommand = `${binaryPath} run -p ${packageId} -t ${deviceId}`;

                    log.info(`Executing launch command: ${launchCommand}`);

                    exec(launchCommand, (error, stdout, stderr) => {
                        if (error) {
                            log.error(`Launch exec error: ${error}`);
                            log.error(`Command: ${launchCommand}`);
                            log.error(`stderr: ${stderr}`);
                            return;
                        }
                        log.info(`Launch stdout: ${stdout}`);
                        log.info(`Launch stderr: ${stderr}`);
                    });
                } else {
                    log.error('Package ID not found in install output.');
                }
            });
        });
    };
}

TizenLauncher.$inject = ['baseBrowserDecorator', 'args', 'config', 'logger'];

module.exports = {
    'launcher:Tizen': ['type', TizenLauncher]
};
