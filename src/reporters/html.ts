import {IReporter} from "./reporter.interface";
import {IClones} from "../storage/clones.interface";
import {IStatistic} from "../storage/statistic.interface";
import {compileFile} from "pug";
import {writeFileSync} from "fs";
import {IOptions} from "../options.interface";
import {IMaps} from "../storage/maps.interface";
import {resolve} from "path";
import {ensureDirSync} from "fs-extra";

export class HtmlReporter implements IReporter {
    report(options: IOptions, {clones, statistic, maps}: { clones: IClones; statistic: IStatistic; maps: IMaps }) {
        const reportFunction = compileFile(__dirname + '/html/report.pug');
        const html = reportFunction({...statistic.get(), clones: clones.get()});
        ensureDirSync(options.output);
        writeFileSync(resolve(options.output, 'basta-report.html'), html);
    }
}
