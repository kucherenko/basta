import {Command} from 'commander';
import {IOptions} from './interfaces/options.interface';
import {basta} from "./basta";
import {resolve} from "path";

const packageJson = require('../package.json');


function prepareOptions(commander): IOptions {
    const options: IOptions = {
        types: commander.languages ? commander.languages.split[','] : ['*'],
        minLines: commander['min-lines'] || 5,
        minTokens: commander['min-tokens'] || 70,
        path: commander.path ? resolve(commander['path']) : process.cwd(),
        exclude: commander.exclude,
        reporter: commander.reporter,
        limit: commander.limit,
        blame: commander.blame,
        debug: commander.debug,
        skipComments: commander['skip-comments'],
        verbose: commander.verbose
    };
    return options;
}

export const cli = new Command(packageJson.name)
    .version(packageJson.version)
    .description(packageJson.description);

cli.option('-l, --min-lines [number]', 'min size of duplication in code lines (Default is 5)');
cli.option('-t, --min-tokens [number]', 'min size of duplication in tokens (Default is 70)');
cli.option('-p, --path [string]', 'base directory');
cli.option('-e, --exclude [string]', 'glob pattern for files what should be excluded from duplication detection');
cli.option('-g, --languages [string]', 'list of languages which scan for duplicates');
cli.option('-r, --reporter [string]', 'reporter to use (Default is xml)');
cli.option('-b, --blame', 'blame authors of duplications (get information about authors from git)');
cli.option('-d, --debug', 'show debug information(options list and selected files)');
cli.option('--limit [number]', 'limit of allowed duplications, if real duplications percent more then limit ' +
    'application exit with error (Default is 50)');
cli.option('--skip-comments', 'skip comments in code');
cli.option('--verbose', 'show full info about copies');

cli.parse(process.argv);

const options: IOptions = prepareOptions(cli);

basta(options);
