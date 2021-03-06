import {createHash} from "crypto";
import {IOptions} from "../options.interface";


export const TOKEN_TYPE_HASH_LENGTH = 3;
export const TOKEN_VALUE_HASH_LENGTH = 10;
export const TOKEN_HASH_LENGTH = TOKEN_TYPE_HASH_LENGTH + TOKEN_VALUE_HASH_LENGTH;

const tokenTypes = {};

export function validateToken(options: IOptions, mode) {
    return token => {
        let isValid = token.hasOwnProperty('type');
        if (!options.dontSkipComments) {
            isValid = isValid && token.type !== 'comment';
        }
        return isValid;
    };
}

export function generateTokenTypeHash(tokenType: string): string {
    if (!tokenTypes.hasOwnProperty(tokenType)) {
        tokenTypes[tokenType] = createHash('md5')
            .update(tokenType)
            .digest('hex')
            .substr(0, TOKEN_TYPE_HASH_LENGTH);
    }
    return tokenTypes[tokenType];
}

export function generateTokenValueHash(tokenValue: string): string {
    return createHash('md5')
        .update(tokenValue)
        .digest('hex')
        .substr(0, TOKEN_VALUE_HASH_LENGTH);
}

export function generateTokenHash(token): string {
    return generateTokenTypeHash(token.type) + generateTokenValueHash(token.value);
}
