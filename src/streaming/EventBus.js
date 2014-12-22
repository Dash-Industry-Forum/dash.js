MediaPlayer.utils.EventBus = function () {
    "use strict";

    var registrations,

        getListeners = function (type, useCapture) {
            var captype = (useCapture? '1' : '0') + type;

            if (!(captype in registrations)) {
                registrations[captype]= [];
            }

            return registrations[captype];
        },

        init = function () {
            registrations = {};
        };

    init();

    return {
        addEventListener: function (type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx = listeners.indexOf(listener);
            if (idx === -1) {
                listeners.push(listener);
            }
        },

        removeEventListener: function (type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx= listeners.indexOf(listener);
            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        },

        dispatchEvent: function (evt) {
            var listeners = getListeners(evt.type, false).slice();
            for (var i= 0; i < listeners.length; i++) {
                listeners[i].call(this, evt);
            }
            return !evt.defaultPrevented;
        }
    };
};
