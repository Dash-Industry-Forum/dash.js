/**
 * UIHelpers.js - DOM utility functions and helpers
 */

/**
 * Show an element by removing the 'd-none' class
 * @param {HTMLElement|string} el - Element or selector
 */
export function show(el) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (element) {
        element.classList.remove('d-none');
    }
}

/**
 * Hide an element by adding the 'd-none' class
 * @param {HTMLElement|string} el - Element or selector
 */
export function hide(el) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (element) {
        element.classList.add('d-none');
    }
}

/**
 * Toggle element visibility
 * @param {HTMLElement|string} el - Element or selector
 * @param {boolean} [forceVisible] - Optional force state
 */
export function toggle(el, forceVisible) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (!element) {
        return;
    }
    if (forceVisible !== undefined) {
        element.classList.toggle('d-none', !forceVisible);
    } else {
        element.classList.toggle('d-none');
    }
}

/**
 * Query shorthand
 * @param {string} selector
 * @param {HTMLElement} [parent]
 * @returns {HTMLElement|null}
 */
export function $(selector, parent) {
    return (parent || document).querySelector(selector);
}

/**
 * Query all shorthand
 * @param {string} selector
 * @param {HTMLElement} [parent]
 * @returns {NodeListOf<HTMLElement>}
 */
export function $$(selector, parent) {
    return (parent || document).querySelectorAll(selector);
}

/**
 * Fetch a JSON file
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response.json();
}

/**
 * Format seconds to HH:MM:SS or MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) {
        return '00:00';
    }
    const negative = seconds < 0;
    seconds = Math.abs(Math.floor(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const prefix = negative ? '- ' : '';
    if (h > 0) {
        return `${prefix}${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${prefix}${pad(m)}:${pad(s)}`;
}

/**
 * Create an HTML element with attributes and optional children
 * @param {string} tag
 * @param {Object} [attrs]
 * @param  {...(HTMLElement|string)} children
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'textContent') {
            el.textContent = value;
        } else if (key === 'innerHTML') {
            el.innerHTML = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child) {
            el.appendChild(child);
        }
    }
    return el;
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Simple event emitter for inter-module communication
 */
export class EventEmitter {
    constructor() {
        this._listeners = {};
    }

    on(event, fn) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(fn);
    }

    off(event, fn) {
        if (!this._listeners[event]) {
            return;
        }
        this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    }

    emit(event, data) {
        if (!this._listeners[event]) {
            return;
        }
        for (const fn of this._listeners[event]) {
            fn(data);
        }
    }
}
