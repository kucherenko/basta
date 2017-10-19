import {IReporter} from "./reporter.interface";
import {ConsoleReporter} from "./console";
import {HtmlReporter} from "./html";

export interface IReporters {
    [name: string]: IReporter;
}

const reporters: IReporters = {};

export function registerReporter(name: string, reporter: IReporter) {
    reporters[name] = reporter;
}

export function getRegisteredReporters(): IReporters {
    return reporters;
}

export function getReporter(name: string): IReporter {
    return reporters[name];
}

export function hasReporter(name: string): boolean {
    return reporters.hasOwnProperty(name);
}

registerReporter('html', new HtmlReporter());
registerReporter('console', new ConsoleReporter());
