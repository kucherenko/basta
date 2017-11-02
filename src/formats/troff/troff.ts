import {defineMIME, defineMode} from '../index';

defineMode('troff', function() {

    const words = {};

    function tokenBase(stream) {
        if (stream.eatSpace()) {
            return null;
        }

        const sol = stream.sol();
        const ch = stream.next();

        if (ch === '\\') {
            if (stream.match('fB') || stream.match('fR') || stream.match('fI') ||
                stream.match('u') || stream.match('d') ||
                stream.match('%') || stream.match('&')) {
                return 'string';
            }
            if (stream.match('m[')) {
                stream.skipTo(']');
                stream.next();
                return 'string';
            }
            if (stream.match('s+') || stream.match('s-')) {
                stream.eatWhile(/[\d-]/);
                return 'string';
            }
            if (stream.match('\(') || stream.match('*\(')) {
                stream.eatWhile(/[\w-]/);
                return 'string';
            }
            return 'string';
        }
        if (sol && (ch === '.' || ch === '\'')) {
            if (stream.eat('\\') && stream.eat('\"')) {
                stream.skipToEnd();
                return 'comment';
            }
        }
        if (sol && ch === '.') {
            if (stream.match('B ') || stream.match('I ') || stream.match('R ')) {
                return 'attribute';
            }
            if (stream.match('TH ') || stream.match('SH ') || stream.match('SS ') || stream.match('HP ')) {
                stream.skipToEnd();
                return 'quote';
            }
            if ((stream.match(/[A-Z]/) && stream.match(/[A-Z]/)) || (stream.match(/[a-z]/) && stream.match(/[a-z]/))) {
                return 'attribute';
            }
        }
        stream.eatWhile(/[\w-]/);
        const cur = stream.current();
        return words.hasOwnProperty(cur) ? words[cur] : null;
    }

    function tokenize(stream, state) {
        return (state.tokens[0] || tokenBase)(stream, state);
    }

    return {
        startState: () => {
            return {tokens: []};
        },
        token: (stream, state) => {
            return tokenize(stream, state);
        }
    };
});

defineMIME('text/troff', 'troff');
defineMIME('text/x-troff', 'troff');
defineMIME('application/x-troff', 'troff');


