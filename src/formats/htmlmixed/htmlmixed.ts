import {copyState, defineMIME, defineMode, getMode, startState} from '../index';
import {Pass} from '../misc';
import '../xml/xml';
import '../javascript/javascript';
import '../css/css';

const defaultTags = {
    script: [
        ['lang', /(javascript|babel)/i, 'javascript'],
        ['type', /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i, 'javascript'],
        ['type', /./, 'text/plain'],
        [null, null, 'javascript']
    ],
    style: [
        ['lang', /^css$/i, 'css'],
        ['type', /^(text\/)?(x-)?(stylesheet|css)$/i, 'css'],
        ['type', /./, 'text/plain'],
        [null, null, 'css']
    ]
};

function maybeBackup(stream, pat, style) {
    const cur = stream.current();
    const close = cur.search(pat);
    if (close > -1) {
        stream.backUp(cur.length - close);
    } else if (cur.match(/<\/?$/)) {
        stream.backUp(cur.length);
        if (!stream.match(pat, false)) {
            stream.match(cur);
        }
    }
    return style;
}

const attrRegexpCache = {};
function getAttrRegexp(attr) {
    const regexp = attrRegexpCache[attr];
    if (regexp) {
        return regexp;
    }
    return attrRegexpCache[attr] = new RegExp('\\s+' + attr + "\\s*=\\s*('|\")?([^'\"]+)('|\")?\\s*");
}

function getAttrValue(text, attr) {
    const match = text.match(getAttrRegexp(attr));
    return match ? /^\s*(.*?)\s*$/.exec(match[2])[1] : '';
}

function getTagRegexp(tagName, anchored) {
    return new RegExp((anchored ? '^' : '') + '<\/\s*' + tagName + '\s*>', 'i');
}

function addTags(from, to) {
    for (const tag in from) {
        const dest = to[tag] || (to[tag] = []);
        const source = from[tag];
        for (let i = source.length - 1; i >= 0; i--) {
            dest.unshift(source[i]);
        }
    }
}

function findMatchingMode(tagInfo, tagText) {
    for (let i = 0; i < tagInfo.length; i++) {
        const spec = tagInfo[i];
        if (!spec[0] || spec[1].test(getAttrValue(tagText, spec[0]))) {
            return spec[2];
        }
    }
}

defineMode('htmlmixed', (config, parserConfig) => {
    const htmlMode = getMode(config, {
        name: 'xml',
        mode: 'xml',
        htmlMode: true,
        multilineTagIndentFactor: parserConfig.multilineTagIndentFactor,
        multilineTagIndentPastTag: parserConfig.multilineTagIndentPastTag
    });

    const tags = {};
    const configTags = parserConfig && parserConfig.tags, configScript = parserConfig && parserConfig.scriptTypes;
    addTags(defaultTags, tags);
    if (configTags) addTags(configTags, tags);
    if (configScript) for (let i = configScript.length - 1; i >= 0; i--)
        tags['script'].unshift(['type', configScript[i].matches, configScript[i].mode]);

    function html(stream, state) {
        const style = htmlMode.token(stream, state.htmlState);
        const tag = /\btag\b/.test(style);
        let tagName;
        if (tag && !/[<>\s\/]/.test(stream.current()) &&
            (tagName = state.htmlState.tagName && state.htmlState.tagName.toLowerCase()) &&
            tags.hasOwnProperty(tagName)) {
            state.inTag = tagName + ' ';
        } else if (state.inTag && tag && />$/.test(stream.current())) {
            const inTag = /^([\S]+) (.*)/.exec(state.inTag);
            state.inTag = null;
            const modeSpec = stream.current() == '>' && findMatchingMode(tags[inTag[1]], inTag[2]);
            const mode = getMode(config, {mode: modeSpec});
            const endTagA = getTagRegexp(inTag[1], true);
            const endTag = getTagRegexp(inTag[1], false);
            state.token = (stream, state) => {
                if (stream.match(endTagA, false)) {
                    state.token = html;
                    state.localState = state.localMode = null;
                    return null;
                }
                return maybeBackup(stream, endTag, state.localMode.token(stream, state.localState));
            };
            state.localMode = mode;
            state.localState = startState(mode, htmlMode.indent(state.htmlState, ''));
        } else if (state.inTag) {
            state.inTag += stream.current();
            if (stream.eol()) {
                state.inTag += ' ';
            }
        }
        return style;
    }

    return {
        startState: () => {
            const state = startState(htmlMode);
            return {token: html, inTag: null, localMode: null, localState: null, htmlState: state};
        },

        copyState: state => {
            let local;
            if (state.localState) {
                local = copyState(state.localMode, state.localState);
            }
            return {
                token: state.token, inTag: state.inTag,
                localMode: state.localMode, localState: local,
                htmlState: copyState(htmlMode, state.htmlState)
            };
        },

        token: (stream, state) => state.token(stream, state),

        indent: (state, textAfter, line) => {
            if (!state.localMode || /^\s*<\//.test(textAfter)) {
                return htmlMode.indent(state.htmlState, textAfter);
            } else if (state.localMode.indent) {
                return state.localMode.indent(state.localState, textAfter, line);
            } else {
                return Pass;
            }
        },

        innerMode: state => ({state: state.localState || state.htmlState, mode: state.localMode || htmlMode})
    };
}, 'xml', 'javascript', 'css');

defineMIME('text/html', 'htmlmixed');
