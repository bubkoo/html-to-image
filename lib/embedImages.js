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
exports.embedImages = void 0;
var getBlobFromURL_1 = require("./getBlobFromURL");
var embedResources_1 = require("./embedResources");
var util_1 = require("./util");
function embedBackground(clonedNode, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var background;
        return __generator(this, function (_b) {
            background = (_a = clonedNode.style) === null || _a === void 0 ? void 0 : _a.getPropertyValue('background');
            if (!background) {
                return [2 /*return*/, Promise.resolve(clonedNode)];
            }
            return [2 /*return*/, Promise.resolve(background)
                    .then(function (cssString) { return (0, embedResources_1.embedResources)(cssString, null, options); })
                    .then(function (cssString) {
                    clonedNode.style.setProperty('background', cssString, clonedNode.style.getPropertyPriority('background'));
                    return clonedNode;
                })];
        });
    });
}
function embedImageNode(clonedNode, options) {
    return __awaiter(this, void 0, void 0, function () {
        var src;
        return __generator(this, function (_a) {
            if (!(clonedNode instanceof HTMLImageElement && !(0, util_1.isDataUrl)(clonedNode.src)) &&
                !(clonedNode instanceof SVGImageElement &&
                    !(0, util_1.isDataUrl)(clonedNode.href.baseVal))) {
                return [2 /*return*/, Promise.resolve(clonedNode)];
            }
            src = clonedNode instanceof HTMLImageElement
                ? clonedNode.src
                : clonedNode.href.baseVal;
            return [2 /*return*/, Promise.resolve(src)
                    .then(function (url) { return (0, getBlobFromURL_1.getBlobFromURL)(url, options); })
                    .then(function (data) {
                    return (0, util_1.makeDataUrl)(data.blob, (0, util_1.getMimeType)(src) || data.contentType);
                })
                    .then(function (dataURL) {
                    return new Promise(function (resolve, reject) {
                        clonedNode.onload = resolve;
                        clonedNode.onerror = reject;
                        if (clonedNode instanceof HTMLImageElement) {
                            clonedNode.srcset = '';
                            clonedNode.src = dataURL;
                        }
                        else {
                            clonedNode.href.baseVal = dataURL;
                        }
                    });
                })
                    .then(function () { return clonedNode; }, function () { return clonedNode; })];
        });
    });
}
function embedChildren(clonedNode, options) {
    return __awaiter(this, void 0, void 0, function () {
        var children, deferreds;
        return __generator(this, function (_a) {
            children = (0, util_1.toArray)(clonedNode.childNodes);
            deferreds = children.map(function (child) { return embedImages(child, options); });
            return [2 /*return*/, Promise.all(deferreds).then(function () { return clonedNode; })];
        });
    });
}
function embedImages(clonedNode, options) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!(clonedNode instanceof Element)) {
                return [2 /*return*/, Promise.resolve(clonedNode)];
            }
            return [2 /*return*/, Promise.resolve(clonedNode)
                    .then(function (node) { return embedBackground(node, options); })
                    .then(function (node) { return embedImageNode(node, options); })
                    .then(function (node) { return embedChildren(node, options); })];
        });
    });
}
exports.embedImages = embedImages;
//# sourceMappingURL=embedImages.js.map