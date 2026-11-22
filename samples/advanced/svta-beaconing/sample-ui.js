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
 * Page helpers of the SVTA 2053-1 beaconing sample (beacon table, slot info, log, MPD excerpt). Kept out of the
 * sample's source code view so that it only shows the dash.js and tracker wiring.
 */

export function showSlotStart(slot) {
    document.getElementById('ad-badge').style.display = 'inline-block';
    document.getElementById('slot-info').textContent = JSON.stringify(slot, null, 2);
}

export function showSlotEnd(slot) {
    document.getElementById('ad-badge').style.display = 'none';
    document.getElementById('slot-info').textContent = `No active slot (last slot ended: ${slot.reason})`;
}

export function showBeacon(beacon) {
    const row = document.createElement('tr');
    const cells = [
        new Date().toLocaleTimeString(),
        beacon.firedAt.toFixed(3),
        beacon.scheduledTime !== null ? beacon.scheduledTime.toFixed(3) : 'action',
        beacon.type + (beacon.late ? ' (late)' : ''),
        beacon.url
    ];
    cells.forEach(function (text) {
        const td = document.createElement('td');
        td.textContent = text;
        row.appendChild(td);
    });
    const resultCell = document.createElement('td');
    resultCell.textContent = 'pending';
    row.appendChild(resultCell);
    if (beacon.late) {
        row.classList.add('table-warning');
    }
    document.querySelector('#beacon-table tbody').appendChild(row);
    beacon.result.then(function (result) {
        resultCell.textContent = result;
        if (result !== 'sent') {
            row.classList.add('table-danger');
        }
    });
    const wrapper = document.getElementById('beacon-table-wrapper');
    wrapper.scrollTop = wrapper.scrollHeight;
}

export function log(level, msg) {
    const panel = document.getElementById('log');
    panel.textContent += `${new Date().toLocaleTimeString()} [${level}] ${msg}\n`;
    panel.scrollTop = panel.scrollHeight;
}

/** Shows the EventStream elements of the MPD for reference. */
export function showMpdEvents(mpdUrl) {
    const panel = document.getElementById('mpd-events');
    fetch(mpdUrl)
        .then(function (response) {
            return response.text();
        })
        .then(function (text) {
            const streams = text.match(/^[ \t]*<EventStream[\s\S]*?<\/EventStream>/gm) || [];
            panel.textContent = streams.length ? _dedent(streams.join('\n')) : 'No EventStream found in the MPD';
        })
        .catch(function (e) {
            panel.textContent = `Could not load the MPD: ${e.message}`;
        });
}

function _dedent(text) {
    const lines = text.split('\n');
    const indent = Math.min.apply(null, lines.filter(function (l) {
        return l.trim();
    }).map(function (l) {
        return l.match(/^\s*/)[0].length;
    }));
    return lines.map(function (l) {
        return l.substring(indent);
    }).join('\n');
}
