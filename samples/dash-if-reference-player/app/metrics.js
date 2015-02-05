MetricsTreeConverter = function () {
    "use strict";

    var bufferLevelMetricToTreeMetric = function (bufferLevelMetrics) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tMetric,
                levelMetric,
                i;

            for (i = 0; i < bufferLevelMetrics.length; i += 1) {
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
                durationMetric,
                playbackspeedMetric,
                stopreasonMetric,
                i;

            for (i = 0; i < playListTrace.length; i += 1) {
                bufferMetric = playListTrace[i];

                treeMetric = {};
                treeMetric.text = "Trace: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                representationidMetric = {};
                representationidMetric.text = "representationid: " + bufferMetric.representationid;

                subreplevelMetric = {};
                subreplevelMetric.text = "subreplevel: " + bufferMetric.subreplevel;

                startMetric = {};
                startMetric.text = "start: " + bufferMetric.start;

                durationMetric = {};
                durationMetric.text = "duration: " + bufferMetric.duration;

                playbackspeedMetric = {};
                playbackspeedMetric.text = "playbackspeed: " + bufferMetric.playbackspeed;

                stopreasonMetric = {};
                stopreasonMetric.text = "stopreason: " + bufferMetric.stopreason;

                treeMetric.items.push(representationidMetric);
                treeMetric.items.push(subreplevelMetric);
                treeMetric.items.push(startMetric);
                treeMetric.items.push(durationMetric);
                treeMetric.items.push(playbackspeedMetric);
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
                i;

            for (i = 0; i < playListMetrics.length; i += 1) {
                bufferMetric = playListMetrics[i];

                treeMetric = {};
                treeMetric.text = "PlayList: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                startMetric = {};
                startMetric.text = "start: " + bufferMetric.start;

                mstartMetric = {};
                mstartMetric.text = "mstart: " + bufferMetric.mstart;

                startTypeMetric = {};
                startTypeMetric.text = "starttype: " + bufferMetric.starttype;

                traceMetric = {};
                traceMetric.text = "trace";
                traceMetric.items = playListTraceMetricsToTreeMetrics(bufferMetric.trace);

                treeMetric.items.push(startMetric);
                treeMetric.items.push(mstartMetric);
                treeMetric.items.push(startTypeMetric);
                treeMetric.items.push(traceMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        representationSwitchToTreeMetrics = function (representationSwitch) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tMetric,
                mtMetric,
                toMetric,
                ltoMetric,
                i;

            for (i = 0; i < representationSwitch.length; i += 1) {
                bufferMetric = representationSwitch[i];

                treeMetric = {};
                treeMetric.text = "Representation Switch: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tMetric = {};
                tMetric.text = "t: " + bufferMetric.t;

                mtMetric = {};
                mtMetric.text = "mt: " + bufferMetric.mt;

                toMetric = {};
                toMetric.text = "to: " + bufferMetric.to;

                ltoMetric = {};
                ltoMetric.text = "lto: " + bufferMetric.lto;

                treeMetric.items.push(tMetric);
                treeMetric.items.push(mtMetric);
                treeMetric.items.push(toMetric);
                treeMetric.items.push(ltoMetric);

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

            for (i = 0; i < droppedFrames.length; i += 1) {
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

            for (i = 0; i < httpRequestTrace.length; i += 1) {
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

            for (i = 0; i < httpRequest.length; i += 1) {
                bufferMetric = httpRequest[i];

                treeMetric = {};
                treeMetric.text = "Http Request: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tcpidMetric = {};
                tcpidMetric.text = "tcpid: " + bufferMetric.tcpid;

                typeMetric = {};
                typeMetric.text = "type: " + bufferMetric.type;

                urlMetric = {};
                urlMetric.text = "url: " + bufferMetric.url;

                actualurlMetric = {};
                actualurlMetric.text = "actualurl: " + bufferMetric.actualurl;

                rangeMetric = {};
                rangeMetric.text = "range: " + bufferMetric.range;

                trequestMetric = {};
                trequestMetric.text = "trequest: " + bufferMetric.trequest;

                tresponseMetric = {};
                tresponseMetric.text = "tresponse: " + bufferMetric.tresponse;

                responsecodeMetric = {};
                responsecodeMetric.text = "responsecode: " + bufferMetric.responsecode;

                intervalMetric = {};
                intervalMetric.text = "interval: " + bufferMetric.interval;

                mediadurationMetric = {};
                mediadurationMetric.text = "mediaduration: " + bufferMetric.mediaduration;

                traceMetric = {};
                traceMetric.text = "trace";
                traceMetric.items = httpRequestTraceToTreeMetric(bufferMetric.trace);

                treeMetric.items.push(tcpidMetric);
                treeMetric.items.push(typeMetric);
                treeMetric.items.push(urlMetric);
                treeMetric.items.push(actualurlMetric);
                treeMetric.items.push(rangeMetric);
                treeMetric.items.push(trequestMetric);
                treeMetric.items.push(tresponseMetric);
                treeMetric.items.push(responsecodeMetric);
                treeMetric.items.push(intervalMetric);
                treeMetric.items.push(mediadurationMetric);
                treeMetric.items.push(traceMetric);

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

            for (i = 0; i < tcpConnection.length; i += 1) {
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

        toTreeViewDataSource = function (metrics) {
            var bufferTreeMetrics = bufferLevelMetricToTreeMetric(metrics.BufferLevel),
                playListMetrics = playListMetricToTreeMetric(metrics.PlayList),
                representationSwitchMetrics = representationSwitchToTreeMetrics(metrics.RepSwitchList),
                droppedFramesMetrics = droppedFramesToTreeMetrics(metrics.DroppedFrames),
                httpRequestMetrics = httpRequestToTreeMetric(metrics.HttpList),
                tcpConnectionMetrics = tcpConnectionToTreeMetric(metrics.TcpList),
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
                }
            ];

            return dataSource;
        };

    return {
        toTreeViewDataSource: toTreeViewDataSource
    };
};
