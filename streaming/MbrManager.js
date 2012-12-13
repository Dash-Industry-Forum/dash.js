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
/**
 *
 * @constructor
 */
streaming.MbrManager = function()
{
    this.rules = null;
};

streaming.MbrManager.prototype =
{
    createRules: function()
    {
        var a = new Array();

        a.push(new streaming.rules.BandwidthRule());

        return a;
    },

    init: function()
    {
        this.rules = this.createRules();
    },
    
    checkRules: function(metrics, items)
    {
        var idx = 999;
        
        for (var i = 0; i < this.rules.length; i++)
        {
            var r = this.rules[i];
            var newIdx = r.checkIndex(metrics, items);
            if (newIdx != -1)
            {
                idx = Math.min(idx, newIdx);
            }
        }

        if (idx == 999)
            idx = metrics.bitrateIndex;

        return idx;
    }
};