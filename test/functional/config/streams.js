define([
    'intern',
    'require',
    './sources'
], function (intern, require, sources) {

    var standardSourcePath = './samples/dash-if-reference-player/app/sources.json';
    var fs = require('intern/dojo/node!fs');

    // Get streams from reference sample application
    var sourcePath = intern.args.source ? sources[intern.args.source] : standardSourcePath;
    var source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    var streams = [];

    for (var i = 0; i < source.items.length; i++) {
        var group = source.items[i];
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
    }


    return {
        items: streams
    };
});
