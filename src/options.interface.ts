export interface IOptions {
    types: string[];
    minLines: number;
    minTokens: number;
    path: string;
    limit: number;
    exclude?: string;
    reporter?: string;
    blame?: boolean;
    debug?: boolean;
    skipComments?: boolean;
    verbose?: boolean;
}
