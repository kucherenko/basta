import {IOptions} from "./interfaces/options.interface";
import {generateTokenHash, isValidToken, TOKEN_HASH_LENGTH} from "./tokens";
import {runMode} from "./formats/index";
import {ISource} from "./interfaces/source.interface";
import {createHash} from "crypto";
import {IHash} from "./interfaces/hash.interface";
import {IClone} from "./interfaces/clone.interface";
import {getClonesStorage, getMapsStorage, getStatisticStorage} from "./storage/";
import {IMaps} from "./interfaces/maps.interface";
import {IClones} from "./interfaces/clones.interface";
import { IStatistic } from "./interfaces/statistic.interface";

export function detect(source: ISource, mode, content, options: IOptions) {
    const maps: IMaps = getMapsStorage({});
    const clones: IClones = getClonesStorage({});
    const statistic: IStatistic = getStatisticStorage({});

    const tokensLimit: number = options.minTokens || 70;
    const linesLimit: number = options.minLines || 5;
    const tokensPositions = [];
    const tokens = runMode(content, {mode, name: mode}, {}).filter(isValidToken);

    const addClone = (lastToken, firstLine, lastLine) => {
        const hashInfo: IHash = maps.getHash(firstHash, mode);
        const numLines = lastLine + 1 - firstLine;
        if (numLines >= linesLimit && (hashInfo.source.id !== source.id || hashInfo.line !== firstLine)) {
            const first: ISource = {...source, start: firstLine};
            const second: ISource = {...hashInfo.source, start: hashInfo.line};
            const clone: IClone = {
                first,
                second,
                linesCount: numLines,
                tokensCount: lastToken - firstToken,
                mode,
                content: content.toString().split("\n").slice(firstLine, lastLine).join("\n")
            };
            statistic.addDuplicated(mode, source, numLines);
            clones.saveClone(clone);
        }
    };

    let map = '';
    let firstLine = null;
    let firstHash = null;
    let firstToken = null;
    let tokenPosition = 0;
    let isClone = false;

    tokens.forEach((token) => {
        tokensPositions.push(token.line);
        map += generateTokenHash(token);
    });

    if (tokensPositions.length) {
      statistic.addTotal(mode, source, tokensPositions[tokensPositions.length - 1])
    }

    while (tokenPosition <= tokensPositions.length - tokensLimit) {
        const mapFrame = map.substring(
            tokenPosition * TOKEN_HASH_LENGTH,
            tokenPosition * TOKEN_HASH_LENGTH + tokensLimit * TOKEN_HASH_LENGTH
        );
        const hash = createHash('md5').update(mapFrame).digest('hex').substr(0, 10);

        if (maps.hasHash(hash, mode)) {
            isClone = true;
            if (!firstLine) {
                firstLine = tokensPositions[tokenPosition];
                firstHash = hash;
                firstToken = tokenPosition;
            }
        } else {
            if (isClone) {
                addClone(tokenPosition, firstLine, tokensPositions[tokenPosition]);
                firstLine = null;
                isClone = false;
            }
            maps.addHash(hash, mode, {
                source,
                line: tokensPositions[tokenPosition]
            });
        }
        tokenPosition++;
    }
    if (isClone) {
        addClone(tokenPosition - 1, firstLine, tokensPositions[tokenPosition - 1]);
    }
}
