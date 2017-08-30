import { IReporter } from "../interfaces/reporter.interface";
import { IClones } from "../interfaces/clones.interface";
import { IStatistic } from "../interfaces/statistic.interface";

const Table = require('cli-table');

export class ConsoleReporter implements IReporter {
  report(clones: IClones, statistic: IStatistic) {
    
  }
}
