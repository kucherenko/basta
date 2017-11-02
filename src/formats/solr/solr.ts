import {defineMIME, defineMode} from '../index';

defineMode('solr', function() {
    'use strict';

    const isStringChar = /[^\s\|\!\+\-\*\?\~\^\&\:\(\)\[\]\{\}\"\\]/;
    const isOperatorChar = /[\|\!\+\-\*\?\~\^\&]/;
    const isOperatorString = /^(OR|AND|NOT|TO)$/i;

    function isNumber(word) {
        return parseFloat(word).toString() === word;
    }

    function tokenString(quote) {
        return function(stream, state) {
            let escaped = false, next;
            while ((next = stream.next()) !== null) {
                if (next === quote && !escaped) {
                    break;
                }
                escaped = !escaped && next === '\\';
            }

            if (!escaped) {
                state.tokenize = tokenBase;
            }
            return 'string';
        };
    }

    function tokenOperator(operator) {
        return function(stream, state) {
            let style = 'operator';
            if (operator === '+') {
                style += ' positive';
            } else if (operator === '-') {
                style += ' negative';
            } else if (operator === '|') {
                stream.eat(/\|/);
            } else if (operator === '&') {
                stream.eat(/\&/);
            } else if (operator === '^') {
                style += ' boost';
            }

            state.tokenize = tokenBase;
            return style;
        };
    }

    function tokenWord(ch) {
        return function(stream, state) {
            let word = ch;
            while ((ch = stream.peek()) && ch.match(isStringChar) !== null) {
                word += stream.next();
            }

            state.tokenize = tokenBase;
            if (isOperatorString.test(word)) {
                return 'operator';
            } else if (isNumber(word)) {
                return 'number';
            } else if (stream.peek() === ':') {
                return 'field';
            } else {
                return 'string';
            }
        };
    }

    function tokenBase(stream, state) {
        const ch = stream.next();
        if (ch === '"') {
            state.tokenize = tokenString(ch);
        } else if (isOperatorChar.test(ch)) {
            state.tokenize = tokenOperator(ch);
        } else if (isStringChar.test(ch)) {
            state.tokenize = tokenWord(ch);
        }

        return (state.tokenize !== tokenBase) ? state.tokenize(stream, state) : null;
    }

    return {
        startState: () => {
            return {
                tokenize: tokenBase
            };
        },

        token: (stream, state) => {
            if (stream.eatSpace()) {
                return null;
            }
            return state.tokenize(stream, state);
        }
    };
});

defineMIME('text/x-solr', 'solr');

