import {IStatistic} from "../../interfaces/statistic.interface";
import {ISource} from "../../interfaces/source.interface";

const statistic = {
    sources: {},
    modes: {},
    total: 0,
    duplicated: 0
};
const total = 0;
const duplicated = 0;

export class StatisticMemory implements IStatistic {

    private _initStatistic(mode: string, source: ISource) {
      statistic.modes[mode] = statistic.modes[mode] || {total, duplicated};
      statistic.sources[source.id] = statistic.sources[source.id] || {total, duplicated};
    }

    addDuplicated(mode: string, source: ISource, lines: number) {
        this._initStatistic(mode, source);
        statistic.modes[mode].duplicated += lines;
        statistic.sources[source.id].duplicated += lines;
        statistic.duplicated += lines;
    }

    addTotal(mode: string, source: ISource, lines: number) {
      this._initStatistic(mode, source);
      statistic.modes[mode].total += lines;
      statistic.sources[source.id].total = lines;
      statistic.total += lines;
    }

    get() {
      return statistic;
    }
}
