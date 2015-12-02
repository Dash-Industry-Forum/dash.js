let FactoryMaker = (function() {

    let extensionDict = {};


    let instance = {
        extend: extend,
        getSingletonFactory:getSingletonFactory,
        getClassFactory:getClassFactory
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
        var contexts = [];

        return function(context) {
            let instance = null;

            for (let i in contexts) {
                if (contexts[i].context === context)
                {
                    instance = contexts[i].instance;
                    break;
                }
            }

            return {
                getInstance : function() {
                    if (instance) {
                        return instance;
                    }

                    instance = merge(classConstructor.name, classConstructor.apply({ context: context }, arguments));
                    contexts.push({ context : context, instance : instance });

                    return instance;
                }
            }
        }
    }

    function getClassFactory(classConstructor) {
        return function (context){
            return {
                create: function() {
                    return merge(classConstructor.name, classConstructor.apply({ context:context } ,arguments));
                }
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