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
Dash.di.DashContext = function () {
    return {
        system : undefined,
        setup : function() {
            Dash.di.DashContext.prototype.setup.call(this);
            
            this.system.mapClass('parser', Dash.dependencies.DashParser);
            this.system.mapClass('indexHandler', Dash.dependencies.DashHandler);
            this.system.mapClass('baseURLExt', Dash.dependencies.BaseURLExtensions);
            this.system.mapSingleton('manifestExt', Dash.dependencies.DashManifestExtensions);
        }
    };
};

Dash.di.DashContext.prototype = new MediaPlayer.di.Context();
Dash.di.DashContext.prototype.constructor = Dash.di.DashContext;