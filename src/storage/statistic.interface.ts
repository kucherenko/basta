
export interface IStatistic {

    addDuplicated(mode: string, lines: number);

    addTotal(mode: string, lines: number);

    addFiles(mode: string, count: number);

    get();
}
