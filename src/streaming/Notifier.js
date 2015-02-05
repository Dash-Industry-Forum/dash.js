MediaPlayer.dependencies.Notifier = function () {
    "use strict";

    var OBSERVABLE_ID_PROP = "observableId",
        system,
        id = 0,

        getId = function() {
            if (!this[OBSERVABLE_ID_PROP]) {
                id += 1;
                this[OBSERVABLE_ID_PROP] = "_id_" + id;
            }

            return this[OBSERVABLE_ID_PROP];
        };

    return {
        system : undefined,

        setup: function() {
            system = this.system;
            system.mapValue('notify', this.notify);
            system.mapValue('subscribe', this.subscribe);
            system.mapValue('unsubscribe', this.unsubscribe);
        },

        notify: function (/*eventName[, args]*/) {
            var eventId = arguments[0] + getId.call(this),
                event = new MediaPlayer.vo.Event();

            event.sender =  this;
            event.type = arguments[0];
            event.data = arguments[1];
            event.error = arguments[2];
            event.timestamp = new Date().getTime();

            system.notify.call(system, eventId, event);
        },

        subscribe: function(eventName, observer, handler, oneShot) {
            if (!handler && observer[eventName]) {
                handler = observer[eventName] = observer[eventName].bind(observer);
            }

            if(!observer) throw "observer object cannot be null or undefined";

            if(!handler) throw "event handler cannot be null or undefined";

            eventName += getId.call(this);

            system.mapHandler(eventName, undefined, handler, oneShot);
        },

        unsubscribe: function(eventName, observer, handler) {
            handler = handler || observer[eventName];
            eventName += getId.call(this);

            system.unmapHandler(eventName, undefined, handler);
        }
    };
};

MediaPlayer.dependencies.Notifier.prototype = {
    constructor: MediaPlayer.dependencies.Notifier
};