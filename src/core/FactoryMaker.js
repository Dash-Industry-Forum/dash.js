let FactoryMaker = (function() {
	return {
		getSingletonFactory: function(classConstructor) {			
			var factory = (function(){
				var instance = null;

				return {
					getInstance: function() {
						if (instance) return instance;
	
						instance = classConstructor.apply(this, arguments);

						return instance;
					}
				}
			}());

			return factory;
		},

		getClassFactory: function(classConstructor) {
			return {
				getInstance: function() {
						return classConstructor.apply(this, arguments);
				}
			}
		}
	}
}());

export default FactoryMaker;