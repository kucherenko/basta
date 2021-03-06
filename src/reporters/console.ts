import {IReporter} from "./reporter.interface";
import {IClones} from "../storage/clones.interface";
import {IStatistic} from "../storage/statistic.interface";
import {IClone} from "../clone.interface";
import 'colors';
import {IOptions} from "../options.interface";
import {IMaps} from "../storage/maps.interface";

const Table = require("cli-table2");

export class ConsoleReporter implements IReporter {

    report(options: IOptions, {clones, statistic, maps}: { clones: IClones; statistic: IStatistic; maps: IMaps }) {
        const {modes, files, total, duplicated, rate} = statistic.get();
        if (!options.silent) {

            clones.get().forEach((clone: IClone) => {
                console.log(` - ${clone.first.id.green}: ${clone.first.start}-${clone.first.start + clone.linesCount}`);
                console.log(` ${clone.second.id.green}: ${clone.second.start}-${clone.second.start + clone.linesCount}\n`);
            });

            const statTable = new Table({
                head: ['Format', 'Duplicated lines', 'Total Lines', '%']
            });

            for (const mode of Object.keys(modes)) {
                if (modes[mode].total > 0) {
                    statTable.push([mode, modes[mode].duplicated, modes[mode].total, modes[mode].rate + '%']);
                }
            }

            console.log(statTable.toString());
        }
        console.log(`Total files: ${files}`.bold.green);
        console.log(`Total source lines: ${total}`.bold.green);
        console.log(`Duplicated lines: ${duplicated} (${rate}%)`.bold.green);
    }
}
