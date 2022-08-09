"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clonePseudoElements = void 0;
var util_1 = require("./util");
function formatCSSText(style) {
    var content = style.getPropertyValue('content');
    return style.cssText + " content: '" + content.replace(/'|"/g, '') + "';";
}
function formatCSSProperties(style) {
    return (0, util_1.toArray)(style)
        .map(function (name) {
        var value = style.getPropertyValue(name);
        var priority = style.getPropertyPriority(name);
        return name + ": " + value + (priority ? ' !important' : '') + ";";
    })
        .join(' ');
}
function getPseudoElementStyle(className, pseudo, style) {
    var selector = "." + className + ":" + pseudo;
    var cssText = style.cssText
        ? formatCSSText(style)
        : formatCSSProperties(style);
    return document.createTextNode(selector + "{" + cssText + "}");
}
function clonePseudoElement(nativeNode, clonedNode, pseudo) {
    var style = window.getComputedStyle(nativeNode, pseudo);
    var content = style.getPropertyValue('content');
    if (content === '' || content === 'none') {
        return;
    }
    var className = (0, util_1.uuid)();
    try {
        clonedNode.className = clonedNode.className + " " + className;
    }
    catch (err) {
        return;
    }
    var styleElement = document.createElement('style');
    styleElement.appendChild(getPseudoElementStyle(className, pseudo, style));
    clonedNode.appendChild(styleElement);
}
function clonePseudoElements(nativeNode, clonedNode) {
    clonePseudoElement(nativeNode, clonedNode, ':before');
    clonePseudoElement(nativeNode, clonedNode, ':after');
}
exports.clonePseudoElements = clonePseudoElements;
//# sourceMappingURL=clonePseudoElements.js.map