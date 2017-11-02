import {defineMIME, defineMode} from '../index';

defineMode('tiddlywiki', () => {
    // Tokenizer
    const textwords = {};

    const keywords = {
        'allTags': true, 'closeAll': true, 'list': true,
        'newJournal': true, 'newTiddler': true,
        'permaview': true, 'saveChanges': true,
        'search': true, 'slider': true, 'tabs': true,
        'tag': true, 'tagging': true, 'tags': true,
        'tiddler': true, 'timeline': true,
        'today': true, 'version': true, 'option': true,
        'with': true, 'filter': true
    };

    const isSpaceName = /[\w_\-]/i;
    const reHR = /^\-\-\-\-+$/;
// <hr>
    const reWikiCommentStart = /^\/\*\*\*$/;
// /***
    const reWikiCommentStop = /^\*\*\*\/$/;
// ***/
    const reBlockQuote = /^<<<$/;
    const reJsCodeStart = /^\/\/\{\{\{$/;
// //{{{ js block start
    const reJsCodeStop = /^\/\/\}\}\}$/;
// //}}} js stop
    const reXmlCodeStart = /^<!--\{\{\{-->$/;
// xml block start
    const reXmlCodeStop = /^<!--\}\}\}-->$/;
// xml stop
    const reCodeBlockStart = /^\{\{\{$/;
// {{{ TW text div block start
    const reCodeBlockStop = /^\}\}\}$/;
// }}} TW text stop
    const reUntilCodeStop = /.*?\}\}\}/;


    function chain(stream, state, f) {
        state.tokenize = f;
        return f(stream, state);
    }

    function tokenBase(stream, state) {
        const sol = stream.sol();
        const ch = stream.peek();

        state.block = false;        // indicates the start of a code block.

        // check start of  blocks
        if (sol && /[<\/\*{}\-]/.test(ch)) {
            if (stream.match(reCodeBlockStart)) {
                state.block = true;
                return chain(stream, state, twTokenCode);
            }
            if (stream.match(reBlockQuote)) {
                return 'quote';
            }
            if (stream.match(reWikiCommentStart) || stream.match(reWikiCommentStop)) {
                return 'comment';
            }
            if (stream.match(reJsCodeStart) || stream.match(reJsCodeStop) || stream.match(reXmlCodeStart) || stream.match(reXmlCodeStop)) {
                return 'comment';
            }
            if (stream.match(reHR)) {
                return 'hr';
            }
        }

        stream.next();
        if (sol && /[\/\*!#;:>|]/.test(ch)) {
            if (ch === '!') { // tw header
                stream.skipToEnd();
                return 'header';
            }
            if (ch === '*') { // tw list
                stream.eatWhile('*');
                return 'comment';
            }
            if (ch === '#') { // tw numbered list
                stream.eatWhile('#');
                return 'comment';
            }
            if (ch === ';') { // definition list, term
                stream.eatWhile(';');
                return 'comment';
            }
            if (ch === ':') { // definition list, description
                stream.eatWhile(':');
                return 'comment';
            }
            if (ch === '>') { // single line quote
                stream.eatWhile('>');
                return 'quote';
            }
            if (ch === '|') {
                return 'header';
            }
        }

        if (ch === '{' && stream.match(/\{\{/)) {
            return chain(stream, state, twTokenCode);
        }

        // rudimentary html:// file:// link matching. TW knows much more ...
        if (/[hf]/i.test(ch) &&
            /[ti]/i.test(stream.peek()) &&
            stream.match(/\b(ttps?|tp|ile):\/\/[\-A-Z0-9+&@#\/%?=~_|$!:,.;]*[A-Z0-9+&@#\/%=~_|$]/i)) {
            return 'link';
        }

        // just a little string indicator, don't want to have the whole string covered
        if (ch === '"') {
            return 'string';
        }

        if (ch === '~') {    // _no_ CamelCase indicator should be bold {
            return 'brace';
        }

        if (/[\[\]]/.test(ch) && stream.match(ch)) { // check for [[..]] {
            return 'brace';
        }

        if (ch === '@') {    // check for space link. TODO fix @@...@@ highlighting
            stream.eatWhile(isSpaceName);
            return 'link';
        }

        if (/\d/.test(ch)) {        // numbers
            stream.eatWhile(/\d/);
            return 'number';
        }

        if (ch === '/') { // tw invisible comment
            if (stream.eat('%')) {
                return chain(stream, state, twTokenComment);
            } else if (stream.eat('/')) { //
                return chain(stream, state, twTokenEm);
            }
        }

        if (ch === '_' && stream.eat('_')) { // tw underline {
            return chain(stream, state, twTokenUnderline);
        }

        // strikethrough and mdash handling
        if (ch === '-' && stream.eat('-')) {
            // if strikethrough looks ugly, change CSS.
            if (stream.peek() !== ' ') {
                return chain(stream, state, twTokenStrike);
            }
            // mdash
            if (stream.peek() === ' ') {
                return 'brace';
            }
        }

        if (ch === "'" && stream.eat("'")) {// tw bold {
            return chain(stream, state, twTokenStrong);
        }

        if (ch === '<' && stream.eat('<')) {// tw macro {
            return chain(stream, state, twTokenMacro);
        }

        // core macro handling
        stream.eatWhile(/[\w\$_]/);
        return textwords.propertyIsEnumerable(stream.current()) ? 'keyword' : null;
    }

    // tw invisible comment
    function twTokenComment(stream, state) {
        let maybeEnd = false;
        let ch;
        while (ch = stream.next()) {
            if (ch === '/' && maybeEnd) {
                state.tokenize = tokenBase;
                break;
            }
            maybeEnd = (ch === '%');
        }
        return 'comment';
    }

    // tw strong / bold
    function twTokenStrong(stream, state) {
        let maybeEnd = false;
        let ch;
        while (ch = stream.next()) {
            if (ch === "'" && maybeEnd) {
                state.tokenize = tokenBase;
                break;
            }
            maybeEnd = (ch === "'");
        }
        return 'strong';
    }

    // tw code
    function twTokenCode(stream, state) {
        const sb = state.block;

        if (sb && stream.current()) {
            return 'comment';
        }

        if (!sb && stream.match(reUntilCodeStop)) {
            state.tokenize = tokenBase;
            return 'comment';
        }

        if (sb && stream.sol() && stream.match(reCodeBlockStop)) {
            state.tokenize = tokenBase;
            return 'comment';
        }

        stream.next();
        return 'comment';
    }

    // tw em / italic
    function twTokenEm(stream, state) {
        let maybeEnd = false;
        let ch;
        while (ch = stream.next()) {
            if (ch === '/' && maybeEnd) {
                state.tokenize = tokenBase;
                break;
            }
            maybeEnd = (ch === '/');
        }
        return 'em';
    }

    // tw underlined text
    function twTokenUnderline(stream, state) {
        let maybeEnd = false;
        let ch;
        while (ch = stream.next()) {
            if (ch === '_' && maybeEnd) {
                state.tokenize = tokenBase;
                break;
            }
            maybeEnd = (ch === '_');
        }
        return 'underlined';
    }

    // tw strike through text looks ugly
    // change CSS if needed
    function twTokenStrike(stream, state) {
        let maybeEnd = false;
        let ch;

        while (ch = stream.next()) {
            if (ch === '-' && maybeEnd) {
                state.tokenize = tokenBase;
                break;
            }
            maybeEnd = (ch === '-');
        }
        return 'strikethrough';
    }

    // macro
    function twTokenMacro(stream, state) {
        if (stream.current() === '<<') {
            return 'macro';
        }

        const ch = stream.next();
        if (!ch) {
            state.tokenize = tokenBase;
            return null;
        }
        if (ch === '>') {
            if (stream.peek() === '>') {
                stream.next();
                state.tokenize = tokenBase;
                return 'macro';
            }
        }

        stream.eatWhile(/[\w\$_]/);
        return keywords.propertyIsEnumerable(stream.current()) ? 'keyword' : null;
    }

    // Interface
    return {
        startState: () => ({tokenize: tokenBase}),

        token: (stream, state) => {
            if (stream.eatSpace()) {
                return null;
            }
            const style = state.tokenize(stream, state);
            return style;
        }
    };
});

defineMIME('text/x-tiddlywiki', 'tiddlywiki');
