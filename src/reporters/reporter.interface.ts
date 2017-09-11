import {IOptions} from "../options.interface";

export interface IReporter {
    report(options: IOptions,
           {
               clones: IClones,
               statistic: IStatistic,
               maps: IMaps
           });
}
