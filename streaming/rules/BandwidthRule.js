/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * copyright Digital Primates 2012
 */
window["streaming"] = window["streaming"] || {};
streaming.rules = streaming.rules || {};

/**
 *
 * @constructor
 */
streaming.rules.BandwidthRule = function ()
{
    this.test = -1;
};

streaming.rules.BandwidthRule.prototype = new streaming.rules.BaseRule();

/**
 * @public
 */
streaming.rules.BandwidthRule.prototype.checkIndex = function (metrics, items)
{
    if (!metrics)
        return -1;

    var newIdx = -1;
    var downloadRatio = metrics.lastFragmentDuration / metrics.lastFragmentDownloadTime;
    var switchRatio;

    console.log("Check bandwidth rule.");
    console.log("Download ratio: " + downloadRatio);

    if (isNaN(downloadRatio))
    {
        return -1;
    }
    else if (downloadRatio < 1.0)
    {
        if (metrics.bitrateIndex > 0)
        {
            switchRatio = metrics.getBitrateForIndex(metrics.bitrateIndex - 1) / metrics.getBitrateForIndex(metrics.bitrateIndex);
            if (downloadRatio < switchRatio)
            {
                newIdx = 0;
            }
            else
            {
                newIdx = metrics.bitrateIndex - 1;
            }
        }
    }
    else
    {
        if (metrics.bitrateIndex < metrics.maxBitrateIndex) {
            switchRatio = metrics.getBitrateForIndex(metrics.bitrateIndex + 1) / metrics.getBitrateForIndex(metrics.bitrateIndex);
            if (downloadRatio >= switchRatio)
            {
                if (downloadRatio > 1000.0)
                {
                    newIdx = metrics.maxBitrateIndex - 1;
                }
                else if (downloadRatio > 100.0)
                {
                    newIdx = metrics.bitrateIndex + 1;
                }
                else
                {
                    while (newIdx++ < metrics.maxBitrateIndex + 1)
                    {
                        switchRatio = metrics.getBitrateForIndex(newIdx) / metrics.getBitrateForIndex(metrics.bitrateIndex);
                        if (downloadRatio < switchRatio)
                        {
                            break;
                        }
                    }
                    newIdx--;
                }
            }
        }
    }

    console.log("Proposed index: " + newIdx);
    return newIdx;
};