define({

    local: {
        proxyUrl: 'http://127.0.0.1:3555',
        proxyPort: 3555,
        tunnel: 'NullTunnel',
        tunnelOptions: {
            hostname: '127.0.0.1',
            port: '4444',
            verbose: true
        },
        reporters: ['Runner'],
        capabilities: {
            'selenium-version': '3.4.0'
        },
        leaveRemoteOpen:'fail'
    },

    remote: {

        capabilities: {
            name: 'Tests DashJS',
            build: process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'BROWSERSTACK_LOCAL_IDENTIFIER',
            "browserstack.local": false,
            "browserstack.debug": true,
            fixSessionCapabilities: false
        },
        tunnel: 'BrowserStackTunnel',
        tunnelOptions: {
            verbose: true,
            username: process.env.BROWSERSTACK_USER || 'BROWSERSTACK_USER',
            accessKey: process.env.BROWSERSTACK_ACCESS_KEY || 'BROWSERSTACK_ACCESS_KEY'
        },
        reporters: ['Runner', {id: 'JUnit', filename: 'test/functional/test-reports/' + (new Date().getFullYear())+'-'+(new Date().getMonth()+1)+'-'+(new Date().getDate())+'_'+(new Date().getHours())+'-'+(new Date().getMinutes())+'-'+(new Date().getSeconds()) + '_report.xml'}]
    }
});