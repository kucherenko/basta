import {IClones} from "../clones.interface";
import {IClone} from "../../clone.interface";

const clones: IClone[] = [];

export class ClonesMemory implements IClones {

    saveClone(clone: IClone) {
        clones.push(clone);
    }

    getClones(): IClone[] {
        return clones;
    }
}
