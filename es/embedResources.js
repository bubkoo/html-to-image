var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getBlobFromURL } from './getBlobFromURL';
import { getMimeType, isDataUrl, makeDataUrl, resolveUrl } from './util';
const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
const URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
export function toRegex(url) {
    // eslint-disable-next-line no-useless-escape
    const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
    return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, 'g');
}
export function parseURLs(cssText) {
    const result = [];
    cssText.replace(URL_REGEX, (raw, quotation, url) => {
        result.push(url);
        return raw;
    });
    return result.filter((url) => !isDataUrl(url));
}
export function embed(cssText, resourceURL, baseURL, options, get) {
    const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL;
    return Promise.resolve(resolvedURL)
        .then((url) => get ? get(url) : getBlobFromURL(url, options))
        .then((data) => {
        if (typeof data === 'string') {
            return makeDataUrl(data, getMimeType(resourceURL));
        }
        return makeDataUrl(data.blob, getMimeType(resourceURL) || data.contentType);
    })
        .then((dataURL) => cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`))
        .then((content) => content, () => resolvedURL);
}
function filterPreferredFontFormat(str, { preferredFontFormat }) {
    return !preferredFontFormat
        ? str
        : str.replace(FONT_SRC_REGEX, (match) => {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
                if (!format) {
                    return '';
                }
                if (format === preferredFontFormat) {
                    return `src: ${src};`;
                }
            }
        });
}
export function shouldEmbed(url) {
    return url.search(URL_REGEX) !== -1;
}
export function embedResources(cssText, baseUrl, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!shouldEmbed(cssText)) {
            return Promise.resolve(cssText);
        }
        const filteredCSSText = filterPreferredFontFormat(cssText, options);
        return Promise.resolve(filteredCSSText)
            .then(parseURLs)
            .then((urls) => urls.reduce((deferred, url) => 
        // eslint-disable-next-line promise/no-nesting
        deferred.then((css) => embed(css, url, baseUrl, options)), Promise.resolve(filteredCSSText)));
    });
}
//# sourceMappingURL=embedResources.js.map