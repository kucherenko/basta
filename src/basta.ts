import {IOptions} from "./interfaces/options.interface";
import {lstatSync, readFileSync} from "fs";
import {findModeByFileName} from "./formats/meta";
import {detect} from "./detect";
import through2 = require("through2");

const create = require('glob-stream');

export function basta(options: IOptions) {
    const stream = create('./fixtures/**/*');

    stream.pipe(through2.obj(({path}, encoding, callback) => {
        if (lstatSync(path).isFile()) {
            const mode = findModeByFileName(path);
            if (!mode) {
                return callback();
            }
            const content = readFileSync(path);
            detect({id: path}, mode.mode, content, options);
        }
        return callback();
    }));
}
