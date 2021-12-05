import { Options } from './options';
export declare function toRegex(url: string): RegExp;
export declare function parseURLs(cssText: string): string[];
export declare function embed(cssText: string, resourceURL: string, baseURL: string | null, options: Options, get?: (url: string) => Promise<string>): Promise<string>;
export declare function shouldEmbed(url: string): boolean;
export declare function embedResources(cssText: string, baseUrl: string | null, options: Options): Promise<string>;
