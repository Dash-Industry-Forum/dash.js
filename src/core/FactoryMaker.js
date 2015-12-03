let FactoryMaker = (function() {

    let extensions = [];

    let instance = {
        extend: extend,
        getSingletonFactory:getSingletonFactory,
        getClassFactory:getClassFactory
    }

    return instance;


    function getExtensionContext(context) {
        let extensionContext;
        extensions.forEach(function(obj){
            if (obj === context) {
                extensionContext = obj;
            }
        })
        if(!extensionContext) {
            extensionContext = extensions.push(context);
        }

        return extensionContext;
    }

    function extend(name, childInstance, context) {
        let extensionContext = getExtensionContext(context)
        if (!extensionContext[name] && childInstance) {
            extensionContext[name] = childInstance;
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

                    instance = merge(classConstructor.name, classConstructor.apply({ context: context }, arguments), context);
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
                    return merge(classConstructor.name, classConstructor.apply({ context:context } ,arguments), context);
                }
            }
        }
    }

    function merge(name, instance, context) {
        let extensionContext = getExtensionContext(context)
        let extended = extensionContext[name];
        if (extended) {
            extended = extended.apply({ context:context });
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