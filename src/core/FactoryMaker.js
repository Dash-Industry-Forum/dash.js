let FactoryMaker = (function() {

    var extensionDict = {},
        merge = function(name, instance){
            var extended = extensionDict[name];
            if (extended) {
                for(const prop in extended){
                    if (instance.hasOwnProperty(prop)){
                        instance[prop] = extended[prop];
                    }
                }
            }
            return instance;
        }

	return {
        extend: function(name, childInstance) {
            if (!extensionDict[name] && childInstance){
                extensionDict[name] = childInstance;
            } else if (!childInstance){
                delete extensionDict[name];
            }
        },

		getSingletonFactory: function(classConstructor) {			
			var factory = (function(){
				var instance = null;
				return {
					getInstance: function() {
						if (instance) return instance;
						instance = merge(classConstructor.name, classConstructor.apply(this, arguments));
						return instance;
					}
				}
			}());

			return factory;
		},

		getClassFactory: function(classConstructor) {
			return {
				create: function() {
					return merge(classConstructor.name, classConstructor.apply(this, arguments));
				}
			}
		}
	}
}());

export default FactoryMaker;