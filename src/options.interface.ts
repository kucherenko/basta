export interface IOptions {
    minLines: number;
    minTokens: number;
    threshold?: number;
    output: string;
    path: string;
    config?: string;
    exclude?: string[];
    reporter?: string[];
    blame?: boolean;
    silent?: boolean;
    debug?: boolean;
    list?: boolean;
    dontSkipComments?: boolean;
}
