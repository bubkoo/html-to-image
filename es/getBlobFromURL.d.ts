import { Options } from './options';
export interface Metadata {
    blob: string;
    contentType: string;
}
export declare function getBlobFromURL(url: string, options: Options): Promise<Metadata>;
