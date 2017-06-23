import {IOptions} from './options';
import {create} from 'glob-stream';
import * as through2 from 'through2';
import {Transform} from 'stream';
import {readFileSync} from 'fs-extra';
import {findModeByFileName} from './formats/meta'
import {runMode} from './formats/index'

const map = require('through2-map');
const reduce = require('through2-reduce');

export function readFiles(): Transform {
    return map.obj((chunk) => {
        chunk.file = readFileSync(chunk.path);
        return chunk;
    });
}

export function tokenize(): Transform {
    return map.obj((chunk) => {
        chunk.format = findModeByFileName(chunk.path);
        chunk.tokens = runMode(chunk.file.toString(), chunk.format, {})
        return chunk;
    });
}

export function findDuplicates(): Transform {
    return reduce.obj((map, current) => {

    });
}

export function cpdStream(stream: NodeJS.ReadableStream) {
    stream
        .pipe(readFiles())
        .pipe(tokenize())
        .pipe(through2.obj((chunk, enc, callback) => {
            console.log(chunk);
            callback();
        }))
        .pipe(findDuplicates());
}

export function cpd(options: IOptions) {
    const path = `${options.path}/src/**/*.html`;
    return cpdStream(create([path, '!./node_modules/**/*']));
}
