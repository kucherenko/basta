import {defineMIME, defineMode, getMode} from '../index';
import {multiplexingMode} from '../multiplex';


defineMode('twig:inner', () => {
    let keywords: any = ['and', 'as', 'autoescape', 'endautoescape', 'block', 'do', 'endblock', 'else', 'elseif', 'extends', 'for', 'endfor', 'embed', 'endembed', 'filter', 'endfilter', 'flush', 'from', 'if', 'endif', 'in', 'is', 'include', 'import', 'not', 'or', 'set', 'spaceless', 'endspaceless', 'with', 'endwith', 'trans', 'endtrans', 'blocktrans', 'endblocktrans', 'macro', 'endmacro', 'use', 'verbatim', 'endverbatim'];
    const operator = /^[+\-*&%=<>!?|~^]/;
    const sign = /^[:\[\(\{]/;
    let atom: any = ['true', 'false', 'null', 'empty', 'defined', 'divisibleby', 'divisible by', 'even', 'odd', 'iterable', 'sameas', 'same as'];
    const number = /^(\d[+\-\*\/])?\d+(\.\d+)?/;

    keywords = new RegExp('((' + keywords.join(')|(') + '))\\b');
    atom = new RegExp('((' + atom.join(')|(') + '))\\b');

    function tokenBase(stream, state) {
        let ch = stream.peek();

        //Comment
        if (state.incomment) {
            if (!stream.skipTo('#}')) {
                stream.skipToEnd();
            } else {
                stream.eatWhile(/\#|}/);
                state.incomment = false;
            }
            return 'comment';
            //Tag
        } else if (state.intag) {
            //After operator
            if (state.operator) {
                state.operator = false;
                if (stream.match(atom)) {
                    return 'atom';
                }
                if (stream.match(number)) {
                    return 'number';
                }
            }
            //After sign
            if (state.sign) {
                state.sign = false;
                if (stream.match(atom)) {
                    return 'atom';
                }
                if (stream.match(number)) {
                    return 'number';
                }
            }

            if (state.instring) {
                if (ch === state.instring) {
                    state.instring = false;
                }
                stream.next();
                return 'string';
            } else if (ch === "'" || ch === '"') {
                state.instring = ch;
                stream.next();
                return 'string';
            } else if (stream.match(state.intag + '}') || stream.eat('-') && stream.match(state.intag + '}')) {
                state.intag = false;
                return 'tag';
            } else if (stream.match(operator)) {
                state.operator = true;
                return 'operator';
            } else if (stream.match(sign)) {
                state.sign = true;
            } else {
                if (stream.eat(' ') || stream.sol()) {
                    if (stream.match(keywords)) {
                        return 'keyword';
                    }
                    if (stream.match(atom)) {
                        return 'atom';
                    }
                    if (stream.match(number)) {
                        return 'number';
                    }
                    if (stream.sol()) {
                        stream.next();
                    }
                } else {
                    stream.next();
                }

            }
            return 'variable';
        } else if (stream.eat('{')) {
            if (stream.eat('#')) {
                state.incomment = true;
                if (!stream.skipTo('#}')) {
                    stream.skipToEnd();
                } else {
                    stream.eatWhile(/\#|}/);
                    state.incomment = false;
                }
                return 'comment';
                //Open tag
            } else if (ch = stream.eat(/\{|%/)) {
                //Cache close tag
                state.intag = ch;
                if (ch === '{') {
                    state.intag = '}';
                }
                stream.eat('-');
                return 'tag';
            }
        }
        stream.next();
    }

    return {
        startState: () => ({}),
        token: (stream, state) => tokenBase(stream, state)
    };
});

defineMode('twig', (config, parserConfig) => {
    const twigInner = getMode(config, 'twig:inner');
    if (!parserConfig || !parserConfig.base) {
        return twigInner;
    }
    return multiplexingMode(
        getMode(config, parserConfig.base), {
            open: /\{[{#%]/, close: /[}#%]\}/, mode: twigInner, parseDelimiters: true
        }
    );
});
defineMIME('text/x-twig', 'twig');
