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
    }
});
