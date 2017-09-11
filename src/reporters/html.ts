import {IReporter} from "./reporter.interface";
import {IClones} from "../storage/clones.interface";
import {IStatistic} from "../storage/statistic.interface";
import {compileFile} from 'pug';
import {writeFileSync} from "fs";

export class HtmlReporter implements IReporter {
    report(clones: IClones, statistic: IStatistic) {
        const reportFunction = compileFile(__dirname + '/html/report.pug');
        const html = reportFunction({...statistic.get(), clones: clones.get()});
        writeFileSync('report.html', html);
    }

}
