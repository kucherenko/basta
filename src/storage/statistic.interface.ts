
export interface IStatistic {
    addDuplicated(mode: string, lines: number);

    addTotal(mode: string, lines: number);

    get()
}
