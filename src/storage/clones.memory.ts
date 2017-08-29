import {IClones} from "../interfaces/clones.interface";
import {IClone} from "../interfaces/clone.interface";

export class ClonesMemory implements IClones {

    private clones: IClone[] = []

    saveClone(clone: IClone) {
        this.clones.push(clone);
    }

    getClones(): IClone[] {
        return this.clones;
    }
}
