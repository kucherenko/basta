import {ISource} from "./source.interface";

export interface IClone {
    first: ISource;
    second: ISource;
    linesCount: number;
    tokensCount: number;
    content?: string;
    mode?: string;
}
