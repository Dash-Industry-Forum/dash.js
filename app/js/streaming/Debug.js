/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

// make jquery :contains case insensitive
$.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function( elem ) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

MediaPlayer.utils.Debug = function () {
    "use strict";

    var htmlConsole = null,
        logToHtmlConsole = true,
        filter = "",

        updateFilter = function () {
            if (htmlConsole === null) {
                return;
            }

            var children = htmlConsole.children(),
                matches;

            if (filter === "" || filter === undefined || filter === null) {
                children.show();
            } else {
                matches = children.filter(':contains(' + filter + ')');
                children.not(matches).hide();
                matches.show();
            }
        },

        filterLatest = function () {
            var item = htmlConsole.children()[0];

            if (filter === "" || filter === undefined || filter === null) {
                $(item).show();
            } else {
                if ($(item).text().toUpperCase().indexOf(filter.toUpperCase()) === -1) {
                    $(item).hide();
                }
            }
        };

    return {
        init: function (hc) {
            htmlConsole = $(hc);
        },

        clear: function () {
            htmlConsole.empty();
        },

        getFilter: function () {
            return filter;
        },

        setFilter: function (value) {
            if (value === filter) {
                return;
            }

            filter = value;
            updateFilter();
        },

        getLogToHtmlConsole: function () {
            return logToHtmlConsole;
        },

        setLogToHtmlConsole: function (value) {
            logToHtmlConsole = value;
        },

        log: function (message) {
            console.log(message);

            if (htmlConsole !== null && logToHtmlConsole) {
                var trace = "<dt>" + message + "</dt>";
                htmlConsole.prepend(trace);
                filterLatest();
            }
        }
    };
};