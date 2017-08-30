import {IClones} from "./clones.interface";
import {IStatistic} from "./statistic.interface";

export interface IReporter {
    report(clones: IClones, statistic: IStatistic);
}
