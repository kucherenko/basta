import {resolve} from 'path';

export interface IOptions {
    types: string[];
    minLines: string;
    minTokens: string;
    path: string;
    files: string;
    limit: number;
    exclude?: string;
    reporter?: string;
    blame?: boolean;
    debug?: boolean;
    skipComments?: boolean;
    verbose?: boolean;
}

export function prepareOptions(cli): IOptions {
    return {
        types: cli.languages ? cli.languages.split[','] : ['*'],
        minLines: cli['min-lines'] || 5,
        minTokens: cli['min-tokens'] || 70,
        path: cli.path ? resolve(cli['path']) : process.cwd(),
        files: cli.files || '*',
        exclude: cli.exclude,
        reporter: cli.reporter,
        blame: cli.blame,
        debug: cli.debug,
        skipComments: cli['skip-comments'],
        verbose: cli.verbose
    } as IOptions;
}
