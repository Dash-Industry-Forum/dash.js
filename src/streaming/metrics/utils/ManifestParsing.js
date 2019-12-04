import Metrics from '../vo/Metrics';
import Range from '../vo/Range';
import Reporting from '../vo/Reporting';

function ManifestParsing (config) {
    config = config || {};
    let instance;
    let adapter = config.adapter;
    const constants = config.constants;

    function getMetricsRangeStartTime(manifest, dynamic, range) {
        let voPeriods,
            reportingStartTime;
        let presentationStartTime = 0;

        if (dynamic) {
            // For services with MPD@type='dynamic', the start time is
            // indicated in wall clock time by adding the value of this
            // attribute to the value of the MPD@availabilityStartTime
            // attribute.
            presentationStartTime = adapter.getAvailabilityStartTime(manifest) / 1000;
        } else {
            // For services with MPD@type='static', the start time is indicated
            // in Media Presentation time and is relative to the PeriodStart
            // time of the first Period in this MPD.
            voPeriods = adapter.getRegularPeriods(manifest);

            if (voPeriods.length) {
                presentationStartTime = voPeriods[0].start;
            }
        }

        // When not present, DASH Metrics collection is
        // requested from the beginning of content
        // consumption.
        reportingStartTime = presentationStartTime;

        if (range && range.hasOwnProperty(constants.START_TIME)) {
            reportingStartTime += range.starttime;
        }

        return reportingStartTime;
    }

    function getMetrics(manifest) {
        let metrics = [];

        if (manifest && manifest.Metrics_asArray) {
            manifest.Metrics_asArray.forEach(metric => {
                var metricEntry = new Metrics();
                var isDynamic = adapter.getIsDynamic(manifest);

                if (metric.hasOwnProperty('metrics')) {
                    metricEntry.metrics = metric.metrics;
                } else {
                    return;
                }

                if (metric.Range_asArray) {
                    metric.Range_asArray.forEach(range => {
                        var rangeEntry = new Range();

                        rangeEntry.starttime =
                            getMetricsRangeStartTime(manifest, isDynamic, range);

                        if (range.hasOwnProperty('duration')) {
                            rangeEntry.duration = range.duration;
                        } else {
                            // if not present, the value is identical to the
                            // Media Presentation duration.
                            rangeEntry.duration = adapter.getDuration(manifest);
                        }

                        rangeEntry._useWallClockTime = isDynamic;

                        metricEntry.Range.push(rangeEntry);
                    });
                }

                if (metric.Reporting_asArray) {
                    metric.Reporting_asArray.forEach(reporting => {
                        var reportingEntry = new Reporting();

                        if (reporting.hasOwnProperty(constants.SCHEME_ID_URI)) {
                            reportingEntry.schemeIdUri = reporting.schemeIdUri;
                        } else {
                            // Invalid Reporting. schemeIdUri must be set. Ignore.
                            return;
                        }

                        for (const prop in reporting) {
                            if (reporting.hasOwnProperty(prop)) {
                                reportingEntry[prop] = reporting[prop];
                            }
                        }

                        metricEntry.Reporting.push(reportingEntry);
                    });
                } else {
                    // Invalid Metrics. At least one reporting must be present. Ignore
                    return;
                }

                metrics.push(metricEntry);
            });
        }

        return metrics;
    }

    instance = {
        getMetrics: getMetrics
    };

    return instance;
}

ManifestParsing.__dashjs_factory_name = 'ManifestParsing';
export default dashjs.FactoryMaker.getSingletonFactory(ManifestParsing); /* jshint ignore:line */