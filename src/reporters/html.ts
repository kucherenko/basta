import "colors";
import {writeFileSync, ensureDirSync} from "fs-extra";
import {compileFile} from 'pug';
import {resolve} from "path";
import {IReporter} from "./reporter.interface";
import {IClones} from "../storage/clones.interface";
import {IStatistic} from "../storage/statistic.interface";
import {IOptions} from "../options.interface";
import {IMaps} from "../storage/maps.interface";

export class HtmlReporter implements IReporter {
    report(options: IOptions, {clones, statistic, maps}: { clones: IClones; statistic: IStatistic; maps: IMaps }) {
        const reportFunction = compileFile(__dirname + '/html/report.pug');
        const html = reportFunction({...statistic.get(), clones: clones.get()});
        ensureDirSync(options.output);
        writeFileSync(resolve(options.output, 'basta-report.html'), html);
        console.log(`HTML report saved to ${resolve(options.output, 'basta-report.html')}`.green);
    }
}
