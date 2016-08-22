import Metrics from '../vo/Metrics';
import Range from '../vo/Range';
import Reporting from '../vo/Reporting';
import FactoryMaker from '../../../core/FactoryMaker';

function ManifestParsing (config) {
    let instance;
    let dashManifestModel = config.dashManifestModel;

    function getMetricsRangeStartTime(manifest, dynamic, range) {
        var mpd = dashManifestModel.getMpd(manifest);
        var periods;
        var presentationStartTime = 0;
        var reportingStartTime;

        if (dynamic) {
            // For services with MPD@type='dynamic', the start time is
            // indicated in wall clock time by adding the value of this
            // attribute to the value of the MPD@availabilityStartTime
            // attribute.
            presentationStartTime = mpd.availabilityStartTime.getTime() / 1000;
        } else {
            // For services with MPD@type='static', the start time is indicated
            // in Media Presentation time and is relative to the PeriodStart
            // time of the first Period in this MPD.
            periods = this.getRegularPeriods(manifest, mpd);

            if (periods.length) {
                presentationStartTime = periods[0].start;
            }
        }

        // When not present, DASH Metrics collection is
        // requested from the beginning of content
        // consumption.
        reportingStartTime = presentationStartTime;

        if (range && range.hasOwnProperty('starttime')) {
            reportingStartTime += range.starttime;
        }

        return reportingStartTime;
    }

    function getMetrics(manifest) {
        var metrics = [];

        if (manifest.Metrics_asArray) {
            manifest.Metrics_asArray.forEach(metric => {
                var metricEntry = new Metrics();
                var isDynamic = dashManifestModel.getIsDynamic(manifest);

                if (metric.hasOwnProperty('metrics')) {
                    metricEntry.metrics = metric.metrics;
                } else {
                    //console.log("Invalid Metrics. metrics must be set. Ignoring.");
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
                            rangeEntry.duration = dashManifestModel.getDuration(manifest);
                        }

                        rangeEntry._useWallClockTime = isDynamic;

                        metricEntry.Range.push(rangeEntry);
                    });
                }

                if (metric.Reporting_asArray) {
                    metric.Reporting_asArray.forEach(reporting => {
                        var reportingEntry = new Reporting();

                        if (reporting.hasOwnProperty('schemeIdUri')) {
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
export default FactoryMaker.getSingletonFactory(ManifestParsing);
