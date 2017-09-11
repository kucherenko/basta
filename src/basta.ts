import "colors";
import {IOptions} from "./options.interface";
import {lstatSync, readFileSync} from "fs";
import {findModeByFileName} from "./formats/meta";
import {detect} from "./detect";
import {getClonesStorage, getStatisticStorage} from "./storage/index";
import {IClones} from "./storage/clones.interface";
import {IStatistic} from "./storage/statistic.interface";
import {ConsoleReporter} from "./reporters/console";
import {HtmlReporter} from "./reporters/html";
import {relative} from "path";

const create = require('glob-stream');

export function basta(options: IOptions) {
    console.time('Working Time'.grey);

    const stream = create('./fixtures/**/*');

    console.log(require(__dirname + '/../package.json').description.grey + '\n\n');

    if (options.debug) {
        console.log('Options:'.bold);
        console.log(options);
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
        const clones: IClones = getClonesStorage({});
        const statistic: IStatistic = getStatisticStorage({});

        if (!options.debug) {
            [new ConsoleReporter(), new HtmlReporter()].map((reporter) => reporter.report(clones, statistic));
            console.timeEnd('Working Time'.grey);
        }

    });
}
