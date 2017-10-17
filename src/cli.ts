import 'colors';
import {Command} from 'commander';
import {IOptions} from './options.interface';
import {basta} from "./basta";
import {dirname, isAbsolute, resolve} from "path";
import {existsSync, readJSONSync} from "fs-extra";

const packageJson = require('../package.json');

function prepareOptions(cli: Command): IOptions {
    let config = cli.config ? resolve(cli.config) : resolve('.basta.json');
    let storedConfig: any = {};
    let argsConfig: any;

    argsConfig = {
        minLines: cli['min-lines'],
        debug: cli['debug'],
        output: cli['output'],
        list: cli['list'],
        threshold: cli['threshold'],
        dontSkipComments: cli.dontSkipComments,
    };

    if (cli['reporter']) {
        argsConfig.reporter = cli.reporter.split(',');
    }

    if (cli['exclude']) {
        argsConfig.exclude = cli.exclude.split(',');
    }

    if (cli.args[0]) {
        argsConfig.path = cli.args[0];
    }

    Object.keys(argsConfig).forEach(key => {
        if (typeof argsConfig[key] === 'undefined') {
            delete argsConfig[key];
        }
    });

    if (!existsSync(config)) {
        config = null;
    } else {
        storedConfig = readJSONSync(config);
        if (storedConfig.hasOwnProperty('path') && !isAbsolute(storedConfig.path)) {
            storedConfig.path = resolve(dirname(config), storedConfig.path);
        }
    }

    return {
        ...{
            config,
            path: process.cwd(),
            minLines: 5,
            minTokens: 50,
            output: './report',
            reporter: ['html', 'console'],
            exclude: [],
            debug: false,
            dontSkipComments: false
        },
        ...storedConfig,
        ...argsConfig
    };
}

export const cli = new Command(packageJson.name)
    .version(packageJson.version)
    .usage('[options] <path>')
    .description(packageJson.description);

cli.option('-l, --min-lines [number]', 'min size of duplication in code lines (Default is 5)');
cli.option('-t, --threshold [number]', 'threshold for duplication, in case duplications >= threshold basta will exit with error');
cli.option('-c, --config [string]', 'path to config file (Default is .basta.json in <path>)');
cli.option('-e, --exclude [string]', 'glob pattern for files what should be excluded from duplication detection');
cli.option('-r, --reporter [string]', 'reporter to use (Default is console)');
cli.option('-o, --output [string]', 'reporter to use (Default is ./report/)');
cli.option('-b, --blame', 'blame authors of duplications (get information about authors from git)');
cli.option('-d, --debug', 'show debug information(options list and selected files)');
cli.option('--list', 'show list of all supported formats');
cli.option('--dontSkipComments', `don't skip comments`);

cli.parse(process.argv);

const options: IOptions = prepareOptions(cli);

basta(options);
