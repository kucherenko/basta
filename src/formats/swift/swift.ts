import {defineMIME, defineMode} from '../index';

function wordSet(words) {
    const set = {};
    for (let i = 0; i < words.length; i++) {
        set[words[i]] = true;
    }
    return set;
}

const keywords = wordSet(['_', 'var', 'let', 'class', 'enum', 'extension', 'import', 'protocol', 'struct', 'func', 'typealias', 'associatedtype',
    'open', 'public', 'internal', 'fileprivate', 'private', 'deinit', 'init', 'new', 'override', 'self', 'subscript', 'super',
    'convenience', 'dynamic', 'final', 'indirect', 'lazy', 'required', 'static', 'unowned', 'unowned(safe)', 'unowned(unsafe)', 'weak', 'as', 'is',
    'break', 'case', 'continue', 'default', 'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'switch', 'where', 'while',
    'defer', 'return', 'inout', 'mutating', 'nonmutating', 'catch', 'do', 'rethrows', 'throw', 'throws', 'try', 'didSet', 'get', 'set', 'willSet',
    'assignment', 'associativity', 'infix', 'left', 'none', 'operator', 'postfix', 'precedence', 'precedencegroup', 'prefix', 'right',
    'Any', 'AnyObject', 'Type', 'dynamicType', 'Self', 'Protocol', '__COLUMN__', '__FILE__', '__FUNCTION__', '__LINE__']);
const definingKeywords = wordSet(['var', 'let', 'class', 'enum', 'extension', 'import', 'protocol', 'struct', 'func', 'typealias', 'associatedtype', 'for']);
const atoms = wordSet(['true', 'false', 'nil', 'self', 'super', '_']);
const types = wordSet(['Array', 'Bool', 'Character', 'Dictionary', 'Double', 'Float', 'Int', 'Int8', 'Int16', 'Int32', 'Int64', 'Never', 'Optional', 'Set', 'String',
    'UInt8', 'UInt16', 'UInt32', 'UInt64', 'Void']);
