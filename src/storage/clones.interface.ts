import {IClone} from "../clone.interface";

export interface IClones {

    saveClone(clone: IClone);

    get(): IClone[];
}
