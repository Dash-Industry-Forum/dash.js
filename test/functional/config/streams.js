define([
    'intern',
    'require'
], function (intern, require) {

    var fs = require('intern/dojo/node!fs');

    // Get streams from reference sample application
    var sources = JSON.parse(fs.readFileSync('./samples/dash-if-reference-player/app/sources.json', 'utf8'));

    // Get test application protocol
    // var applicationProtocol = /^(https?|)/.exec(intern.config.testPage)[0];
    // console.log('Application protocol: ' + applicationProtocol);

    var streams = [];

    for (var i = 0; i < sources.items.length; i++) {
        var group = sources.items[i];
        var groupName = group.name;
        for (var j = 0; j < group.submenu.length; j++) {
            var stream = group.submenu[j];
            stream.name = groupName + ' / ' + stream.name;
            streams.push(stream);    
        }
    }

    // Filter streams according to application protocol (http/https)
    streams = streams.filter(stream => /^(https?|)/.exec(stream.url)[0] === intern.config.protocol)

    // Filter streams if input stream name is set
    if (intern.config.testStream) {
        streams = streams.filter(stream => {
            return stream.name.indexOf(intern.config.testStream) !== -1;
        });
    };

    // streams = streams.slice(0, 1);

    return {
        items: streams
    }
});
