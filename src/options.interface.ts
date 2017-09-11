export interface IOptions {
    minLines: number;
    minTokens: number;
    output: string;
    path: string;
    exclude?: string[];
    reporter?: string[];
    blame?: boolean;
    debug?: boolean;
    skipComments?: boolean;
}
