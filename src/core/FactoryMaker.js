let FactoryMaker = (function() {

    let extensions = [];
    let singletonContexts = [];

    let instance = {
        extend: extend,
        getSingletonInstance:getSingletonInstance,
        getSingletonFactory:getSingletonFactory,
        getClassFactory:getClassFactory
    }

    return instance;

    function extend(name, childInstance, context) {
        let extensionContext = getExtensionContext(context)
        if (!extensionContext[name] && childInstance) {
            extensionContext[name] = childInstance;
        }
    }

    function getSingletonInstance(context, className) {
        let instance = null;
        singletonContexts.forEach(function(obj) {
            if (obj.context === context && obj.name === className) {
                instance = obj.instance;
            }
        })
        return instance;
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

    function getSingletonFactory(classConstructor) {
        let contexts = [];
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
                    contexts.push({ name:classConstructor.name, context : context, instance : instance });
                    singletonContexts = singletonContexts.concat(contexts);

                    return instance;
                }
            }
        }
    }

    function merge(name, classConstructor, context) {
        let extensionContext = getExtensionContext(context)
        let extended = extensionContext[name];
        if (extended) {
            extended = extended.apply({ context:context, factory:instance});
            for(const prop in extended){
                if (classConstructor.hasOwnProperty(prop)){
                    classConstructor[prop] = extended[prop];
                }
            }
        }
        return classConstructor;
    }

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

}());

export default FactoryMaker;