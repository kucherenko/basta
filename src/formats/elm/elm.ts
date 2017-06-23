import {defineMIME, defineMode} from '../index';

defineMode('elm', function() {

    function switchState(source, setState, f) {
        setState(f);
        return f(source, setState);
    }

    // These should all be Unicode extended, as per the Haskell 2010 report
    const smallRE = /[a-z_]/;
    const largeRE = /[A-Z]/;
    const digitRE = /[0-9]/;
    const hexitRE = /[0-9A-Fa-f]/;
    const octitRE = /[0-7]/;
    const idRE = /[a-z_A-Z0-9\']/;
    const symbolRE = /[-!#$%&*+.\/<=>?@\\^|~:\u03BB\u2192]/;
    const specialRE = /[(),;[\]`{}]/;
    const whiteCharRE = /[ \t\v\f]/; // newlines are handled in tokenizer

    function normal() {
        return function(source, setState) {
            if (source.eatWhile(whiteCharRE)) {
                return null;
            }

            const ch = source.next();
            if (specialRE.test(ch)) {
                if (ch == '{' && source.eat('-')) {
                    let t = 'comment';
                    if (source.eat('#')) t = 'meta';
                    return switchState(source, setState, ncomment(t, 1));
                }
                return null;
            }

            if (ch == '\'') {
                if (source.eat('\\'))
                    source.next();  // should handle other escapes here
                else
                    source.next();

                if (source.eat('\''))
                    return 'string';
                return 'error';
            }

            if (ch == '"') {
                return switchState(source, setState, stringLiteral);
            }

            if (largeRE.test(ch)) {
                source.eatWhile(idRE);
                if (source.eat('.'))
                    return 'qualifier';
                return 'variable-2';
            }

            if (smallRE.test(ch)) {
                const isDef = source.pos === 1;
                source.eatWhile(idRE);
                return isDef ? 'type' : 'variable';
            }

            if (digitRE.test(ch)) {
                if (ch == '0') {
                    if (source.eat(/[xX]/)) {
                        source.eatWhile(hexitRE); // should require at least 1
                        return 'integer';
                    }
                    if (source.eat(/[oO]/)) {
                        source.eatWhile(octitRE); // should require at least 1
                        return 'number';
                    }
                }
                source.eatWhile(digitRE);
                let t = 'number';
                if (source.eat('.')) {
                    t = 'number';
                    source.eatWhile(digitRE); // should require at least 1
                }
                if (source.eat(/[eE]/)) {
                    t = 'number';
                    source.eat(/[-+]/);
                    source.eatWhile(digitRE); // should require at least 1
                }
                return t;
            }

            if (symbolRE.test(ch)) {
                if (ch == '-' && source.eat(/-/)) {
                    source.eatWhile(/-/);
                    if (!source.eat(symbolRE)) {
                        source.skipToEnd();
                        return 'comment';
                    }
                }
                source.eatWhile(symbolRE);
                return 'builtin';
            }

            return 'error';
        };
    }

    function ncomment(type, nest) {
        if (nest == 0) {
            return normal();
        }
        return function(source, setState) {
            let currNest = nest;
            while (!source.eol()) {
                const ch = source.next();
                if (ch == '{' && source.eat('-')) {
                    ++currNest;
                } else if (ch == '-' && source.eat('}')) {
                    --currNest;
                    if (currNest == 0) {
                        setState(normal());
                        return type;
                    }
                }
            }
            setState(ncomment(type, currNest));
            return type;
        };
    }

    function stringLiteral(source, setState) {
        while (!source.eol()) {
            const ch = source.next();
            if (ch == '"') {
                setState(normal());
                return 'string';
            }
            if (ch == '\\') {
                if (source.eol() || source.eat(whiteCharRE)) {
                    setState(stringGap);
                    return 'string';
                }
                if (!source.eat('&')) source.next(); // should handle other escapes here
            }
        }
        setState(normal());
        return 'error';
    }

    function stringGap(source, setState) {
        if (source.eat('\\')) {
            return switchState(source, setState, stringLiteral);
        }
        source.next();
        setState(normal());
        return 'error';
    }


    const wellKnownWords = (function() {
        const wkw = {};

        const keywords = [
            'case', 'of', 'as',
            'if', 'then', 'else',
            'let', 'in',
            'infix', 'infixl', 'infixr',
            'type', 'alias',
            'input', 'output', 'foreign', 'loopback',
            'module', 'where', 'import', 'exposing',
            '_', '..', '|', ':', '=', '\\', '"', '->', '<-'
        ];

        for (let i = keywords.length; i--;)
            wkw[keywords[i]] = 'keyword';

        return wkw;
    })();


    return {
        startState: function() {
            return {f: normal()};
        },
        copyState: function(s) {
            return {f: s.f};
        },

        token: function(stream, state) {
            const t = state.f(stream, function(s) {
                state.f = s;
            });
            const w = stream.current();
            return (wellKnownWords.hasOwnProperty(w)) ? wellKnownWords[w] : t;
        }
    };

});

defineMIME('text/x-elm', 'elm');
