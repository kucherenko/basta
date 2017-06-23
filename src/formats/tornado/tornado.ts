import '../htmlmixed/htmlmixed';

import {defineMIME, defineMode, getMode, overlayMode} from '../index';

defineMode('tornado:inner', function() {
    let keywords: any = ['and', 'as', 'assert', 'autoescape', 'block', 'break', 'class', 'comment', 'context',
        'continue', 'datetime', 'def', 'del', 'elif', 'else', 'end', 'escape', 'except',
        'exec', 'extends', 'false', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
        'include', 'is', 'json_encode', 'lambda', 'length', 'linkify', 'load', 'module',
        'none', 'not', 'or', 'pass', 'print', 'put', 'raise', 'raw', 'return', 'self', 'set',
        'squeeze', 'super', 'true', 'try', 'url_escape', 'while', 'with', 'without', 'xhtml_escape', 'yield'];
    keywords = new RegExp('^((' + keywords.join(')|(') + '))\\b');

    function tokenBase(stream, state) {
        stream.eatWhile(/[^\{]/);
        let ch = stream.next();
        if (ch == '{') {
            if (ch = stream.eat(/\{|%|#/)) {
                state.tokenize = inTag(ch);
                return 'tag';
            }
        }
    }

    function inTag(close) {
        if (close == '{') {
            close = '}';
        }
        return function(stream, state) {
            const ch = stream.next();
            if ((ch == close) && stream.eat('}')) {
                state.tokenize = tokenBase;
                return 'tag';
            }
            if (stream.match(keywords)) {
                return 'keyword';
            }
            return close == '#' ? 'comment' : 'string';
        };
    }

    return {
        startState: function() {
            return {tokenize: tokenBase};
        },
        token: function(stream, state) {
            return state.tokenize(stream, state);
        }
    };
});

defineMode('tornado', function(config) {
    const htmlBase = getMode(config, 'text/html');
    const tornadoInner = getMode(config, 'tornado:inner');
    return overlayMode(htmlBase, tornadoInner);
});

defineMIME('text/x-tornado', 'tornado');
