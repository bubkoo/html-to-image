"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyStyleWithOptions = void 0;
function applyStyleWithOptions(node, options) {
    var style = node.style;
    if (options.backgroundColor) {
        style.backgroundColor = options.backgroundColor;
    }
    if (options.width) {
        style.width = options.width + "px";
    }
    if (options.height) {
        style.height = options.height + "px";
    }
    var manual = options.style;
    if (manual != null) {
        Object.keys(manual).forEach(function (key) {
            style[key] = manual[key];
        });
    }
    return node;
}
exports.applyStyleWithOptions = applyStyleWithOptions;
//# sourceMappingURL=applyStyleWithOptions.js.map