/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 MediaPlayer.dependencies.RequestScheduler = function () {
    "use strict";

     /*
      * RequestScheduler controls the time of calling of functions to be executed on shchedule
      */

    var schedulerModels = [],
        periodicExecuteInterval = null,
        periodicExecuteId = null,
        isCheckingForVideoTimeTriggersStarted = false,

        PERIODICALLY_TRIGGERED_TASK = 0,
        WALL_TIME_TRIGGERED_TASK = 1,
        VIDEO_TIME_TRIGGERED_TASK = 2,

        /*
         * Calls the execution function only ones at provided player time
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         * @param time The time at which the executeFunction must be called
         *
         */
        setVideoTimeTrigger = function(executeContext, executeFunction, dueTime) {
            if(!executeContext || !executeFunction) return;

            var schedulerModel;

            schedulerModel = registerSchedulerModel.call(this, executeContext, VIDEO_TIME_TRIGGERED_TASK);
            schedulerModel.setScheduledTask(executeFunction);
            schedulerModel.setIsScheduled(true);
            schedulerModel.setExecuteTime(dueTime);

            if (!isCheckingForVideoTimeTriggersStarted) {
                startCheckingDueTimeForVideoTimeTrigger.call(this);
            }
        },

        startCheckingDueTimeForVideoTimeTrigger = function() {
            var element = this.videoModel.getElement();

            this.schedulerExt.attachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this));
            this.schedulerExt.attachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
            isCheckingForVideoTimeTriggersStarted = true;
        },

        checkDueTimeForVideoTimeTriggers = function() {
            var videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK),
                ln = videoTimeTriggers.length,
                now = this.videoModel.getCurrentTime(),
                model,
                due,
                i;

            for (i = 0; i < ln; i += 1) {
                model = videoTimeTriggers[i];
                due = model.getExecuteTime();

                if (model.getIsScheduled() && (now > due)) {
                    model.executeScheduledTask();
                    model.setIsScheduled(false);
                }
            }
        },

        /*
         * Cancels the scheduled call for executeContex
         *
         * @param executeContext The object to be used as execution context
         *
         */
        removeVideoTimeTrigger = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, VIDEO_TIME_TRIGGERED_TASK),
                videoTimeTriggers;

            if (schedulerModel) {
                unregisterSchedulerModel(schedulerModel);
                videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK);

                if (videoTimeTriggers.length === 0) {
                    stopCheckingDueTimeForVideoTimeTrigger.call(this);
                }
            }
        },

        stopCheckingDueTimeForVideoTimeTrigger = function() {
            var element = this.videoModel.getElement();

            this.schedulerExt.detachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this));
            this.schedulerExt.detachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
            isCheckingForVideoTimeTriggersStarted = false;
        },

        onUpdateSchedule = function() {
            rescheduleVideoTimeTriggers.call(this);
            checkDueTimeForVideoTimeTriggers.call(this);
        },

        /*
         * Sets all the SchedulerModels to scheduled state to be ready to be executed again
         */
        rescheduleVideoTimeTriggers = function() {
            var videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK),
                ln = videoTimeTriggers.length,
                i;

            for (i = 0; i < ln; i += 1) {
                videoTimeTriggers[i].setIsScheduled(true);
            }
        },

        /*
         * Calls the execution function at the provided wall click time
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         * @param wallTime The wall click time at which the executeFunction must be called
         *
         */
        setTriggerForWallTime = function(executeContext, executeFunction, wallTime) {
            if(!executeContext || !executeFunction) return;

            var executeTimeout = wallTime.getTime() - (new Date()).getTime(),
                executeId,
                schedulerModel;

            schedulerModel = registerSchedulerModel.call(this, executeContext, WALL_TIME_TRIGGERED_TASK);
            schedulerModel.setScheduledTask(executeFunction);
            executeId = setTimeout(function() {
                schedulerModel.executeScheduledTask();
                unregisterSchedulerModel(schedulerModel);
            }, executeTimeout);
            schedulerModel.setExecuteId(executeId);
        },

        /*
         * Cancels the scheduled call for executeContex
         *
         * @param executeContext The object to be used as execution context
         *
         */
        removeTriggerForWallTime = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, WALL_TIME_TRIGGERED_TASK);

            if (schedulerModel) {
                clearTimeout(schedulerModel.getExecuteId());
                unregisterSchedulerModel(schedulerModel);
            }
        },

        /*
         * Prepares and runs the execution functions to be called on schedule
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         *
         */
        startScheduling = function(executeContext, executeFunction) {
            if(!executeContext || !executeFunction) return;

            // Searching for existing model for the given context
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);

            // if we have not stored the model yet, do it now
            if (!schedulerModel) {
                schedulerModel = registerSchedulerModel.call(this, executeContext, PERIODICALLY_TRIGGERED_TASK);
            }
            schedulerModel.setIsScheduled(true);
            schedulerModel.setScheduledTask(executeFunction);
            startPeriodicScheduleListener.call(this);
            // For the first time call the executeFunction from here because we should start requesting segments
            // as soon as possible
            executeFunction.call(executeContext);
        },

        /*
         * Called when the periodic scheduled event occures
         *
         */
        onScheduledTimeOccurred = function() {
            runScheduledTasks.call(this);
        },

        runScheduledTasks = function() {
            var self = this,
                schedulerModel,
                periodicModels = getAllModelsForType.call(self, PERIODICALLY_TRIGGERED_TASK),
                ln = periodicModels.length,
                i;

            for (i = 0; i < ln; i += 1) {
                schedulerModel = periodicModels[i];

                if (schedulerModel.getIsScheduled()) {
                    schedulerModel.executeScheduledTask();
                }
            }
        },

        /*
         * Binds schedule lisstener to corresponding element
         *
         * @param schedulerModel
         *
         */
        startPeriodicScheduleListener = function() {
            if (periodicExecuteId !== null) return;

            this.adjustExecuteInterval();
            periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval);
        },

        /*
         * Stops scheduling and executon of scheduled task for executeContext
         *
         * @param executeContext
         *
         */
        stopPeriodicScheduling = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK),
                periodicModels = getAllModelsForType.call(this, PERIODICALLY_TRIGGERED_TASK);

            if (schedulerModel) {
                unregisterSchedulerModel(schedulerModel);
                if (periodicModels.length === 0) {
                    stopPeriodicScheduleListener.call(this);
                }
            }
        },

        /*
         * Unbinds the schedule listener from corresponding element
         *
         * @param schedulerModel
         *
         */
        stopPeriodicScheduleListener = function() {
            clearInterval(periodicExecuteId);
            periodicExecuteId = null;
        },

        /*
         * Creates and stores SchedulerModel object
         *
         * @param executeContext
         */
        registerSchedulerModel = function (executeContext, type) {
            if(!executeContext) return null;

            var model = this.system.getObject("schedulerModel");
            model.setContext(executeContext);
            model.setType(type);
            schedulerModels.push(model);
            return model;
        },

        getAllModelsForType = function(type) {
            var models = [],
                model,
                i;

            for (i = 0; i < schedulerModels.length; i += 1) {
                model = schedulerModels[i];

                if (model.getType() === type) {
                    models.push(model);
                }
            }

            return models;
        },

        /*
         * Removes SchedulerModel from stored list
         *
         * @param schedulerModel The model to be removed from list
         */
        unregisterSchedulerModel = function (schedulerModel) {
            var index = schedulerModels.indexOf(schedulerModel);

            if (index !== -1) {
                schedulerModels.splice(index, 1);
            }
        },

        /*
         * Searches for stored SchedulerModel by executeContex and type
         *
         * @param executeContext
         * @param type
         */
        findSchedulerModel = function(executeContext, type) {
            for (var i = 0; i < schedulerModels.length; i++) {
                if (schedulerModels[i].getContext() === executeContext && schedulerModels[i].getType() === type) {
                    return schedulerModels[i];
                }
            }

            return null;
        };

    return {
        system: undefined,
        videoModel: undefined,
        debug: undefined,
        schedulerExt: undefined,

        /*
         * Indicates whether the executeContex has scheduled task or not
         *
         * @param executeContext
         *
         */
        isScheduled: function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
            return (!!schedulerModel && schedulerModel.getIsScheduled());
        },

        /*
         * Gets the execution interval for scheduled task of executeContex
         *
         * @param executeContext
         *
         */
        getExecuteInterval: function () {
            return periodicExecuteInterval;
        },

        adjustExecuteInterval: function() {
            if (schedulerModels.length < 1) return;

            var newExecuteInterval = this.schedulerExt.getExecuteInterval(schedulerModels[0].getContext());

            if (periodicExecuteInterval !== newExecuteInterval) {
                periodicExecuteInterval = newExecuteInterval;
                if (periodicExecuteId !== null) {
                    this.debug.log("Changing execute interval: " + periodicExecuteInterval);
                    clearInterval(periodicExecuteId);
                    periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval);
                }
            }
        },

        startScheduling: startScheduling,
        stopScheduling: stopPeriodicScheduling,
        setTriggerForVideoTime: setVideoTimeTrigger,
        setTriggerForWallTime: setTriggerForWallTime,
        removeTriggerForVideoTime: removeVideoTimeTrigger,
        removeTriggerForWallTime: removeTriggerForWallTime
    };
};

MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
};