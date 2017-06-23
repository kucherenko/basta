import {defineMIME, defineMode} from '../index';
defineMode('pascal', function() {
    function words(str) {
        const obj = {}, words = str.split(' ');
        for (let i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    const keywords = words('and array begin case const div do downto else end file for forward integer ' +
        'boolean char function goto if in label mod nil not of or packed procedure ' +
        'program record repeat set string then to type until var while with');
    const atoms = {'null': true};

    const isOperatorChar = /[+\-*&%=<>!?|\/]/;

    function tokenBase(stream, state) {
        const ch = stream.next();
        if (ch == '#' && state.startOfLine) {
            stream.skipToEnd();
            return 'meta';
        }
        if (ch == '"' || ch == "'") {
            state.tokenize = tokenString(ch);
            return state.tokenize(stream, state);
        }
        if (ch == '(' && stream.eat('*')) {
            state.tokenize = tokenComment;
            return tokenComment(stream, state);
        }
        if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
            return null;
        }
        if (/\d/.test(ch)) {
            stream.eatWhile(/[\w\.]/);
            return 'number';
        }
        if (ch == '/') {
            if (stream.eat('/')) {
                stream.skipToEnd();
                return 'comment';
            }
        }
        if (isOperatorChar.test(ch)) {
            stream.eatWhile(isOperatorChar);
            return 'operator';
        }
        stream.eatWhile(/[\w\$_]/);
        const cur = stream.current();
        if (keywords.propertyIsEnumerable(cur)) return 'keyword';
        if (atoms.propertyIsEnumerable(cur)) return 'atom';
        return 'variable';
    }

    function tokenString(quote) {
        return function(stream, state) {
            let escaped = false, next, end = false;
            while ((next = stream.next()) != null) {
                if (next == quote && !escaped) {
                    end = true;
                    break;
                }
                escaped = !escaped && next == '\\';
            }
            if (end || !escaped) state.tokenize = null;
            return 'string';
        };
    }

    function tokenComment(stream, state) {
        let maybeEnd = false, ch;
        while (ch = stream.next()) {
            if (ch == ')' && maybeEnd) {
                state.tokenize = null;
                break;
            }
            maybeEnd = (ch == '*');
        }
        return 'comment';
    }

    // Interface

    return {
        startState: function() {
            return {tokenize: null};
        },

        token: function(stream, state) {
            if (stream.eatSpace()) return null;
            const style = (state.tokenize || tokenBase)(stream, state);
            if (style == 'comment' || style == 'meta') return style;
            return style;
        },

        electricChars: '{}'
    };
});

defineMIME('text/x-pascal', 'pascal');

