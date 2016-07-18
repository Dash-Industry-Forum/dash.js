MetricsTreeConverter = function () {
    "use strict";

    var bufferLevelMetricToTreeMetric = function (bufferLevelMetrics) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tMetric,
                levelMetric,
                i;

            for (i = 0; i < bufferLevelMetrics.length; i++) {
                bufferMetric = bufferLevelMetrics[i];

                treeMetric = {};
                treeMetric.text = "Buffer: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tMetric = {};
                tMetric.text = "t: " + bufferMetric.t;

                levelMetric = {};
                levelMetric.text = "level: " + bufferMetric.level;

                treeMetric.items.push(tMetric);
                treeMetric.items.push(levelMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        playListTraceMetricsToTreeMetrics = function (playListTrace) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                representationidMetric,
                subreplevelMetric,
                startMetric,
                mstartMetric,
                durationMetric,
                playbackspeedMetric,
                stopreasonMetric,
                i;

            for (i = 0; i < playListTrace.length; i++) {
                bufferMetric = playListTrace[i];

                treeMetric = {};
                treeMetric.text = "Trace: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                representationidMetric = {};
                representationidMetric.text = "representationid: " + bufferMetric.representationid;
                treeMetric.items.push(representationidMetric);

                if (bufferMetric.subreplevel) {
                    subreplevelMetric = {};
                    subreplevelMetric.text = "subreplevel: " + bufferMetric.subreplevel;
                    treeMetric.items.push(subreplevelMetric);
                }

                startMetric = {};
                startMetric.text = "start: " + bufferMetric.start;
                treeMetric.items.push(startMetric);

                mstartMetric = {};
                mstartMetric.text = "mstart: " + (bufferMetric.mstart / 1000);
                treeMetric.items.push(mstartMetric);

                durationMetric = {};
                durationMetric.text = "duration: " + bufferMetric.duration;
                treeMetric.items.push(durationMetric);

                playbackspeedMetric = {};
                playbackspeedMetric.text = "playbackspeed: " + bufferMetric.playbackspeed;
                treeMetric.items.push(playbackspeedMetric);

                stopreasonMetric = {};
                stopreasonMetric.text = "stopreason: " + bufferMetric.stopreason;

                treeMetric.items.push(stopreasonMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        playListMetricToTreeMetric = function (playListMetrics) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                startMetric,
                mstartMetric,
                startTypeMetric,
                traceMetric,
                traceMetrics,
                i;

            for (i = 0; i < playListMetrics.length; i++) {
                bufferMetric = playListMetrics[i];

                treeMetric = {};
                treeMetric.text = "PlayList: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                startMetric = {};
                startMetric.text = "start: " + bufferMetric.start;
                treeMetric.items.push(startMetric);

                mstartMetric = {};
                mstartMetric.text = "mstart: " + bufferMetric.mstart;
                treeMetric.items.push(mstartMetric);

                startTypeMetric = {};
                startTypeMetric.text = "starttype: " + bufferMetric.starttype;
                treeMetric.items.push(startTypeMetric);

                traceMetrics = playListTraceMetricsToTreeMetrics(bufferMetric.trace);
                if (traceMetrics) {
                    traceMetric = {};
                    traceMetric.text = "trace";
                    traceMetric.items = traceMetrics;
                }

                if (traceMetric.items.length) {
                    treeMetric.items.push(traceMetric);
                }

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        representationSwitchToTreeMetrics = function (representationSwitch) {
            var treeMetrics = [],
                treeMetric,
                switchMetric,
                tMetric,
                mtMetric,
                toMetric,
                ltoMetric,
                i;

            for (i = 0; i < representationSwitch.length; i += 1) {
                switchMetric = representationSwitch[i];

                treeMetric = {};
                treeMetric.text = "Representation Switch: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tMetric = {};
                tMetric.text = "t: " + switchMetric.t;
                treeMetric.items.push(tMetric);

                mtMetric = {};
                mtMetric.text = "mt: " + (switchMetric.mt / 1000);
                treeMetric.items.push(mtMetric);

                toMetric = {};
                toMetric.text = "to: " + switchMetric.to;
                treeMetric.items.push(toMetric);

                if (switchMetric.lto) {
                    ltoMetric = {};
                    ltoMetric.text = "lto: " + switchMetric.lto;
                    treeMetric.items.push(ltoMetric);
                }

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        droppedFramesToTreeMetrics = function (droppedFrames) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                timeMetric,
                droppedFramesMetric,
                i;

            for (i = 0; i < droppedFrames.length; i++) {
                bufferMetric = droppedFrames[i];

                treeMetric = {};
                treeMetric.text = "DroppedFrame: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                timeMetric = {};
                timeMetric.text = "time: " + bufferMetric.time;

                droppedFramesMetric = {};
                droppedFramesMetric.text = "droppedFrames: " + bufferMetric.droppedFrames;

                treeMetric.items.push(timeMetric);
                treeMetric.items.push(droppedFramesMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        httpRequestTraceToTreeMetric = function (httpRequestTrace) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                sMetric,
                dMetric,
                bMetric,
                i;

            for (i = 0; i < httpRequestTrace.length; i++) {
                bufferMetric = httpRequestTrace[i];

                treeMetric = {};
                treeMetric.text = "Trace: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                sMetric = {};
                sMetric.text = "s: " + bufferMetric.s;

                dMetric = {};
                dMetric.text = "d: " + bufferMetric.d;

                bMetric = {};
                bMetric.text = "b: " + bufferMetric.b.toString();

                treeMetric.items.push(sMetric);
                treeMetric.items.push(dMetric);
                treeMetric.items.push(bMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        httpRequestToTreeMetric = function (httpRequest) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tcpidMetric,
                typeMetric,
                urlMetric,
                actualurlMetric,
                rangeMetric,
                trequestMetric,
                tresponseMetric,
                responsecodeMetric,
                intervalMetric,
                mediadurationMetric,
                traceMetric,
                i;

            for (i = 0; i < httpRequest.length; i++) {
                bufferMetric = httpRequest[i];

                treeMetric = {};
                treeMetric.text = "Http Request: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tcpidMetric = {};
                tcpidMetric.text = "tcpid: " + bufferMetric.tcpid;
                treeMetric.items.push(tcpidMetric);

                typeMetric = {};
                typeMetric.text = "type: " + bufferMetric.type;
                treeMetric.items.push(typeMetric);

                urlMetric = {};
                urlMetric.text = "url: " + bufferMetric.url;
                treeMetric.items.push(urlMetric);

                actualurlMetric = {};
                actualurlMetric.text = "actualurl: " + bufferMetric.actualurl;
                treeMetric.items.push(actualurlMetric);

                rangeMetric = {};
                rangeMetric.text = "range: " + bufferMetric.range;
                treeMetric.items.push(rangeMetric);

                trequestMetric = {};
                trequestMetric.text = "trequest: " + bufferMetric.trequest;
                treeMetric.items.push(trequestMetric);

                tresponseMetric = {};
                tresponseMetric.text = "tresponse: " + bufferMetric.tresponse;
                treeMetric.items.push(tresponseMetric);

                responsecodeMetric = {};
                responsecodeMetric.text = "responsecode: " + bufferMetric.responsecode;
                treeMetric.items.push(responsecodeMetric);

                if (bufferMetric.interval) {
                    intervalMetric = {};
                    intervalMetric.text = "interval: " + bufferMetric.interval;
                    treeMetric.items.push(intervalMetric);
                }

                mediadurationMetric = {};
                mediadurationMetric.text = "mediaduration: " + bufferMetric._mediaduration;
                treeMetric.items.push(mediadurationMetric);

                if (bufferMetric.trace) {
                    traceMetric = {};
                    traceMetric.text = "trace";
                    traceMetric.items = httpRequestTraceToTreeMetric(bufferMetric.trace);
                    treeMetric.items.push(traceMetric);
                }

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        tcpConnectionToTreeMetric = function (tcpConnection) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tcpidMetric,
                destMetric,
                topenMetric,
                tcloseMetric,
                tconnectMetric,
                i;

            for (i = 0; i < tcpConnection.length; i++) {
                bufferMetric = tcpConnection[i];

                treeMetric = {};
                treeMetric.text = "TCP Connection: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tcpidMetric = {};
                tcpidMetric.text = "tcpid: " + bufferMetric.tcpid;

                destMetric = {};
                destMetric.text = "dest: " + bufferMetric.dest;

                topenMetric = {};
                topenMetric.text = "topen: " + bufferMetric.topen;

                tcloseMetric = {};
                tcloseMetric.text = "tclose: " + bufferMetric.tclose;

                tconnectMetric = {};
                tconnectMetric.text = "tconnect: " + bufferMetric.tconnect;

                treeMetric.items.push(tcpidMetric);
                treeMetric.items.push(destMetric);
                treeMetric.items.push(topenMetric);
                treeMetric.items.push(tcloseMetric);
                treeMetric.items.push(tconnectMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        dvbErrorsToTreeMetric = function (dvbErrors) {
            var treeMetrics = [];

            dvbErrors.forEach(function (error, i) {
                var treeMetric = {};

                treeMetric.text = 'DVBErrors: ' + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                Object.keys(error).forEach(function (key) {
                    var text = key + ': ' + error[key];
                    treeMetric.items.push({text: text});
                });


                treeMetrics.push(treeMetric);
            });

            return treeMetrics;
        },

        toTreeViewDataSource = function (metrics) {
            var bufferTreeMetrics = bufferLevelMetricToTreeMetric(metrics.BufferLevel),
                playListMetrics = playListMetricToTreeMetric(metrics.PlayList),
                representationSwitchMetrics = representationSwitchToTreeMetrics(metrics.RepSwitchList),
                droppedFramesMetrics = droppedFramesToTreeMetrics(metrics.DroppedFrames),
                httpRequestMetrics = httpRequestToTreeMetric(metrics.HttpList),
                tcpConnectionMetrics = tcpConnectionToTreeMetric(metrics.TcpList),
                dvbErrorsMetrics = dvbErrorsToTreeMetric(metrics.DVBErrors),
                dataSource;

            dataSource = [
                {
                    text: "Buffer Level",
                    items: bufferTreeMetrics,
                    collapsed: true
                },
                {
                    text: "Representation Switch",
                    items: representationSwitchMetrics,
                    collapsed: true
                },
                {
                    text: "Dropped Frames",
                    items: droppedFramesMetrics,
                    collapsed: true
                },
                {
                    text: "Play List",
                    items: playListMetrics,
                    collapsed: true
                },
                {
                    text: "HTTP Request",
                    items: httpRequestMetrics,
                    collapsed: true
                },
                {
                    text: "TCP Connection",
                    items: tcpConnectionMetrics,
                    collapsed: true
                },
                {
                    text: 'DVBErrors',
                    items: dvbErrorsMetrics,
                    collapsed: true
                }
            ];

            return dataSource;
        };

    return {
        toTreeViewDataSource: toTreeViewDataSource
    };
};
