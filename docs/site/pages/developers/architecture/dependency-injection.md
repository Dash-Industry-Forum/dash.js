---
title: Dependency Injection
---

# Dependency Injection

dash.js does not use classes. Every module follows the same closure-factory pattern, and `FactoryMaker`
(`src/core/FactoryMaker.js`) acts as the dependency injection container.

## Anatomy of a module

```js
import FactoryMaker from '../core/FactoryMaker.js';

function GapController() {
    const context = this.context;   // the DI scope, injected by FactoryMaker
    let instance,                   // the public API object
        logger,                     // private state lives in closure variables
        playbackController;

    function setConfig(config) {
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
    }

    instance = {
        setConfig
    };

    return instance;
}

GapController.__dashjs_factory_name = 'GapController';
export default FactoryMaker.getSingletonFactory(GapController);
```

The important parts:

- Private state is held in closure variables, the public API is whatever ends up on the returned `instance` object.
- `__dashjs_factory_name` registers the module under a stable name — this is what makes it overridable via
  `player.extend()`.
- The module exports a *factory*, not an instance.

## Contexts: per-player scoping

Every `MediaPlayer().create()` call creates its own `context` object. All "singletons" are scoped to that context:

```js
const eventBus = EventBus(context).getInstance();
```

Two player instances on the same page therefore get two completely independent sets of modules — two event buses, two
settings objects, two scheduling pipelines. This is what makes multiple independent players per page possible.

## Singleton vs. class factories

- **`FactoryMaker.getSingletonFactory(Module)`** — one instance per context, retrieved with
  `Module(context).getInstance()`. Used for controllers, models and most infrastructure.
- **`FactoryMaker.getClassFactory(Module)`** — a new instance per `create()` call:
  `Module(context).create(config)`. Used where multiple instances per player exist, for example one
  `StreamProcessor` per media type.

## Overriding modules with `player.extend()`

Because every module is registered by name, applications can replace or extend any of them without forking dash.js:

```js
player.extend('AbrController', MyAbrControllerFactory, true /* override */);
```

- With `override: true` the custom factory replaces the built-in module.
- With `override: false` the custom object is merged over the built-in instance — useful to override single methods.
- Inside an extended module, `this.factory` and `this.context` are injected, so built-in singletons can be looked up
  via `this.factory.getSingletonInstance(this.context, 'VideoModel')`.

**Important:** `player.extend()` must be called *before* `player.initialize()` — once the module graph is
instantiated, replacing factories has no effect.
