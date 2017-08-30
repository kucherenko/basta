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

    addDuplicated(mode: string, source: ISource, lines: number) {
        statistic.modes[mode] = statistic.modes[mode] || {total, duplicated};
        statistic.modes[mode].duplicated = lines;
        statistic.duplicated += lines;
    }

    addTotal(mode: string, source: ISource, lines: number) {
    }


}
