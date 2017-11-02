import {defineMIME, defineMode} from '../index';

defineMode('vb', function(conf, parserConf) {
    const ERRORCLASS = 'error';

    function wordRegexp(words) {
        return new RegExp('^((' + words.join(')|(') + '))\\b', 'i');
    }

    const singleOperators = new RegExp('^[\\+\\-\\*/%&\\\\|\\^~<>!]');
    const singleDelimiters = new RegExp('^[\\(\\)\\[\\]\\{\\}@,:`=;\\.]');
    const doubleOperators = new RegExp('^((==)|(<>)|(<=)|(>=)|(<>)|(<<)|(>>)|(//)|(\\*\\*))');
    const doubleDelimiters = new RegExp('^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))');
    const tripleDelimiters = new RegExp('^((//=)|(>>=)|(<<=)|(\\*\\*=))');
    const identifiers = new RegExp('^[_A-Za-z][_A-Za-z0-9]*');

    const openingKeywords = ['class', 'module', 'sub', 'enum', 'select', 'while', 'if', 'function', 'get', 'set', 'property', 'try'];
    const middleKeywords = ['else', 'elseif', 'case', 'catch'];
    const endKeywords = ['next', 'loop'];

    const operatorKeywords = ['and', 'or', 'not', 'xor', 'in'];
    const wordOperators = wordRegexp(operatorKeywords);
    const commonKeywords = ['as', 'dim', 'break', 'continue', 'optional', 'then', 'until',
        'goto', 'byval', 'byref', 'new', 'handles', 'property', 'return',
        'const', 'private', 'protected', 'friend', 'public', 'shared', 'static', 'true', 'false'];
    const commontypes = ['integer', 'string', 'double', 'decimal', 'boolean', 'short', 'char', 'float', 'single'];

    const keywords = wordRegexp(commonKeywords);
    const types = wordRegexp(commontypes);
    const stringPrefixes = '"';

    const opening = wordRegexp(openingKeywords);
    const middle = wordRegexp(middleKeywords);
    const closing = wordRegexp(endKeywords);
    const doubleClosing = wordRegexp(['end']);
    const doOpening = wordRegexp(['do']);

    const indentInfo = null;

    // @TODO: registerHelper
    // registerHelper("hintWords", "vb", openingKeywords.concat(middleKeywords).concat(endKeywords)
    //     .concat(operatorKeywords).concat(commonKeywords).concat(commontypes));

    function indent(_stream, state) {
        state.currentIndent++;
    }

    function dedent(_stream, state) {
        state.currentIndent--;
    }

    // tokenizers
    function tokenBase(stream, state) {
        if (stream.eatSpace()) {
            return null;
        }

        const ch = stream.peek();

        // Handle Comments
        if (ch === "'") {
            stream.skipToEnd();
            return 'comment';
        }


        // Handle Number Literals
        if (stream.match(/^((&H)|(&O))?[0-9\.a-f]/i, false)) {
            let floatLiteral = false;
            // Floats
            if (stream.match(/^\d*\.\d+F?/i)) {
                floatLiteral = true;
            } else if (stream.match(/^\d+\.\d*F?/)) {
                floatLiteral = true;
            } else if (stream.match(/^\.\d+F?/)) {
                floatLiteral = true;
            }

            if (floatLiteral) {
                // Float literals may be "imaginary"
                stream.eat(/J/i);
                return 'number';
            }
            // Integers
            let intLiteral = false;
            // Hex
            if (stream.match(/^&H[0-9a-f]+/i)) {
                intLiteral = true;
            } else if (stream.match(/^&O[0-7]+/i)) {
                intLiteral = true;
            } else if (stream.match(/^[1-9]\d*F?/)) {
                // Decimal literals may be "imaginary"
                stream.eat(/J/i);
                // TODO - Can you have imaginary longs?
                intLiteral = true;
            } else if (stream.match(/^0(?![\dx])/i)) {
                intLiteral = true;
            }
            if (intLiteral) {
                // Integer literals may be "long"
                stream.eat(/L/i);
                return 'number';
            }
        }

        // Handle Strings
        if (stream.match(stringPrefixes)) {
            state.tokenize = tokenStringFactory(stream.current());
            return state.tokenize(stream, state);
        }

        // Handle operators and Delimiters
        if (stream.match(tripleDelimiters) || stream.match(doubleDelimiters)) {
            return null;
        }
        if (stream.match(doubleOperators)
            || stream.match(singleOperators)
            || stream.match(wordOperators)) {
            return 'operator';
        }
        if (stream.match(singleDelimiters)) {
            return null;
        }
        if (stream.match(doOpening)) {
            indent(stream, state);
            state.doInCurrentLine = true;
            return 'keyword';
        }
        if (stream.match(opening)) {
            if (!state.doInCurrentLine) {
                indent(stream, state);
            } else {
                state.doInCurrentLine = false;
            }
            return 'keyword';
        }
        if (stream.match(middle)) {
            return 'keyword';
        }

        if (stream.match(doubleClosing)) {
            dedent(stream, state);
            dedent(stream, state);
            return 'keyword';
        }
        if (stream.match(closing)) {
            dedent(stream, state);
            return 'keyword';
        }

        if (stream.match(types)) {
            return 'keyword';
        }

        if (stream.match(keywords)) {
            return 'keyword';
        }

        if (stream.match(identifiers)) {
            return 'variable';
        }

        // Handle non-detected items
        stream.next();
        return ERRORCLASS;
    }

    function tokenStringFactory(delimiter) {
        const singleline = delimiter.length === 1;
        const OUTCLASS = 'string';

        return function(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"]/);
                if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors) {
                    return ERRORCLASS;
                } else {
                    state.tokenize = tokenBase;
                }
            }
            return OUTCLASS;
        };
    }


    function tokenLexer(stream, state) {
        let style = state.tokenize(stream, state);
        const current = stream.current();

        // Handle '.' connected identifiers
        if (current === '.') {
            style = state.tokenize(stream, state);
            if (style === 'variable') {
                return 'variable';
            } else {
                return ERRORCLASS;
            }
        }


        let delimiter_index = '[({'.indexOf(current);
        if (delimiter_index !== -1) {
            indent(stream, state);
        }
        if (indentInfo === 'dedent') {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }
        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index !== -1) {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }

        return style;
    }

    const external = {
        electricChars: 'dDpPtTfFeE ',
        startState: () => {
            return {
                tokenize: tokenBase,
                lastToken: null,
                currentIndent: 0,
                nextLineIndent: 0,
                doInCurrentLine: false


            };
        },

        token: (stream, state) => {
            if (stream.sol()) {
                state.currentIndent += state.nextLineIndent;
                state.nextLineIndent = 0;
                state.doInCurrentLine = 0;
            }
            const style = tokenLexer(stream, state);

            state.lastToken = {style: style, content: stream.current()};


            return style;
        },

        indent: (state, textAfter) => {
            const trueText = textAfter.replace(/^\s+|\s+$/g, '');
            if (trueText.match(closing) || trueText.match(doubleClosing) || trueText.match(middle)) {
                return conf.indentUnit * (state.currentIndent - 1);
            }
            if (state.currentIndent < 0) {
                return 0;
            }
            return state.currentIndent * conf.indentUnit;
        },

        lineComment: "'"
    };
    return external;
});

defineMIME('text/x-vb', 'vb');

