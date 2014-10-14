(function(global){
    var specHelper,
        objectsHelper,
        voHelper,
        mpdHelper;

    global.Helpers =  {
        setSpecHelper: function(value) {
            specHelper = value;
        },

        getSpecHelper: function() {
            return specHelper;
        },

        setMpdHelper: function(value) {
            mpdHelper = value;
        },

        getMpdHelper: function() {
            return mpdHelper;
        },

        setObjectsHelper: function(value) {
            objectsHelper = value;
        },

        getObjectsHelper: function() {
            return objectsHelper;
        },

        setVOHelper: function(value) {
            voHelper = value;
        },

        getVOHelper: function() {
            return voHelper;
        }
    };
}(window));