"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedResources = exports.shouldEmbed = exports.embed = exports.parseURLs = exports.toRegex = void 0;
var getBlobFromURL_1 = require("./getBlobFromURL");
var util_1 = require("./util");
var URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
var URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
var FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
function toRegex(url) {
    // eslint-disable-next-line no-useless-escape
    var escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
    return new RegExp("(url\\(['\"]?)(" + escaped + ")(['\"]?\\))", 'g');
}
exports.toRegex = toRegex;
function parseURLs(cssText) {
    var result = [];
    cssText.replace(URL_REGEX, function (raw, quotation, url) {
        result.push(url);
        return raw;
    });
    return result.filter(function (url) { return !(0, util_1.isDataUrl)(url); });
}
exports.parseURLs = parseURLs;
function embed(cssText, resourceURL, baseURL, options, get) {
    var resolvedURL = baseURL ? (0, util_1.resolveUrl)(resourceURL, baseURL) : resourceURL;
    return Promise.resolve(resolvedURL)
        .then(function (url) {
        return get ? get(url) : (0, getBlobFromURL_1.getBlobFromURL)(url, options);
    })
        .then(function (data) {
        if (typeof data === 'string') {
            return (0, util_1.makeDataUrl)(data, (0, util_1.getMimeType)(resourceURL));
        }
        return (0, util_1.makeDataUrl)(data.blob, (0, util_1.getMimeType)(resourceURL) || data.contentType);
    })
        .then(function (dataURL) { return cssText.replace(toRegex(resourceURL), "$1" + dataURL + "$3"); })
        .then(function (content) { return content; }, function () { return resolvedURL; });
}
exports.embed = embed;
function filterPreferredFontFormat(str, _a) {
    var preferredFontFormat = _a.preferredFontFormat;
    return !preferredFontFormat
        ? str
        : str.replace(FONT_SRC_REGEX, function (match) {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                var _a = URL_WITH_FORMAT_REGEX.exec(match) || [], src = _a[0], format = _a[2];
                if (!format) {
                    return '';
                }
                if (format === preferredFontFormat) {
                    return "src: " + src + ";";
                }
            }
        });
}
function shouldEmbed(url) {
    return url.search(URL_REGEX) !== -1;
}
exports.shouldEmbed = shouldEmbed;
function embedResources(cssText, baseUrl, options) {
    return __awaiter(this, void 0, void 0, function () {
        var filteredCSSText;
        return __generator(this, function (_a) {
            if (!shouldEmbed(cssText)) {
                return [2 /*return*/, Promise.resolve(cssText)];
            }
            filteredCSSText = filterPreferredFontFormat(cssText, options);
            return [2 /*return*/, Promise.resolve(filteredCSSText)
                    .then(parseURLs)
                    .then(function (urls) {
                    return urls.reduce(function (deferred, url) {
                        // eslint-disable-next-line promise/no-nesting
                        return deferred.then(function (css) { return embed(css, url, baseUrl, options); });
                    }, Promise.resolve(filteredCSSText));
                })];
        });
    });
}
exports.embedResources = embedResources;
//# sourceMappingURL=embedResources.js.map