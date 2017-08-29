import {ISource} from "./source.interface";

export interface IHash {
    source: ISource;
    line: number;
    metadata?: object;
}
