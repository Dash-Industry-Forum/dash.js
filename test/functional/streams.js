const intern = require('intern').default;
const fs = require('fs');

module.exports.getStreams = function () {
    // Get streams from reference sample application
    var sources = JSON.parse(fs.readFileSync('./samples/dash-if-reference-player/app/sources.json', 'utf8'));

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
    if (intern.config.streams) {
        streams = streams.filter(stream => {
            return stream.name.indexOf(intern.config.streams) !== -1;
        });
    };

    return streams;
}
