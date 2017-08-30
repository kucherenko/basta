import {IClones} from "../interfaces/clones.interface";
import {IMaps} from "../interfaces/maps.interface";
import {ClonesMemory, MapsMemory} from "./memory";

export function getClonesStorage(options): IClones {
    return new ClonesMemory();
}

export function getMapsStorage(options): IMaps {
    return new MapsMemory();
}
