import { Options } from './options';
export declare function getWebFontCSS<T extends HTMLElement>(node: T, options: Options): Promise<string>;
export declare function embedWebFonts(clonedNode: HTMLElement, options: Options): Promise<HTMLElement>;
