import {ISource} from "./source.interface";

export interface IStatistic {
    addDuplicated(mode: string, source: ISource, lines: number);

    addTotal(mode: string, source: ISource, lines: number);

    get()
}
