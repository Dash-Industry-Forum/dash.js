/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @module FactoryMaker
 */
let FactoryMaker = (function () {

    let instance;
    let extensions = [];
    let singletonContexts = [];

    function extend(name, childInstance, override, context) {
        let extensionContext = getExtensionContext(context);
        if (!extensionContext[name] && childInstance) {
            extensionContext[name] = {instance: childInstance, override: override};
        }
    }

    /**
     * Use this method from your extended object.  this.factory is injected into your object.
     * this.factory.getSingletonInstance(this.context, 'VideoModel')
     * will return the video model for use in the extended object.
     *
     * @param {Object} context - injected into extended object as this.context
     * @param {string} className - string name found in all dash.js objects
     * with name __dashjs_factory_name Will be at the bottom. Will be the same as the object's name.
     * @returns {*} Context aware instance of specified singleton name.
     * @memberof module:FactoryMaker
     * @instance
     */
    function getSingletonInstance(context, className) {
        for (let i in singletonContexts) {
            let obj = singletonContexts[i];
            if (obj.context === context && obj.name === className) {
                return obj.instance;
            }
        }
        return null;
    }

    /**
     * Use this method to add an singleton instance to the system.  Useful for unit testing to mock objects etc.
     *
     * @param {Object} context
     * @param {string} className
     * @param {Object} instance
     * @memberof module:FactoryMaker
     * @instance
     */
    function setSingletonInstance(context, className, instance) {
        for (let i in singletonContexts) {
            let obj = singletonContexts[i];
            if (obj.context === context && obj.name === className) {
                singletonContexts[i].instance = instance;
                return;
            }
        }
        singletonContexts.push({ name: className, context: context, instance: instance });
    }

    function getClassFactory(classConstructor) {
        return function (context) {
            if (context === undefined) {
                context = {};
            }
            return {
                create: function () {
                    return merge(classConstructor.__dashjs_factory_name, classConstructor.apply({ context: context }, arguments), context, arguments);
                }
            };
        };
    }

    function getSingletonFactory(classConstructor) {
        return function (context) {
            let instance;
            if (context === undefined) {
                context = {};
            }
            return {
                getInstance: function () {
                    // If we don't have an instance yet check for one on the context
                    if (!instance) {
                        instance = getSingletonInstance(context, classConstructor.__dashjs_factory_name);
                    }
                    // If there's no instance on the context then create one
                    if (!instance) {
                        instance = merge(classConstructor.__dashjs_factory_name, classConstructor.apply({ context: context }, arguments), context, arguments);
                        singletonContexts.push({ name: classConstructor.__dashjs_factory_name, context: context, instance: instance });
                    }
                    return instance;
                }
            };
        };
    }

    function merge(name, classConstructor, context, args) {
        let extensionContext = getExtensionContext(context);
        let extensionObject = extensionContext[name];
        if (extensionObject) {
            let extension = extensionObject.instance;
            if (extensionObject.override) { //Override public methods in parent but keep parent.
                extension = extension.apply({ context: context, factory: instance, parent: classConstructor}, args);
                for (const prop in extension) {
                    if (classConstructor.hasOwnProperty(prop)) {
                        classConstructor[prop] = extension[prop];
                    }
                }
            } else { //replace parent object completely with new object. Same as dijon.
                return extension.apply({ context: context, factory: instance}, args);
            }
        }
        return classConstructor;
    }

    function getExtensionContext(context) {
        let extensionContext;
        extensions.forEach(function (obj) {
            if (obj === context) {
                extensionContext = obj;
            }
        });
        if (!extensionContext) {
            extensionContext = extensions.push(context);
        }
        return extensionContext;
    }

    instance = {
        extend: extend,
        getSingletonInstance: getSingletonInstance,
        setSingletonInstance: setSingletonInstance,
        getSingletonFactory: getSingletonFactory,
        getClassFactory: getClassFactory
    };

    return instance;

}());

export default FactoryMaker;
