const intern = require('intern').default;
const fs = require('fs');

module.exports.getStreams = function () {
    // Get streams from reference sample application
    var sources = JSON.parse(fs.readFileSync(intern.config.source, 'utf8'));

    var streams = [];

    for (var i = 0; i < sources.items.length; i++) {
        var group = sources.items[i];
        var groupName = group.name;
        for (var j = 0; j < group.submenu.length; j++) {
            var stream = group.submenu[j];
            stream.name = groupName + ' / ' + stream.name;
            if(stream.url.substr(0,2) === '//') {
                stream.url = intern.config.protocol + ':' + stream.url;
            }
            stream.groupName = groupName;
            streams.push(stream);
        }
    }

    // Filter streams according to application protocol (http/https)
    streams = streams.filter(stream => /^(https?|)/.exec(stream.url)[0] === intern.config.protocol);

    // Filter streams if input stream name is set
    if (intern.config.streams) {
        streams = streams.filter(stream => {
            return stream.name.indexOf(intern.config.streams) !== -1;
        });
    }

    // Filter streams if groupname is set
    if (intern.config.groupname) {
        streams = streams.filter(stream => {
            return intern.config.groupname == stream.groupName;
        });
    }

    // If input manifest url is provided then use it
    if (intern.config.mpd) {
        streams = [{
            name: 'User MPD',
            url: intern.config.mpd
        }];
    }

    return streams;
};
