import {IStatistic} from "../statistic.interface";


const total = 0;
const duplicated = 0;
const rate = 0.00;

const statistic = {
    modes: {},
    total,
    duplicated,
    rate
};

export class StatisticMemory implements IStatistic {

    addDuplicated(mode: string, lines: number) {
        this._initStatistic(mode);
        statistic.modes[mode].duplicated += lines;
        statistic.duplicated += lines;
        statistic.rate = this._calculateRate(statistic.total, statistic.duplicated);
        statistic.modes[mode].rate = this._calculateRate(statistic.modes[mode].total, statistic.modes[mode].duplicated);
    }

    addTotal(mode: string, lines: number) {
        this._initStatistic(mode);
        statistic.modes[mode].total += lines;
        statistic.total += lines;
        statistic.rate = this._calculateRate(statistic.total, statistic.duplicated);
        statistic.modes[mode].rate = this._calculateRate(statistic.modes[mode].total, statistic.modes[mode].duplicated);
    }

    get() {
        return statistic;
    }

    private _initStatistic(mode: string) {
        statistic.modes[mode] = statistic.modes[mode] || {total, duplicated, rate};
    }

    private _calculateRate(total: number, duplicated: number): number {
        if (total) {
            return Math.round(duplicated / total * 10000) / 100;
        }
        return 0.00;
    }
}
