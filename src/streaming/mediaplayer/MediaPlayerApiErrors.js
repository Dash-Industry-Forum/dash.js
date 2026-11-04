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
 * Error strings thrown by the MediaPlayer public API when a method is called too early.
 * Shared by MediaPlayer and its API sub-modules. Must stay byte-identical (unit tests compare them).
 */

/**
 * @constant {string} STREAMING_NOT_INITIALIZED_ERROR error string thrown when a function is called before the dash.js has been fully initialized
 * @memberof module:MediaPlayer
 * @inner
 */
export const STREAMING_NOT_INITIALIZED_ERROR = 'You must first call initialize() and set a source before calling this method';
/**
 * @constant {string} PLAYBACK_NOT_INITIALIZED_ERROR error string thrown when a function is called before the dash.js has been fully initialized
 * @memberof module:MediaPlayer
 * @inner
 */
export const PLAYBACK_NOT_INITIALIZED_ERROR = 'You must first call initialize() and set a valid source and view before calling this method';
/**
 * @constant {string} ELEMENT_NOT_ATTACHED_ERROR error string thrown when a function is called before the dash.js has received a reference of an HTML5 video element
 * @memberof module:MediaPlayer
 * @inner
 */
export const ELEMENT_NOT_ATTACHED_ERROR = 'You must first call attachView() to set the video element before calling this method';
/**
 * @constant {string} SOURCE_NOT_ATTACHED_ERROR error string thrown when a function is called before the dash.js has received a valid source stream.
 * @memberof module:MediaPlayer
 * @inner
 */
export const SOURCE_NOT_ATTACHED_ERROR = 'You must first call attachSource() with a valid source before calling this method';
/**
 * @constant {string} MEDIA_PLAYER_NOT_INITIALIZED_ERROR error string thrown when a function is called before the dash.js has been fully initialized.
 * @memberof module:MediaPlayer
 * @inner
 */
export const MEDIA_PLAYER_NOT_INITIALIZED_ERROR = 'MediaPlayer not initialized!';
/**
 * @constant {string} ARRAY_NOT_SUPPORTED_ERROR error string thrown when settings object was called using an array.
 * @memberof module:MediaPlayer
 * @inner
 */
export const ARRAY_NOT_SUPPORTED_ERROR = 'Array type not supported for settings!';
