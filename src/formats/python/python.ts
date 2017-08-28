import {defineMIME, defineMode} from '../index';
import {Pass} from '../misc';

function wordRegexp(words) {
    return new RegExp('^((' + words.join(')|(') + '))\\b');
}

const wordOperators = wordRegexp(['and', 'or', 'not', 'is']);
const commonKeywords = ['as', 'assert', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally',
    'for', 'from', 'global', 'if', 'import',
    'lambda', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield', 'in'];
const commonBuiltins = ['abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'callable', 'chr',
    'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
    'enumerate', 'eval', 'filter', 'float', 'format', 'frozenset',
    'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id',
    'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
    'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next',
    'object', 'oct', 'open', 'ord', 'pow', 'property', 'range',
    'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
    'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple',
    'type', 'vars', 'zip', '__import__', 'NotImplemented',
    'Ellipsis', '__debug__'];
// registerHelper("hintWords", "python", commonKeywords.concat(commonBuiltins));

function top(state) {
    return state.scopes[state.scopes.length - 1];
}

defineMode('python', function (conf, parserConf) {
    const ERRORCLASS = 'error';

    const singleDelimiters = parserConf.singleDelimiters || /^[()\[\]{}@,:`=;.]/;
    const doubleOperators = parserConf.doubleOperators || /^([!<>]==|<>|<<|>>|\/\/|\*\*)/;
    const doubleDelimiters = parserConf.doubleDelimiters || /^(\+=|-=|\*=|%=|\/=|&=|\|=|\^=)/;
    const tripleDelimiters = parserConf.tripleDelimiters || /^(\/\/=|>>=|<<=|\*\*=)/;

    const hangingIndent = parserConf.hangingIndent || conf.indentUnit;
    let singleOperators, identifiers, stringPrefixes;
    let myKeywords = commonKeywords, myBuiltins = commonBuiltins;
    if (parserConf.extra_keywords != undefined)
        myKeywords = myKeywords.concat(parserConf.extra_keywords);

    if (parserConf.extra_builtins != undefined)
        myBuiltins = myBuiltins.concat(parserConf.extra_builtins);

    const py3 = !(parserConf.version && Number(parserConf.version) < 3);
    if (py3) {
        // since http://legacy.python.org/dev/peps/pep-0465/ @ is also an operator
        singleOperators = parserConf.singleOperators || /^[+\-*\/%&|^~<>!@]/;
        identifiers = parserConf.identifiers || /^[_A-Za-z\u00A1-\uFFFF][_A-Za-z0-9\u00A1-\uFFFF]*/;
        myKeywords = myKeywords.concat(['nonlocal', 'False', 'True', 'None', 'async', 'await']);
        myBuiltins = myBuiltins.concat(['ascii', 'bytes', 'exec', 'print']);
        stringPrefixes = new RegExp("^(([rbuf]|(br))?('{3}|\"{3}|['\"]))", 'i');
    } else {
        singleOperators = parserConf.singleOperators || /^[+\-*\/%&|^~<>!]/;
        identifiers = parserConf.identifiers || /^[_A-Za-z][_A-Za-z0-9]*/;
        myKeywords = myKeywords.concat(['exec', 'print']);
        myBuiltins = myBuiltins.concat(['apply', 'basestring', 'buffer', 'cmp', 'coerce', 'execfile',
            'file', 'intern', 'long', 'raw_input', 'reduce', 'reload',
            'unichr', 'unicode', 'xrange', 'False', 'True', 'None']);
        stringPrefixes = new RegExp("^(([rubf]|(ur)|(br))?('{3}|\"{3}|['\"]))", 'i');
    }
    const keywords = wordRegexp(myKeywords);
    const builtins = wordRegexp(myBuiltins);

    // tokenizers
    function tokenBase(stream, state) {
        if (stream.sol()) state.indent = stream.indentation();
        // Handle scope changes
        if (stream.sol() && top(state).type == 'py') {
            const scopeOffset = top(state).offset;
            let style;
            if (stream.eatSpace()) {
                const lineOffset = stream.indentation();
                if (lineOffset > scopeOffset)
                    pushPyScope(state);
                else if (lineOffset < scopeOffset && dedent(stream, state) && stream.peek() != '#')
                    state.errorToken = true;
                return null;
            } else {
                style = tokenBaseInner(stream, state);
                if (scopeOffset > 0 && dedent(stream, state))
                    style += ' ' + ERRORCLASS;
                return style;
            }
        }
        return tokenBaseInner(stream, state);
    }

    function tokenBaseInner(stream, state) {
        if (stream.eatSpace()) return null;

        const ch = stream.peek();

        // Handle Comments
        if (ch == '#') {
            stream.skipToEnd();
            return 'comment';
        }

        // Handle Number Literals
        if (stream.match(/^[0-9.]/, false)) {
            let floatLiteral = false;
            // Floats
            if (stream.match(/^[\d_]*\.\d+(e[+\-]?\d+)?/i)) {
                floatLiteral = true;
            }
            if (stream.match(/^[\d_]+\.\d*/)) {
                floatLiteral = true;
            }
            if (stream.match(/^\.\d+/)) {
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
            if (stream.match(/^0x[0-9a-f_]+/i)) intLiteral = true;
            // Binary
            if (stream.match(/^0b[01_]+/i)) intLiteral = true;
            // Octal
            if (stream.match(/^0o[0-7_]+/i)) intLiteral = true;
            // Decimal
            if (stream.match(/^[1-9][\d_]*(e[+\-]?[\d_]+)?/)) {
                // Decimal literals may be "imaginary"
                stream.eat(/J/i);
                // TODO - Can you have imaginary longs?
                intLiteral = true;
            }
            // Zero by itself with no other piece of number.
            if (stream.match(/^0(?![\dx])/i)) intLiteral = true;
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
        if (stream.match(tripleDelimiters) || stream.match(doubleDelimiters))
            return 'punctuation';

        if (stream.match(doubleOperators) || stream.match(singleOperators))
            return 'operator';

        if (stream.match(singleDelimiters))
            return 'punctuation';

        if (state.lastToken == '.' && stream.match(identifiers))
            return 'property';

        if (stream.match(keywords) || stream.match(wordOperators))
            return 'keyword';

        if (stream.match(builtins))
            return 'builtin';

        if (stream.match(/^(self|cls)\b/))
            return 'variable-2';

        if (stream.match(identifiers)) {
            if (state.lastToken == 'def' || state.lastToken == 'class')
                return 'def';
            return 'variable';
        }

        // Handle non-detected items
        stream.next();
        return ERRORCLASS;
    }

    function tokenStringFactory(delimiter) {
        while ('rubf'.indexOf(delimiter.charAt(0).toLowerCase()) >= 0) {
            delimiter = delimiter.substr(1);
        }

        const singleline = delimiter.length == 1;
        const OUTCLASS = 'string';

        function tokenString(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"\\]/);
                if (stream.eat('\\')) {
                    stream.next();
                    if (singleline && stream.eol())
                        return OUTCLASS;
                } else if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors)
                    return ERRORCLASS;
                else
                    state.tokenize = tokenBase;
            }
            return OUTCLASS;
        }

        tokenString['isString'] = true;
        return tokenString;
    }

    function pushPyScope(state) {
        while (top(state).type != 'py') state.scopes.pop();
        state.scopes.push({
            offset: top(state).offset + conf.indentUnit,
            type: 'py',
            align: null
        });
    }

    function pushBracketScope(stream, state, type) {
        const align = stream.match(/^([\s\[{(]|#.*)*$/, false) ? null : stream.column() + 1;
        state.scopes.push({
            offset: state.indent + hangingIndent,
            type: type,
            align: align
        });
    }

    function dedent(stream, state) {
        const indented = stream.indentation();
        while (state.scopes.length > 1 && top(state).offset > indented) {
            if (top(state).type != 'py') return true;
            state.scopes.pop();
        }
        return top(state).offset != indented;
    }

    function tokenLexer(stream, state) {
        if (stream.sol()) state.beginningOfLine = true;

        let style = state.tokenize(stream, state);
        const current = stream.current();

        // Handle decorators
        if (state.beginningOfLine && current == '@')
            return stream.match(identifiers, false) ? 'meta' : py3 ? 'operator' : ERRORCLASS;

        if (/\S/.test(current)) state.beginningOfLine = false;

        if ((style == 'variable' || style == 'builtin')
            && state.lastToken == 'meta')
            style = 'meta';

        // Handle scope changes.
        if (current == 'pass' || current == 'return')
            state.dedent += 1;

        if (current == 'lambda') state.lambda = true;
        if (current == ':' && !state.lambda && top(state).type == 'py')
            pushPyScope(state);

        let delimiter_index = current.length == 1 ? '[({'.indexOf(current) : -1;
        if (delimiter_index != -1)
            pushBracketScope(stream, state, '])}'.slice(delimiter_index, delimiter_index + 1));

        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index != -1) {
            if (top(state).type == current) state.indent = state.scopes.pop().offset - hangingIndent;
            else return ERRORCLASS;
        }
        if (state.dedent > 0 && stream.eol() && top(state).type == 'py') {
            if (state.scopes.length > 1) state.scopes.pop();
            state.dedent -= 1;
        }

        return style;
    }

    return {
        startState: function (basecolumn) {
            return {
                tokenize: tokenBase,
                scopes: [{offset: basecolumn || 0, type: 'py', align: null}],
                indent: basecolumn || 0,
                lastToken: null,
                lambda: false,
                dedent: 0
            };
        },

        token: function (stream, state) {
            const addErr = state.errorToken;
            if (addErr) state.errorToken = false;
            let style = tokenLexer(stream, state);

            if (style && style != 'comment') {
                state.lastToken = (style == 'keyword' || style == 'punctuation') ? stream.current() : style;
            }
            if (style == 'punctuation') {
                style = null;
            }

            if (stream.eol() && state.lambda)
                state.lambda = false;
            return addErr ? style + ' ' + ERRORCLASS : style;
        },

        indent: function (state, textAfter) {
            if (state.tokenize != tokenBase)
                return state.tokenize.isString ? Pass : 0;

            const scope = top(state), closing = scope.type == textAfter.charAt(0);
            if (scope.align != null)
                return scope.align - (closing ? 1 : 0);
            else
                return scope.offset - (closing ? hangingIndent : 0);
        },

        electricInput: /^\s*[}\])]$/,
        closeBrackets: {triples: "'\""},
        lineComment: '#',
        fold: 'indent'
    };
});

defineMIME('text/x-python', 'python');

const words = function (str) {
    return str.split(' ');
};

defineMIME('text/x-cython', {
    name: 'python',
    extra_keywords: words('by cdef cimport cpdef ctypedef enum except ' +
        'extern gil include nogil property public ' +
        'readonly struct union DEF IF ELIF ELSE')
});
