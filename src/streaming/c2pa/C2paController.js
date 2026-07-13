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
import FactoryMaker from '../../core/FactoryMaker.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import BoxParser from '../utils/BoxParser.js';
import C2paScanner from './C2paScanner.js';
import C2paValidationCoordinator from './C2paValidationCoordinator.js';
import BoxParsingDetector from './detection/BoxParsingDetector.js';

/**
 * @module C2paController
 * @description Owns the C2PA scanning lifecycle inside the player. Created once during
 * `MediaPlayer.initialize()`, it lazily builds the scanner + coordinator (+ detector) and
 * registers the response interceptor **only while `streaming.c2pa.enabled` is true**. While
 * disabled it holds nothing heavy — no interceptor, no dynamic import of the validation
 * engine — which is the zero-cost path required when C2PA is off. It reacts to the
 * `SETTING_UPDATED_C2PA_ENABLED` event so the operator can enable/disable at runtime.
 * See ADR-0002.
 */
function C2paController() {
    const context = this.context;

    let instance,
        settings,
        eventBus,
        customParametersModel,
        scanner,
        coordinator,
        started,
        subscribed;

    function setup() {
        started = false;
        subscribed = false;
    }

    /**
     * @param {Object} config
     * @param {Object} config.settings dash.js Settings (read for `streaming.c2pa`).
     * @param {Object} config.eventBus dash.js EventBus.
     * @param {Object} config.customParametersModel Exposes add/removeResponseInterceptor.
     */
    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.settings) {
            settings = config.settings;
        }
        if (config.eventBus) {
            eventBus = config.eventBus;
        }
        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }
    }

    /**
     * Subscribes to runtime enable/disable and applies the current `enabled` state. Safe to
     * call more than once.
     */
    function initialize() {
        if (!eventBus) {
            eventBus = EventBus(context).getInstance();
        }
        if (!subscribed) {
            eventBus.on(Events.SETTING_UPDATED_C2PA_ENABLED, _onEnabledChanged, instance);
            subscribed = true;
        }
        _applyEnabledState();
    }

    function _onEnabledChanged() {
        _applyEnabledState();
    }

    function _applyEnabledState() {
        if (_isEnabled()) {
            _attach();
        } else {
            _detach();
        }
    }

    function _isEnabled() {
        const streaming = settings && typeof settings.get === 'function' ? settings.get().streaming : null;
        return !!(streaming && streaming.c2pa && streaming.c2pa.enabled);
    }

    function _attach() {
        if (started) {
            return;
        }
        _ensureCreated();
        scanner.registerInterceptor();
        started = true;
    }

    function _detach() {
        if (!started) {
            return;
        }
        scanner.detach();
        coordinator.reset();
        started = false;
    }

    function _ensureCreated() {
        if (scanner) {
            return;
        }
        const detector = BoxParsingDetector(context).create({
            boxParser: BoxParser(context).getInstance()
        });
        coordinator = C2paValidationCoordinator(context).create({
            settings,
            eventBus,
            detector
        });
        const c2pa = settings.get().streaming.c2pa;
        scanner = C2paScanner(context).create({
            customParametersModel,
            segmentHandler: coordinator.handleSegment,
            mediaTypes: c2pa ? c2pa.mediaTypes : undefined
        });
    }

    function reset() {
        _detach();
        if (eventBus && subscribed) {
            eventBus.off(Events.SETTING_UPDATED_C2PA_ENABLED, _onEnabledChanged, instance);
            subscribed = false;
        }
        scanner = null;
        coordinator = null;
        started = false;
    }

    instance = {
        setConfig,
        initialize,
        reset
    };

    setup();

    return instance;
}

C2paController.__dashjs_factory_name = 'C2paController';
export default FactoryMaker.getSingletonFactory(C2paController);
