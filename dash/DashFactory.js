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
window["dash"] = window["dash"] || {};
/**
 * @constructor
 */
dash.DashFactory = function()
{

};

dash.DashFactory.prototype = new streaming.StreamFactory();

dash.DashFactory.prototype.getManifestParser = function ()
{
    return new dash.DashParser();
};

dash.DashFactory.prototype.getIndexHandler = function (data, duration)
{
    return new dash.DashHandler(data, duration);
};
