let FactoryMaker = (function() {

    let extensionDict = {};

	let instance = {
		extend: extend,
		getSingletonFactory:getSingletonFactory,
		getClassFactory:getClassFactory,
	}

	return instance;

	function extend(name, childInstance) {
		if (!extensionDict[name] && childInstance){
			extensionDict[name] = childInstance;
		} else if (!childInstance){
			delete extensionDict[name];
		}
	}

	function getSingletonFactory(classConstructor) {
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
	}

	function getClassFactory(classConstructor) {
		return {
			create: function() {
				return merge(classConstructor.name, classConstructor.apply(this, arguments));
			}
		}
	}

	function merge(name, instance) {
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

}());

export default FactoryMaker;