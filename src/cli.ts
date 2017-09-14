import 'colors';
import {Command} from 'commander';
import {IOptions} from './options.interface';
import {basta} from "./basta";
import {resolve} from "path";
import {existsSync} from "fs-extra";

const packageJson = require('../package.json');

function prepareOptions(cli: Command): IOptions {
    const path = cli.args[0] ? resolve(cli.args[0]) : process.cwd();
    let config = cli.config ? resolve(cli.config) : resolve(path, './.basta.json');

    if (!existsSync(config)) {
        config = null;
    }

    return {
        path,
        config,
        minLines: cli['min-lines'] || 5,
        minTokens: 50,
        output: cli.output ? resolve(cli.output) : resolve(path, './report'),
        reporter: cli.reporter ? cli.reporter.split(',') : ['html', 'console'],
        exclude: cli.exclude ? cli.exclude.split(',') : [],
        blame: cli.blame,
        debug: cli.debug
    };
}

export const cli = new Command(packageJson.name)
    .version(packageJson.version)
    .usage('[options] <path>')
    .description(packageJson.description);

cli.option('-l, --min-lines [number]', 'min size of duplication in code lines (Default is 5)');
cli.option('-c, --config [string]', 'path to config file (Default is .basta.json in <path>)');
cli.option('-e, --exclude [string]', 'glob pattern for files what should be excluded from duplication detection');
cli.option('-g, --languages [string]', 'list of languages which scan for duplicates');
cli.option('-r, --reporter [string]', 'reporter to use (Default is console)');
cli.option('-o, --output [string]', 'reporter to use (Default is ./report/)');
cli.option('-b, --blame', 'blame authors of duplications (get information about authors from git)');
cli.option('-d, --debug', 'show debug information(options list and selected files)');
cli.option('--dont-skip-comments', `don't skip comments`);

cli.parse(process.argv);

const options: IOptions = prepareOptions(cli);

basta(options);
