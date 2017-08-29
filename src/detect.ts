import {IOptions} from "./interfaces/options.interface";
import {generateTokenHash, isValidToken, TOKEN_HASH_LENGTH} from "./tokens";
import {runMode} from "./formats/index";
import {ISource} from "./interfaces/source.interface";
import {MapsMemory} from "./storage/maps.memory";
import {createHash} from "crypto";
import {IHash} from "./interfaces/hash.interface";
import {ClonesMemory} from "./storage/clones.memory";
import {IClone} from "./interfaces/clone.interface";

const maps = new MapsMemory();
const clones = new ClonesMemory();

export function detect(source: ISource, mode, content, options: IOptions) {
    const tokensLimit: number = options.minTokens || 70;
    const linesLimit: number = options.minLines || 5;
    const tokensPositions = [];
    const tokens = runMode(content, {mode, name: mode}, {}).filter(isValidToken);

    const addClone = (mode, file, hash, firstToken, lastToken, firstLine, lastLine) => {
        let fileA;
        let firstLineA;
        let numLines;
        const hashInfo: IHash = maps.getHash(hash, mode);
        fileA = hashInfo.source;
        firstLineA = hashInfo.line;
        numLines = lastLine + 1 - firstLine;
        if (numLines >= linesLimit && (fileA !== file || firstLineA !== firstLine)) {
            const first: ISource = {
                id: file,
                start: firstLine
            };
            const second: ISource = {
                id: fileA,
                start: firstLineA
            };
            const clone: IClone = {
                first,
                second,
                linesCount: numLines,
                tokensCount: lastToken - firstToken
            };
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


    while (tokenPosition <= tokensPositions.length - tokensLimit) {
        const mapFrame = map.substring(
            tokenPosition * TOKEN_HASH_LENGTH,
            tokenPosition * TOKEN_HASH_LENGTH + tokensLimit * TOKEN_HASH_LENGTH
        );
        const hash = createHash('md5').update(mapFrame).digest('hex');
        if (maps.hasHash(hash, mode)) {
            isClone = true;
            if (!firstLine) {
                firstLine = tokensPositions[tokenPosition];
                firstHash = hash;
                firstToken = tokenPosition;
            }
        } else {
            if (isClone) {
                addClone(
                    mode,
                    source,
                    firstHash,
                    firstToken,
                    tokenPosition,
                    firstLine,
                    tokensPositions[tokenPosition]
                );
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
}
