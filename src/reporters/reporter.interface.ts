import {IClones} from "../storage/clones.interface";
import {IStatistic} from "../storage/statistic.interface";

export interface IReporter {
    report(clones: IClones, statistic: IStatistic);
}
