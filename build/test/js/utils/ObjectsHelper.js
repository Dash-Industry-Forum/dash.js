(function(global){
    var system = new dijon.System(),
        notifier,
        context,
        defaultStreamType = "video",
        objectsHelper,

        createObject = function(objName) {
            setup();
            return system.getObject(objName);
        },

        createPlayerInstance = function() {
            var context = new Dash.di.DashContext();

            return new MediaPlayer(context);
        },

        getDummyStreamProcessor = function(type) {
            type = type || defaultStreamType;

            return {
                getType: function() {
                    return type;
                },
                getCurrentTrack: function() {
                    return {};
                },
                getStreamInfo: function() {
                    return {};
                },
				getMediaInfo: function() {
					return {bitrateList:[]};
				}
            }
        },

        setup = function() {
            if (context) return;

            context = new Dash.di.DashContext();
            system.mapValue("system", system);
            system.mapOutlet("system");
            system.mapValue("eventBus", new MediaPlayer.utils.EventBus());
            system.mapOutlet("eventBus");
            var debug = new MediaPlayer.utils.Debug();
            system.mapValue("debug", debug);
            system.mapOutlet("debug");
            system.injectInto(debug);
            system.injectInto(context);
            notifier = system.getObject("notifier");

        };

    objectsHelper =  {
        getAbrController: function() {
            return createObject("abrController");
        },

        getRepresentationController: function(type) {
            var ctrl = createObject("representationController");
            ctrl.streamProcessor = getDummyStreamProcessor(type);

            return ctrl;
        },

        getLiveEdgeFinder: function(type) {
            var finder = createObject("liveEdgeFinder");
            finder.streamProcessor = getDummyStreamProcessor(type);
            return finder;
        },

        getTimelineConverter: function() {
            return createObject("timelineConverter");
        },

        getIndexHandler: function(type) {
            var handler = createObject("indexHandler");
            handler.streamProcessor = getDummyStreamProcessor(type);

            return handler;
        },

        getFragmentController: function() {
            return createObject("fragmentController");
        },

        getFragmentModel: function() {
            return createObject("fragmentModel");
        },

        getFragmentLoader: function() {
            return createObject("fragmentLoader");
        },

        getNewMediaPlayerInstance: function() {
            return createPlayerInstance();
        }
    };

    global.Helpers.setObjectsHelper(objectsHelper);
}(window));
