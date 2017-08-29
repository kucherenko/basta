import {IOptions} from './interfaces/options.interface';
import {Transform} from 'stream';

import {readFileSync} from 'fs-extra';
import {findModeByFileName} from './formats/meta';
import {runMode} from './formats/index';
import {lstatSync} from 'fs';
import {createHash} from 'crypto';

const through2 = require('through2');
const create = require('glob-stream');
const tokenTypes = {};

const TOKEN_TYPE_HASH_LENGTH = 3;
const TOKEN_VALUE_HASH_LENGTH = 10;
const TOKEN_HASH_LENGTH = TOKEN_TYPE_HASH_LENGTH + TOKEN_VALUE_HASH_LENGTH;

export function detectFiles(): Transform {
    return through2.obj(function (chunk, encoding, callback) {
        if (lstatSync(chunk.path).isFile()) {
            // console.log(`[detectFiles] ${chunk.path}`)
            this.push(chunk);
        }
        return callback();
    });
}

export function readContent(): Transform {
    return through2.obj(function (chunk, encoding, callback) {
        // console.log(`[readContent] ${chunk.path}`)
        chunk.content = readFileSync(chunk.path);
        chunk.content = chunk.content.toString();
        this.push(chunk);
        return callback();
    });
}

export function detectFormat(): Transform {
    return through2.obj(function (chunk, encoding, callback) {
        // console.log(`[detectFormat] ${chunk.path}`)
        if (chunk.content) {
            chunk.format = findModeByFileName(chunk.path);
        }
        this.push(chunk);
        return callback();
    });
}

export function tokenize(): Transform {
    return through2.obj(function (chunk, encoding, callback) {
        // console.log(`[tokenize] ${chunk.path}`)
        chunk.tokens = runMode(chunk.content, chunk.format, {});
        chunk.tokens = chunk.tokens.filter(isValidToken);
        this.push(chunk);
        return callback();
    });
}

export function isValidToken(token) {
    return token.hasOwnProperty('type') && token.type !== 'comment';
}

function generateTokenTypeHash(tokenType: string): string {
    if (!tokenTypes.hasOwnProperty(tokenType)) {
        tokenTypes[tokenType] = createHash('md5')
            .update(tokenType)
            .digest('hex')
            .substr(0, TOKEN_TYPE_HASH_LENGTH);
    }
    return tokenTypes[tokenType];
}

function generateTokenValueHash(tokenValue: string): string {
    return createHash('md5')
        .update(tokenValue)
        .digest('hex')
        .substr(0, TOKEN_VALUE_HASH_LENGTH);
}

function generateTokenHash(token): string {
    return generateTokenTypeHash(token.type) + generateTokenValueHash(token.value);
}

export function generateMap(): Transform {
    return through2.obj(function (chunk, encoding, callback) {
        // console.log(`[generateMap] ${chunk.path}`)
        chunk.map = '';
        chunk.tokensPositions = [];
        chunk.tokens.forEach((token) => {
            chunk.tokensPositions.push(token.line);
            chunk.map += generateTokenHash(token);
        });
        this.push(chunk);
        return callback();
    });
}

interface IHashInfo {
    path: string;
    line: number;
    metadata?: object;
}

export interface IClone {
    firstFile: string;
    secondFile: string;
    firstFileStart: number;
    secondFileStart: number;
    linesCount: number;
    tokensCount: number;
}

const clones: IClone[] = [];

export function findDuplicates(): Transform {
    const tokensLimit = 70;
    const linesLimit = 7;
    const maps = {};


    const hasHash = (hash, mode): boolean => {
        return maps.hasOwnProperty(mode) && maps[mode].hasOwnProperty(hash);
    };

    const getHash = (hash, mode): IHashInfo => {
        if (hasHash(hash, mode)) {
            return maps[mode][hash];
        }
    };

    const addHash = (mode, hash, info: IHashInfo) => {
        maps[mode] = maps[mode] || {};
        maps[mode][hash] = info;
    };

    const addClone = (mode, file, hash, firstToken, lastToken, firstLine, lastLine) => {
        let fileA;
        let firstLineA;
        let numLines;
        const hashInfo: IHashInfo = getHash(hash, mode);
        fileA = hashInfo.path;
        firstLineA = hashInfo.line;
        numLines = lastLine + 1 - firstLine;
        if (numLines >= linesLimit && (fileA !== file || firstLineA !== firstLine)) {
            return clones.push(
                {
                    firstFile: file,
                    secondFile: fileA,
                    firstFileStart: firstLine,
                    secondFileStart: firstLineA,
                    linesCount: numLines,
                    tokensCount: lastToken - firstToken
                }
            );
        }
    };

    return through2.obj(function (chunk, encoding, callback) {
        console.log(`[findDuplicates] ${chunk.path}`);
        let firstLine = null;
        let firstHash = null;
        let firstToken = null;
        let tokenPosition = 0;
        let isClone = false;

        const {tokensPositions, map, format, path} = chunk;

        while (tokenPosition <= tokensPositions.length - tokensLimit) {
            const mapFrame = map.substring(
                tokenPosition * TOKEN_HASH_LENGTH,
                tokenPosition * TOKEN_HASH_LENGTH + tokensLimit * TOKEN_HASH_LENGTH
            );
            const hash = createHash('md5').update(mapFrame).digest('hex');
            if (hasHash(hash, format.mode)) {
                isClone = true;
                if (!firstLine) {
                    firstLine = tokensPositions[tokenPosition];
                    firstHash = hash;
                    firstToken = tokenPosition;
                }
            } else {
                if (isClone) {
                    addClone(
                        format.mode,
                        path,
                        firstHash,
                        firstToken,
                        tokenPosition,
                        firstLine,
                        tokensPositions[tokenPosition]
                    );
                    firstLine = null;
                    isClone = false;
                }
                addHash(format.mode, hash, {
                    path,
                    line: tokensPositions[tokenPosition]
                });
            }
            tokenPosition++;
        }
        this.push(chunk);
        return callback();
    });
}

export function report(): Transform {

    return through2.obj((chunk, encoding, callback) => {
        console.log(`[report] ${chunk.path}`);
        console.log(clones);
    });
}

export function cpdStream(stream: NodeJS.ReadableStream, options: IOptions) {
    stream
        .pipe(detectFiles())
        .pipe(readContent())
        .pipe(detectFormat())
        .pipe(tokenize())
        .pipe(generateMap())
        .pipe(findDuplicates());
}

export function cpd(options: IOptions) {
    const path = `./fixtures/**/*`;
    return cpdStream(create([path]), options);
}
