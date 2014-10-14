MediaPlayer.dependencies.Notifier = function () {
    "use strict";

    var system,
        id = 0,

        getId = function() {
            if (!this.id) {
                id += 1;
                this.id = "_id_" + id;
            }

            return this.id;
        },

        isEventSupported = function(eventName) {
            var event,
                events = this.eventList;

            for (event in events) {
                if (events[event] === eventName) return true;
            }

            return false;
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
            var args = [].slice.call(arguments);
            args.splice(1, 0, this);

            args[0] += getId.call(this);

            system.notify.apply(system, args);
        },

        subscribe: function(eventName, observer, handler, oneShot) {
            if (!handler && observer[eventName]) {
                handler = observer[eventName] = observer[eventName].bind(observer);
            }

            if(!isEventSupported.call(this, eventName)) throw ("object does not support given event " + eventName);

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