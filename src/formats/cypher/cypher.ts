// @TODO check this format, too many changes here

import {defineMIME, defineMode} from '../index';

const wordRegexp = function(words) {
    return new RegExp('^(?:' + words.join('|') + ')$', 'i');
};


defineMode('cypher', function(config) {
    const tokenBase = function(stream/*, state*/) {
        const ch = stream.next();
        if (ch === '"') {
            stream.match(/.*?"/);
            return 'string';
        }
        if (ch === "'") {
            stream.match(/.*?'/);
            return 'string';
        }
        if (/[{}\(\),\.;\[\]]/.test(ch)) {
            curPunc = ch;
            return 'node';
        } else if (ch === '/' && stream.eat('/')) {
            stream.skipToEnd();
            return 'comment';
        } else if (operatorChars.test(ch)) {
            stream.eatWhile(operatorChars);
            return null;
        } else {
            stream.eatWhile(/[_\w\d]/);
            if (stream.eat(':')) {
                stream.eatWhile(/[\w\d_\-]/);
                return 'atom';
            }
            const word = stream.current();
            if (funcs.test(word)) return 'builtin';
            if (preds.test(word)) return 'def';
            if (keywords.test(word)) return 'keyword';
            return 'variable';
        }
    };
    const pushContext = function(state, type, col) {
        return state.context = {
            prev: state.context,
            indent: state.indent,
            col: col,
            type: type
        };
    };
    const popContext = function(state) {
        state.indent = state.context.indent;
        return state.context = state.context.prev;
    };
    const indentUnit = config.indentUnit;
    let curPunc;
    const funcs = wordRegexp(['abs', 'acos', 'allShortestPaths', 'asin', 'atan', 'atan2', 'avg', 'ceil', 'coalesce', 'collect', 'cos', 'cot', 'count', 'degrees', 'e', 'endnode', 'exp', 'extract', 'filter', 'floor', 'haversin', 'head', 'id', 'keys', 'labels', 'last', 'left', 'length', 'log', 'log10', 'lower', 'ltrim', 'max', 'min', 'node', 'nodes', 'percentileCont', 'percentileDisc', 'pi', 'radians', 'rand', 'range', 'reduce', 'rel', 'relationship', 'relationships', 'replace', 'reverse', 'right', 'round', 'rtrim', 'shortestPath', 'sign', 'sin', 'size', 'split', 'sqrt', 'startnode', 'stdev', 'stdevp', 'str', 'substring', 'sum', 'tail', 'tan', 'timestamp', 'toFloat', 'toInt', 'toString', 'trim', 'type', 'upper']);
    const preds = wordRegexp(['all', 'and', 'any', 'contains', 'exists', 'has', 'in', 'none', 'not', 'or', 'single', 'xor']);
    const keywords = wordRegexp(['as', 'asc', 'ascending', 'assert', 'by', 'case', 'commit', 'constraint', 'create', 'csv', 'cypher', 'delete', 'desc', 'descending', 'detach', 'distinct', 'drop', 'else', 'end', 'ends', 'explain', 'false', 'fieldterminator', 'foreach', 'from', 'headers', 'in', 'index', 'is', 'join', 'limit', 'load', 'match', 'merge', 'null', 'on', 'optional', 'order', 'periodic', 'profile', 'remove', 'return', 'scan', 'set', 'skip', 'start', 'starts', 'then', 'true', 'union', 'unique', 'unwind', 'using', 'when', 'where', 'with', 'call', 'yield']);
    const operatorChars = /[*+\-<>=&|~%^]/;

    return {
        startState: function(/*base*/) {
            return {
                tokenize: tokenBase,
                context: null,
                indent: 0,
                col: 0
            };
        },
        token: function(stream, state) {
            if (stream.sol()) {
                if (state.context && (state.context.align == null)) {
                    state.context.align = false;
                }
                state.indent = stream.indentation();
            }
            if (stream.eatSpace()) {
                return null;
            }
            const style = state.tokenize(stream, state);
            if (style !== 'comment' && state.context && (state.context.align == null) && state.context.type !== 'pattern') {
                state.context.align = true;
            }
            if (curPunc === '(') {
                pushContext(state, ')', stream.column());
            } else if (curPunc === '[') {
                pushContext(state, ']', stream.column());
            } else if (curPunc === '{') {
                pushContext(state, '}', stream.column());
            } else if (/[\]\}\)]/.test(curPunc)) {
                while (state.context && state.context.type === 'pattern') {
                    popContext(state);
                }
                if (state.context && curPunc === state.context.type) {
                    popContext(state);
                }
            } else if (curPunc === '.' && state.context && state.context.type === 'pattern') {
                popContext(state);
            } else if (/atom|string|variable/.test(style) && state.context) {
                if (/[\}\]]/.test(state.context.type)) {
                    pushContext(state, 'pattern', stream.column());
                } else if (state.context.type === 'pattern' && !state.context.align) {
                    state.context.align = true;
                    state.context.col = stream.column();
                }
            }
            return style;
        },
        indent: function(state, textAfter) {
            const firstChar = textAfter && textAfter.charAt(0);
            let context = state.context;
            if (/[\]\}]/.test(firstChar)) {
                while (context && context.type === 'pattern') {
                    context = context.prev;
                }
            }
            const closing = context && firstChar === context.type;
            if (!context) return 0;
            // if (context.type === "keywords") {
            //     return commands.newlineAndIndent;
            // }
            if (context.align) return context.col + (closing ? 0 : 1);
            return context.indent + (closing ? 0 : indentUnit);
        }
    };
});
//
// modeExtensions["cypher"] = {
//     autoFormatLineBreaks: function (text) {
//         let i, lines, reProcessedPortion;
//         let lines = text.split("\n");
//         let reProcessedPortion = /\s+\b(return|where|order by|match|with|skip|limit|create|delete|set)\b\s/g;
//         for (let i = 0; i < lines.length; i++)
//             lines[i] = lines[i].replace(reProcessedPortion, " \n$1 ").trim();
//         return lines.join("\n");
//     }
// };

defineMIME('application/x-cypher-query', 'cypher');

