import {IOptions} from "./options.interface";
import {lstatSync, readFileSync} from "fs";
import {findModeByFileName} from "./formats/meta";
import {detect} from "./detect";
import {getClonesStorage, getStatisticStorage} from "./storage/index";
import {IClones} from "./storage/clones.interface";
import {IStatistic} from "./storage/statistic.interface";
import "colors";
import {ConsoleReporter} from "./reporters/console";

const create = require('glob-stream');

export function basta(options: IOptions) {
    const stream = create('./fixtures/**/*');

    console.log(require(__dirname + '/../package.json').description + '\n\n');

    stream.on('data', ({path}, encoding, callback) => {
        if (lstatSync(path).isFile()) {
            const mode = findModeByFileName(path);
            if (!mode) {
                return;
            }
            const content = readFileSync(path);
            detect({id: path}, mode, content, options);
        }
    });

    stream.on('end', () => {
        const clones: IClones = getClonesStorage({});
        const statistic: IStatistic = getStatisticStorage({});

        [new ConsoleReporter()].map((reporter) => reporter.report(clones, statistic));
    });
}