const operators = '+-/*%=|&<>~^?!';
const punc = ':;,.(){}[]';
const binary = /^\-?0b[01][01_]*/;
const octal = /^\-?0o[0-7][0-7_]*/;
const hexadecimal = /^\-?0x[\dA-Fa-f][\dA-Fa-f_]*(?:(?:\.[\dA-Fa-f][\dA-Fa-f_]*)?[Pp]\-?\d[\d_]*)?/;
const decimal = /^\-?\d[\d_]*(?:\.\d[\d_]*)?(?:[Ee]\-?\d[\d_]*)?/;
const identifier = /^\$\d+|(`?)[_A-Za-z][_A-Za-z$0-9]*\1/;
const property = /^\.(?:\$\d+|(`?)[_A-Za-z][_A-Za-z$0-9]*\1)/;
const instruction = /^\#[A-Za-z]+/;
const attribute = /^@(?:\$\d+|(`?)[_A-Za-z][_A-Za-z$0-9]*\1)/;
//let regexp = /^\/(?!\s)(?:\/\/)?(?:\\.|[^\/])+\//

function tokenBase(stream, state, prev) {
    if (stream.sol()) {
        state.indented = stream.indentation();
    }
    if (stream.eatSpace()) {
        return null;
    }

    const ch = stream.peek();
    if (ch === '/') {
        if (stream.match('//')) {
            stream.skipToEnd();
            return 'comment';
        }
        if (stream.match('/*')) {
            state.tokenize.push(tokenComment);
            return tokenComment(stream, state);
        }
    }
    if (stream.match(instruction)) {
        return 'builtin';
    }
    if (stream.match(attribute)) {
        return 'attribute';
    }
    if (stream.match(binary)) {
        return 'number';
    }
    if (stream.match(octal)) {
        return 'number';
    }
    if (stream.match(hexadecimal)) {
        return 'number';
    }
    if (stream.match(decimal)) {
        return 'number';
    }
    if (stream.match(property)) {
        return 'property';
    }
    if (operators.indexOf(ch) > -1) {
        stream.next();
        return 'operator';
    }
    if (punc.indexOf(ch) > -1) {
        stream.next();
        stream.match('..');
        return 'punctuation';
    }
    if (ch === '"' || ch === "'") {
        stream.next();
        const tokenize = tokenString(ch);
        state.tokenize.push(tokenize);
        return tokenize(stream, state);
    }

    if (stream.match(identifier)) {
        const ident = stream.current();
        if (types.hasOwnProperty(ident)) {
            return 'variable-2';
        }
        if (atoms.hasOwnProperty(ident)) {
            return 'atom';
        }
        if (keywords.hasOwnProperty(ident)) {
            if (definingKeywords.hasOwnProperty(ident)) {
                state.prev = 'define';
            }
            return 'keyword';
        }
        if (prev === 'define') {
            return 'def';
        }
        return 'variable';
    }

    stream.next();
    return null;
}

function tokenUntilClosingParen() {
    let depth = 0;
    return function(stream, state, prev) {
        const inner = tokenBase(stream, state, prev);
        if (inner === 'punctuation') {
            if (stream.current() === '(') {
                ++depth;
            } else if (stream.current() === ')') {
                if (depth === 0) {
                    stream.backUp(1);
                    state.tokenize.pop();
                    return state.tokenize[state.tokenize.length - 1](stream, state);
                } else {
                    --depth;
                }
            }
        }
        return inner;
    };
}

function tokenString(quote) {
    return function(stream, state) {
        let ch, escaped = false;
        while (ch = stream.next()) {
            if (escaped) {
                if (ch === '(') {
                    state.tokenize.push(tokenUntilClosingParen());
                    return 'string';
                }
                escaped = false;
            } else if (ch === quote) {
                break;
            } else {
                escaped = ch === '\\';
            }
        }
        state.tokenize.pop();
        return 'string';
    };
}

function tokenComment(stream, state) {
    stream.match(/^(?:[^*]|\*(?!\/))*/);
    if (stream.match('*/')) {
        state.tokenize.pop();
    }
    return 'comment';
}

function Context(prev, align, indented) {
    this.prev = prev;
    this.align = align;
    this.indented = indented;
}

function pushContext(state, stream) {
    const align = stream.match(/^\s*($|\/[\/\*])/, false) ? null : stream.column() + 1;
    state.context = new Context(state.context, align, state.indented);
}

function popContext(state) {
    if (state.context) {
        state.indented = state.context.indented;
        state.context = state.context.prev;
    }
}

defineMode('swift', function(config) {
    return {
        startState: () => {
            return {
                prev: null,
                context: null,
                indented: 0,
                tokenize: []
            };
        },

        token: (stream, state) => {
            const prev = state.prev;
            state.prev = null;
            const tokenize = state.tokenize[state.tokenize.length - 1] || tokenBase;
            const style = tokenize(stream, state, prev);
            if (!style || style === 'comment') {
                state.prev = prev;
            } else if (!state.prev) {
                state.prev = style;
            }

            if (style === 'punctuation') {
                const bracket = /[\(\[\{]|([\]\)\}])/.exec(stream.current());
                if (bracket) {
                    (bracket[1] ? popContext : pushContext)(state, stream);
                }
            }

            return style;
        },

        indent: (state, textAfter) => {
            const cx = state.context;
            if (!cx) {
                return 0;
            }
            const closing = /^[\]\}\)]/.test(textAfter);
            if (cx.align !== null) {
                return cx.align - (closing ? 1 : 0);
            }
            return cx.indented + (closing ? 0 : config.indentUnit);
        },

        electricInput: /^\s*[\)\}\]]$/,

        lineComment: '//',
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        fold: 'brace',
        closeBrackets: "()[]{}''\"\"``"
    };
});

defineMIME('text/x-swift', 'swift');
