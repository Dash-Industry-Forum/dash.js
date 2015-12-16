let FactoryMaker = (function() {

    let extensions = [];
    let singletonContexts = [];

    let instance = {
        extend: extend,
        getSingletonInstance:getSingletonInstance,
        setSingletonInstance:setSingletonInstance,
        getSingletonFactory:getSingletonFactory,
        getClassFactory:getClassFactory
    }

    return instance;

    function extend(name, childInstance, context) {
        let extensionContext = getExtensionContext(context);

        if (!extensionContext[name] && childInstance) {
            extensionContext[name] = childInstance;
        }
    }

    function getSingletonInstance(context, className) {
        for (let i in singletonContexts) {
            const obj = singletonContexts[i];
            if (obj.context === context && obj.name === className) {
                return  obj.instance;
            }
        }

        return null;
    }

    function setSingletonInstance(context, className, instance) {
        for (let i in singletonContexts) {
            const obj = singletonContexts[i];
            if (obj.context === context && obj.name === className) {
                singletonContexts[i].instance = instance;
                return;
            }
        }

        singletonContexts.push({ name:className, context : context, instance : instance });
    }

    function getClassFactory(classConstructor) {
        return function (context){

            if (context === undefined) {
                context = {};
            }

            return {
                create: function() {
                    return merge(classConstructor.name, classConstructor.apply({ context:context } ,arguments), context);
                }
            }
        }
    }

    function getSingletonFactory(classConstructor) {
        return function(context) {
            if (context === undefined) {
                context = {};
            }

            let instance = getSingletonInstance(context, classConstructor.name);

            return {
                getInstance : function() {
                    if (instance) {
                        return instance;
                    }

                    instance = merge(classConstructor.name, classConstructor.apply({ context: context }, arguments), context);
                    singletonContexts.push({ name:classConstructor.name, context : context, instance : instance });

                    return instance;
                }
            }
        }
    }

    function merge(name, classConstructor, context) {
        let extensionContext = getExtensionContext(context);

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
        
        extensions.forEach(function(obj) {
            if (obj === context) {
                extensionContext = obj;
            }
        });

        if(!extensionContext) {
            extensionContext = extensions.push(context);
        }

        return extensionContext;
    }

}());

export default FactoryMaker;