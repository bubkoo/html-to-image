"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlobFromURL = void 0;
var util_1 = require("./util");
var cache = {};
function getCacheKey(url) {
    var key = url.replace(/\?.*/, '');
    // font resourse
    if (/ttf|otf|eot|woff2?/i.test(key)) {
        key = key.replace(/.*\//, '');
    }
    return key;
}
function getBlobFromURL(url, options) {
    var cacheKey = getCacheKey(url);
    if (cache[cacheKey] != null) {
        return cache[cacheKey];
    }
    // cache bypass so we dont have CORS issues with cached images
    // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
    if (options.cacheBust) {
        // eslint-disable-next-line no-param-reassign
        url += (/\?/.test(url) ? '&' : '?') + new Date().getTime();
    }
    var failed = function (reason) {
        var placeholder = '';
        if (options.imagePlaceholder) {
            var parts = options.imagePlaceholder.split(/,/);
            if (parts && parts[1]) {
                placeholder = parts[1];
            }
        }
        var msg = "Failed to fetch resource: " + url;
        if (reason) {
            msg = typeof reason === 'string' ? reason : reason.message;
        }
        if (msg) {
            console.error(msg);
        }
        return {
            blob: placeholder,
            contentType: '',
        };
    };
    var deferred = window
        .fetch(url, options.fetchRequestInit)
        .then(function (res) {
        // eslint-disable-next-line promise/no-nesting
        return res.blob().then(function (blob) { return ({
            blob: blob,
            contentType: res.headers.get('Content-Type') || '',
        }); });
    })
        .then(function (_a) {
        var blob = _a.blob, contentType = _a.contentType;
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function () {
                return resolve({
                    contentType: contentType,
                    blob: reader.result,
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    })
        .then(function (_a) {
        var blob = _a.blob, contentType = _a.contentType;
        return ({
            contentType: contentType,
            blob: (0, util_1.parseDataUrlContent)(blob),
        });
    })
        // on failed
        .catch(failed);
    // cache result
    cache[cacheKey] = deferred;
    return deferred;
}
exports.getBlobFromURL = getBlobFromURL;
//# sourceMappingURL=getBlobFromURL.js.map