import {IMaps} from "../interfaces/maps.interface";
import {IHash} from "../interfaces/hash.interface";

export class MapsMemory implements IMaps {

    private maps = {};

    hasHash(hash: string, mode: string): boolean {
        return this.maps.hasOwnProperty(mode) && this.maps[mode].hasOwnProperty(hash);
    }

    getHash(hash: string, mode: string): IHash {
        if (this.hasHash(hash, mode)) {
            return this.maps[mode][hash];
        }
    }

    addHash(hash: string, mode: string, info: IHash) {
        this.maps[mode] = this.maps[mode] || {};
        this.maps[mode][hash] = info;
    }
}
