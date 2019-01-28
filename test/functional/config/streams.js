define(function (require) {

    var fs = require('intern/dojo/node!fs');
    var sources = JSON.parse(fs.readFileSync('./samples/dash-if-reference-player/app/sources.json', 'utf8'));

    var streams = [];

    for (var i = 0; i < sources.items.length; i++) {
        var group = sources.items[i];
        var groupName = group.name;
        for (var j = 0; j < group.submenu.length; j++) {
            var stream = group.submenu[j];
            stream.name = groupName + ' / ' + stream.name;
            if (stream.url.toLowerCase().endsWith('/manifest')) {
                stream.mss = true;
            }
            streams.push(stream);
        }
    }

    streams = streams.slice(0, 1);

    return {
        items: streams
    }
});
