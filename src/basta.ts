import "colors";
import {IOptions} from "./options.interface";
import {lstatSync, readFileSync} from "fs";
import {findModeByFileName} from "./formats/meta";
import {detect} from "./detect";
import {getClonesStorage, getMapsStorage, getStatisticStorage} from "./storage/";
import {IClones} from "./storage/clones.interface";
import {IStatistic} from "./storage/statistic.interface";
import {relative} from "path";
import {IMaps} from "./storage/maps.interface";
import {getReporter, hasReporter, registerReporter} from "./reporters/index";

const create = require('glob-stream');

export function basta(options: IOptions) {
    console.time('Working Time'.grey);

    const paths = [`${options.path}/**/*`];

    const ignores = options.exclude.map(pattern => `!${options.path}/${pattern}`);

    const stream = create([...paths, ...ignores]);

    console.log(require(__dirname + '/../package.json').description.grey + '\n\n');

    if (options.debug) {
        console.log('Options:'.bold);
        console.log(options);
        console.log('---------'.blue);
        console.log('Paths:'.bold);
        console.log(paths);
        console.log('Exclude:'.bold);
        console.log(ignores);
        console.log('---------'.blue);
        console.log('Files:'.bold);
    }

    stream.on('data', ({path}, encoding, callback) => {
        if (lstatSync(path).isFile()) {
            const statistic: IStatistic = getStatisticStorage({});
            const mode = findModeByFileName(path);
            if (!mode) {
                return;
            }
            statistic.addFiles(mode.name, 1);
            if (!options.debug) {
                const content = readFileSync(path);
                detect({id: relative(options.path, path)}, mode, content, options);
            } else {
                console.log(` - ${relative(options.path, path).green}`);
            }

        }
    });

    stream.on('end', () => {
        const clones: IClones = getClonesStorage(options);
        const statistic: IStatistic = getStatisticStorage(options);
        const maps: IMaps = getMapsStorage(options);

        if (!options.debug) {
            options.reporter.map((reporter) => {
                if (hasReporter(reporter)) {
                    getReporter(reporter).report(options, {clones, statistic, maps});
                } else {
                    console.warn(`Reporter named "${reporter}" not registered`.yellow);
                }
            });
            console.timeEnd('Working Time'.grey);
        }

    });
}
