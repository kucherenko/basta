import {IMaps} from "../maps.interface";
import {IHash} from "../../hash.interface";

const maps = {};

export class MapsMemory implements IMaps {

    hasHash(hash: string, mode: string): boolean {
        return maps.hasOwnProperty(mode) && maps[mode].hasOwnProperty(hash);
    }

    getHash(hash: string, mode: string): IHash {
        if (this.hasHash(hash, mode)) {
            return maps[mode][hash];
        }
    }

    addHash(hash: string, mode: string, info: IHash) {
        maps[mode] = maps[mode] || {};
        maps[mode][hash] = info;
    }

    getMaps() {
        return maps;
    }
}
