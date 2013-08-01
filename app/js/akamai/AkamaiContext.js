Dash.di.AkamaiContext = function () {
    "use strict";

    return {
        system : undefined,
        setup : function () {
            Dash.di.AkamaiContext.prototype.setup.call(this);
            this.system.mapSingleton('bufferExt', MediaPlayer.dependencies.AkamaiBufferExtensions);

        }
    };
};

Dash.di.AkamaiContext.prototype = new Dash.di.DashContext();
Dash.di.AkamaiContext.prototype.constructor = Dash.di.AkamaiContext;