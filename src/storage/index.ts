import {IClones} from "./clones.interface";
import {IMaps} from "./maps.interface";
import {ClonesMemory, MapsMemory, StatisticMemory} from "./memory";
import {IStatistic} from "./statistic.interface";

export function getClonesStorage(options): IClones {
    return new ClonesMemory();
}

export function getMapsStorage(options): IMaps {
    return new MapsMemory();
}

export function getStatisticStorage(options): IStatistic {
    return new StatisticMemory();
}
