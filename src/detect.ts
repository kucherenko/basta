import {createHash} from "crypto";
import {runMode} from "./formats/";
import {IOptions} from "./options.interface";
import {ISource} from "./source.interface";
import {IHash} from "./hash.interface";
import {IClone} from "./clone.interface";
import {IMaps} from "./storage/maps.interface";
import {IClones} from "./storage/clones.interface";
import {IStatistic} from "./storage/statistic.interface";
import {getClonesStorage, getMapsStorage, getStatisticStorage} from "./storage/";
import {generateTokenHash, TOKEN_HASH_LENGTH, validateToken} from "./tokens/";
import {findModeByMIME, findModeByName} from "./formats/meta";


function getCloneBody(content, firstLine, lastLine) {
    return content.toString().split("\n").slice(firstLine - 1, lastLine).join("\n");
}

function addClone(content, source: ISource, mode, firstToken, lastToken, firstLine, lastLine, firstHash, linesLimit, options) {
    const maps: IMaps = getMapsStorage(options);
    const statistic: IStatistic = getStatisticStorage(options);
    const clones: IClones = getClonesStorage(options);
    const hashInfo: IHash = maps.getHash(firstHash, mode.name);
    const numLines = lastLine - firstLine;

    if (numLines >= linesLimit && (hashInfo.source.id !== source.id || hashInfo.line !== firstLine)) {
        const first: ISource = {...source, start: firstLine};
        const second: ISource = {...hashInfo.source, start: hashInfo.line};
        const clone: IClone = {
            first,
            second,
            linesCount: numLines,
            tokensCount: lastToken - firstToken,
            mode: mode.name,
            content: getCloneBody(content, firstLine, lastLine)
        };
        statistic.addDuplicated(mode.name, numLines);
        clones.saveClone(clone);
    }
}

export function detectByMap(source: ISource, mode, content, map, tokensPositions: number[], options: IOptions) {
    const maps: IMaps = getMapsStorage(options);
    const statistic: IStatistic = getStatisticStorage(options);
    const tokensLimit: number = options.minTokens;
    const linesLimit: number = options.minLines;


    let firstLine = null;
    let firstHash = null;
    let firstToken = null;
    let tokenPosition = 0;
    let isClone = false;

    if (tokensPositions.length) {
        statistic.addTotal(mode.name, tokensPositions[tokensPositions.length - 1]);
    }

    while (tokenPosition <= tokensPositions.length - tokensLimit) {
        const mapFrame = map.substring(
            tokenPosition * TOKEN_HASH_LENGTH,
            tokenPosition * TOKEN_HASH_LENGTH + tokensLimit * TOKEN_HASH_LENGTH
        );
        const hash = createHash('md5').update(mapFrame).digest('hex').substring(0, 10);
        // console.log(hash);
        if (maps.hasHash(hash, mode.name)) {
            isClone = true;
            if (!firstLine) {
                firstLine = tokensPositions[tokenPosition];
                firstHash = hash;
                firstToken = tokenPosition;
            }
        } else {
            if (isClone) {
                addClone(
                    content,
                    source,
                    mode,
                    firstToken,
                    tokenPosition + tokensLimit - 1,
                    firstLine,
                    tokensPositions[tokenPosition + tokensLimit -1],
                    firstHash,
                    linesLimit,
                    options
                );
                firstLine = null;
                isClone = false;
            }
            maps.addHash(hash, mode.name, {
                source,
                line: tokensPositions[tokenPosition]
            });
        }
        tokenPosition++;
    }
    // console.log(source.id);
    if (isClone) {
        addClone(
            content,
            source,
            mode,
            firstToken,
            tokensPositions.length - 1,
            firstLine,
            tokensPositions[tokensPositions.length - 1],
            firstHash,
            linesLimit,
            options
        );
    }

}

export function generateMap(content, mode, options: IOptions) {
    const tokensPositions = [];

    let map = '';

    runMode(content, mode, {}).filter(validateToken(options, mode)).forEach((token) => {
        tokensPositions.push(token.line + 1);
        map += generateTokenHash(token);
    });

    return {map, tokensPositions};
}

export function detect(source: ISource, format, content, options: IOptions) {
    const mode = format.name ? format : findModeByName(format) || findModeByMIME(format);

    const {map, tokensPositions} = generateMap(content, mode, options);

    detectByMap(
        source,
        mode,
        content,
        map,
        tokensPositions,
        options
    );
}
