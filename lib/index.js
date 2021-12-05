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
exports.getFontEmbedCSS = exports.toBlob = exports.toJpeg = exports.toPng = exports.toPixelData = exports.toCanvas = exports.toSvg = void 0;
var cloneNode_1 = require("./cloneNode");
var embedImages_1 = require("./embedImages");
var applyStyleWithOptions_1 = require("./applyStyleWithOptions");
var embedWebFonts_1 = require("./embedWebFonts");
var util_1 = require("./util");
function getImageSize(node, options) {
    if (options === void 0) { options = {}; }
    var width = options.width || (0, util_1.getNodeWidth)(node);
    var height = options.height || (0, util_1.getNodeHeight)(node);
    return { width: width, height: height };
}
function toSvg(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var _a, width, height;
        return __generator(this, function (_b) {
            _a = getImageSize(node, options), width = _a.width, height = _a.height;
            return [2 /*return*/, Promise.resolve(node)
                    .then(function (nativeNode) { return (0, cloneNode_1.cloneNode)(nativeNode, options, true); })
                    .then(function (clonedNode) { return (0, embedWebFonts_1.embedWebFonts)(clonedNode, options); })
                    .then(function (clonedNode) { return (0, embedImages_1.embedImages)(clonedNode, options); })
                    .then(function (clonedNode) { return (0, applyStyleWithOptions_1.applyStyleWithOptions)(clonedNode, options); })
                    .then(function (clonedNode) { return (0, util_1.nodeToDataURL)(clonedNode, width, height); })];
        });
    });
}
exports.toSvg = toSvg;
var dimensionCanvasLimit = 16384; // as per https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
function checkCanvasDimensions(canvas) {
    if (canvas.width > dimensionCanvasLimit ||
        canvas.height > dimensionCanvasLimit) {
        if (canvas.width > dimensionCanvasLimit &&
            canvas.height > dimensionCanvasLimit) {
            if (canvas.width > canvas.height) {
                canvas.height *= dimensionCanvasLimit / canvas.width;
                canvas.width = dimensionCanvasLimit;
            }
            else {
                canvas.width *= dimensionCanvasLimit / canvas.height;
                canvas.height = dimensionCanvasLimit;
            }
        }
        else if (canvas.width > dimensionCanvasLimit) {
            canvas.height *= dimensionCanvasLimit / canvas.width;
            canvas.width = dimensionCanvasLimit;
        }
        else {
            canvas.width *= dimensionCanvasLimit / canvas.height;
            canvas.height = dimensionCanvasLimit;
        }
    }
}
function toCanvas(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, toSvg(node, options)
                    .then(util_1.createImage)
                    .then(function (img) {
                    var canvas = document.createElement('canvas');
                    var context = canvas.getContext('2d');
                    var ratio = options.pixelRatio || (0, util_1.getPixelRatio)();
                    var _a = getImageSize(node, options), width = _a.width, height = _a.height;
                    var canvasWidth = options.canvasWidth || width;
                    var canvasHeight = options.canvasHeight || height;
                    canvas.width = canvasWidth * ratio;
                    canvas.height = canvasHeight * ratio;
                    if (!options.skipAutoScale) {
                        checkCanvasDimensions(canvas);
                    }
                    canvas.style.width = "" + canvasWidth;
                    canvas.style.height = "" + canvasHeight;
                    if (options.backgroundColor) {
                        context.fillStyle = options.backgroundColor;
                        context.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    return canvas;
                })];
        });
    });
}
exports.toCanvas = toCanvas;
function toPixelData(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var _a, width, height;
        return __generator(this, function (_b) {
            _a = getImageSize(node, options), width = _a.width, height = _a.height;
            return [2 /*return*/, toCanvas(node, options).then(function (canvas) {
                    var ctx = canvas.getContext('2d');
                    return ctx.getImageData(0, 0, width, height).data;
                })];
        });
    });
}
exports.toPixelData = toPixelData;
function toPng(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, toCanvas(node, options).then(function (canvas) { return canvas.toDataURL(); })];
        });
    });
}
exports.toPng = toPng;
function toJpeg(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, toCanvas(node, options).then(function (canvas) {
                    return canvas.toDataURL('image/jpeg', options.quality || 1);
                })];
        });
    });
}
exports.toJpeg = toJpeg;
function toBlob(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, toCanvas(node, options).then(util_1.canvasToBlob)];
        });
    });
}
exports.toBlob = toBlob;
function getFontEmbedCSS(node, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, embedWebFonts_1.getWebFontCSS)(node, options)];
        });
    });
}
exports.getFontEmbedCSS = getFontEmbedCSS;
//# sourceMappingURL=index.js.map