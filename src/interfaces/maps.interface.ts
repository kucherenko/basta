import {IHash} from "./hash.interface";

export interface IMaps {
    hasHash(hash: string, mode: string): boolean;

    getHash(hash: string, mode: string): IHash;

    addHash(hash: string, mode: string, info: IHash);
}
