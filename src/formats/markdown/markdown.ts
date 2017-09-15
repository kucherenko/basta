import "../htmlembedded/htmlembedded";
import {findModeByName} from '../meta';
import {defineMIME, defineMode, getMode, innerMode, startState, copyState} from '../';

defineMode('markdown', (cmCfg, modeCfg) => {

    const htmlMode = getMode(cmCfg, 'text/html');
    const htmlModeMissing = htmlMode.name === 'null';

    function getModeByName(name) {
        const found = findModeByName(name);
        if (found) {
            name = found.mime || found.mimes[0];
        }
        const mode = getMode(cmCfg, name);
        return mode.name === 'null' ? null : mode;
    }

    // Should characters that affect highlighting be highlighted separate?
    // Does not include characters that will be output (such as `1.` and `-` for lists)
    if (modeCfg.highlightFormatting === undefined) {
        modeCfg.highlightFormatting = false;
    }

    // Maximum number of nested blockquotes. Set to 0 for infinite nesting.
    // Excess `>` will emit `error` token.
    if (modeCfg.maxBlockquoteDepth === undefined) {
        modeCfg.maxBlockquoteDepth = 0;
    }

    // Use `fencedCodeBlocks` to configure fenced code blocks. false to
    // disable, string to specify a precise regexp that the fence should
    // match, and true to allow three or more backticks or tildes (as
    // per CommonMark).

    // Turn on task lists? ("- [ ] " and "- [x] ")
    if (modeCfg.taskLists === undefined) {
        modeCfg.taskLists = false;
    }

    // Turn on strikethrough syntax
    if (modeCfg.strikethrough === undefined) {
        modeCfg.strikethrough = false;
    }

    // Allow token types to be overridden by user-provided token types.
    if (modeCfg.tokenTypeOverrides === undefined) {
        modeCfg.tokenTypeOverrides = {};
    }

    const tokenTypes = {
        header: 'header',
        code: 'comment',
        quote: 'quote',
        list1: 'variable-2',
        list2: 'variable-3',
        list3: 'keyword',
        hr: 'hr',
        image: 'image',
        imageAltText: 'image-alt-text',
        imageMarker: 'image-marker',
        formatting: 'formatting',
        linkInline: 'link',
        linkEmail: 'link',
        linkText: 'link',
        linkHref: 'string',
        em: 'em',
        strong: 'strong',
        strikethrough: 'strikethrough'
    };

    for (const tokenType in tokenTypes) {
        if (tokenTypes.hasOwnProperty(tokenType) && modeCfg.tokenTypeOverrides[tokenType]) {
            tokenTypes[tokenType] = modeCfg.tokenTypeOverrides[tokenType];
        }
    }

    const hrRE = /^([*\-_])(?:\s*\1){2,}\s*$/;
    const listRE = /^(?:[*\-+]|^[0-9]+([.)]))\s+/;
    const taskListRE = /^\[(x| )\](?=\s)/;
    const atxHeaderRE = modeCfg.allowAtxHeaderWithoutSpace ? /^(#+)/ : /^(#+)(?: |$)/;
    const setextHeaderRE = /^ *(?:\={1,}|-{1,})\s*$/;
    const textRE = /^[^#!\[\]*_\\<>` "'(~]+/;
    const fencedCodeRE = new RegExp('^(' + (modeCfg.fencedCodeBlocks === true ? '~~~+|```+' : modeCfg.fencedCodeBlocks) +
        ')[ \\t]*([\\w+#\-]*)');
    const punctuation = /[!\"#$%&\'()*+,\-\.\/:;<=>?@\[\\\]^_`{|}~—]/;

    function switchInline(stream, state, f) {
        state.f = state.inline = f;
        return f(stream, state);
    }

    function switchBlock(stream, state, f) {
        state.f = state.block = f;
        return f(stream, state);
    }

    function lineIsEmpty(line) {
        return !line || !/\S/.test(line.string);
    }

    // Blocks

    function blankLine(state) {
        // Reset linkTitle state
        state.linkTitle = false;
        // Reset EM state
        state.em = false;
        // Reset STRONG state
        state.strong = false;
        // Reset strikethrough state
        state.strikethrough = false;
        // Reset state.quote
        state.quote = 0;
        // Reset state.indentedCode
        state.indentedCode = false;
        if (state.f === htmlBlock) {
            state.f = inlineNormal;
            state.block = blockNormal;
        }
        // Reset state.trailingSpace
        state.trailingSpace = 0;
        state.trailingSpaceNewLine = false;
        // Mark this line as blank
        state.prevLine = state.thisLine;
        state.thisLine = null;
        return null;
    }

    function blockNormal(stream, state) {
        const sol = stream.sol();

        const prevLineIsList = state.list !== false;
        const prevLineIsIndentedCode = state.indentedCode;

        state.indentedCode = false;

        if (prevLineIsList) {
            if (state.indentationDiff >= 0) { // Continued list
                if (state.indentationDiff < 4) { // Only adjust indentation if *not* a code block
                    state.indentation -= state.indentationDiff;
                }
                state.list = null;
            } else if (state.indentation > 0) {
                state.list = null;
            } else { // No longer a list
                state.list = false;
            }
        }

        let match = null;
        if (state.indentationDiff >= 4 && (prevLineIsIndentedCode || lineIsEmpty(state.prevLine))) {
            stream.skipToEnd();
            state.indentation -= 4;
            state.indentedCode = true;
            return tokenTypes.code;
        } else if (stream.eatSpace()) {
            return null;
        } else if ((match = stream.match(atxHeaderRE)) && match[1].length <= 6) {
            state.header = match[1].length;
            if (modeCfg.highlightFormatting) state.formatting = 'header';
            state.f = state.inline;
            return getType(state);
        } else if (!lineIsEmpty(state.prevLine) && !state.quote && !prevLineIsList &&
            !prevLineIsIndentedCode && (match = stream.match(setextHeaderRE))) {
            state.header = match[0].charAt(0) === '=' ? 1 : 2;
            if (modeCfg.highlightFormatting) state.formatting = 'header';
            state.f = state.inline;
            return getType(state);
        } else if (stream.eat('>')) {
            state.quote = sol ? 1 : state.quote + 1;
            if (modeCfg.highlightFormatting) state.formatting = 'quote';
            stream.eatSpace();
            return getType(state);
        } else if (stream.peek() === '[') {
            return switchInline(stream, state, footnoteLink);
        } else if (stream.match(hrRE, true)) {
            state.hr = true;
            return tokenTypes.hr;
        } else if (match = stream.match(listRE)) {
            const listType = match[1] ? 'ol' : 'ul';
            state.indentation = stream.column() + stream.current().length;
            state.list = true;

            // While this list item's marker's indentation
            // is less than the deepest list item's content's indentation,
            // pop the deepest list item indentation off the stack.
            while (state.listStack && stream.column() < state.listStack[state.listStack.length - 1]) {
                state.listStack.pop();
            }

            // Add this list item's content's indentation to the stack
            state.listStack.push(state.indentation);

            if (modeCfg.taskLists && stream.match(taskListRE, false)) {
                state.taskList = true;
            }
            state.f = state.inline;
            if (modeCfg.highlightFormatting) state.formatting = ['list', 'list-' + listType];
            return getType(state);
        } else if (modeCfg.fencedCodeBlocks && (match = stream.match(fencedCodeRE, true))) {
            state.fencedChars = match[1];
            // try switching mode
            state.localMode = getModeByName(match[2]);
            if (state.localMode) state.localState = startState(state.localMode);
            state.f = state.block = local;
            if (modeCfg.highlightFormatting) state.formatting = 'code-block';
            state.code = -1;
            return getType(state);
        }

        return switchInline(stream, state, state.inline);
    }

    function htmlBlock(stream, state) {
        const style = htmlMode.token(stream, state.htmlState);
        if (!htmlModeMissing) {
            const inner = innerMode(htmlMode, state.htmlState);
            if ((inner.mode.name == 'xml' && inner.state.tagStart === null &&
                (!inner.state.context && inner.state.tokenize.isInText)) ||
                (state.md_inside && stream.current().indexOf('>') > -1)) {
                state.f = inlineNormal;
                state.block = blockNormal;
                state.htmlState = null;
            }
        }
        return style;
    }

    function local(stream, state) {
        if (state.fencedChars && stream.match(state.fencedChars)) {
            if (modeCfg.highlightFormatting) state.formatting = 'code-block';
            const returnType = getType(state);
            state.localMode = state.localState = null;
            state.block = blockNormal;
            state.f = inlineNormal;
            state.fencedChars = null;
            state.code = 0;
            return returnType;
        } else if (state.fencedChars && stream.skipTo(state.fencedChars)) {
            return 'comment';
        } else if (state.localMode) {
            return state.localMode.token(stream, state.localState);
        } else {
            stream.skipToEnd();
            return tokenTypes.code;
        }
    }

    // Inline
    function getType(state) {
        const styles = [];

        if (state.formatting) {
            styles.push(tokenTypes.formatting);

            if (typeof state.formatting === 'string') state.formatting = [state.formatting];

            for (let i = 0; i < state.formatting.length; i++) {
                styles.push(tokenTypes.formatting + '-' + state.formatting[i]);

                if (state.formatting[i] === 'header') {
                    styles.push(tokenTypes.formatting + '-' + state.formatting[i] + '-' + state.header);
                }

                // Add `formatting-quote` and `formatting-quote-#` for blockquotes
                // Add `error` instead if the maximum blockquote nesting depth is passed
                if (state.formatting[i] === 'quote') {
                    if (!modeCfg.maxBlockquoteDepth || modeCfg.maxBlockquoteDepth >= state.quote) {
                        styles.push(tokenTypes.formatting + '-' + state.formatting[i] + '-' + state.quote);
                    } else {
                        styles.push('error');
                    }
                }
            }
        }

        if (state.taskOpen) {
            styles.push('meta');
            return styles.length ? styles.join(' ') : null;
        }
        if (state.taskClosed) {
            styles.push('property');
            return styles.length ? styles.join(' ') : null;
        }

        if (state.linkHref) {
            styles.push(tokenTypes.linkHref, 'url');
        } else { // Only apply inline styles to non-url text
            if (state.strong) {
                styles.push(tokenTypes.strong);
            }
            if (state.em) {
                styles.push(tokenTypes.em);
            }
            if (state.strikethrough) {
                styles.push(tokenTypes.strikethrough);
            }
            if (state.linkText) {
                styles.push(tokenTypes.linkText);
            }
            if (state.code) {
                styles.push(tokenTypes.code);
            }
            if (state.image) {
                styles.push(tokenTypes.image);
            }
            if (state.imageAltText) {
                styles.push(tokenTypes.imageAltText, 'link');
            }
            if (state.imageMarker) {
                styles.push(tokenTypes.imageMarker);
            }
        }

        if (state.header) {
            styles.push(tokenTypes.header, tokenTypes.header + '-' + state.header);
        }

        if (state.quote) {
            styles.push(tokenTypes.quote);

            // Add `quote-#` where the maximum for `#` is modeCfg.maxBlockquoteDepth
            if (!modeCfg.maxBlockquoteDepth || modeCfg.maxBlockquoteDepth >= state.quote) {
                styles.push(tokenTypes.quote + '-' + state.quote);
            } else {
                styles.push(tokenTypes.quote + '-' + modeCfg.maxBlockquoteDepth);
            }
        }

        if (state.list !== false) {
            const listMod = (state.listStack.length - 1) % 3;
            if (!listMod) {
                styles.push(tokenTypes.list1);
            } else if (listMod === 1) {
                styles.push(tokenTypes.list2);
            } else {
                styles.push(tokenTypes.list3);
            }
        }

        if (state.trailingSpaceNewLine) {
            styles.push('trailing-space-new-line');
        } else if (state.trailingSpace) {
            styles.push('trailing-space-' + (state.trailingSpace % 2 ? 'a' : 'b'));
        }

        return styles.length ? styles.join(' ') : null;
    }

    function handleText(stream, state) {
        if (stream.match(textRE, true)) {
            return getType(state);
        }
        return undefined;
    }

    function inlineNormal(stream, state) {
        const style = state.text(stream, state);
        if (typeof style !== 'undefined')
            return style;

        if (state.list) { // List marker (*, +, -, 1., etc)
            state.list = null;
            return getType(state);
        }

        if (state.taskList) {
            const taskOpen = stream.match(taskListRE, true)[1] !== 'x';
            if (taskOpen) state.taskOpen = true;
            else state.taskClosed = true;
            if (modeCfg.highlightFormatting) state.formatting = 'task';
            state.taskList = false;
            return getType(state);
        }

        state.taskOpen = false;
        state.taskClosed = false;

        if (state.header && stream.match(/^#+$/, true)) {
            if (modeCfg.highlightFormatting) state.formatting = 'header';
            return getType(state);
        }

        const ch = stream.next();

        // Matches link titles present on next line
        if (state.linkTitle) {
            state.linkTitle = false;
            let matchCh = ch;
            if (ch === '(') {
                matchCh = ')';
            }
            matchCh = (matchCh + '').replace(/([.?*+^\[\]\\(){}|-])/g, '\\$1');
            const regex = '^\\s*(?:[^' + matchCh + '\\\\]+|\\\\\\\\|\\\\.)' + matchCh;
            if (stream.match(new RegExp(regex), true)) {
                return tokenTypes.linkHref;
            }
        }

        // If this block is changed, it may need to be updated in GFM mode
        if (ch === '`') {
            const previousFormatting = state.formatting;
            if (modeCfg.highlightFormatting) state.formatting = 'code';
            stream.eatWhile('`');
            const count = stream.current().length;
            if (state.code == 0) {
                state.code = count;
                return getType(state);
            } else if (count == state.code) { // Must be exact
                const t = getType(state);
                state.code = 0;
                return t;
            } else {
                state.formatting = previousFormatting;
                return getType(state);
            }
        } else if (state.code) {
            return getType(state);
        }

        if (ch === '\\') {
            stream.next();
            if (modeCfg.highlightFormatting) {
                const type = getType(state);
                const formattingEscape = tokenTypes.formatting + '-escape';
                return type ? type + ' ' + formattingEscape : formattingEscape;
            }
        }

        if (ch === '!' && stream.match(/\[[^\]]*\] ?(?:\(|\[)/, false)) {
            state.imageMarker = true;
            state.image = true;
            if (modeCfg.highlightFormatting) state.formatting = 'image';
            return getType(state);
        }

        if (ch === '[' && state.imageMarker && stream.match(/[^\]]*\](\(.*?\)| ?\[.*?\])/, false)) {
            state.imageMarker = false;
            state.imageAltText = true;
            if (modeCfg.highlightFormatting) state.formatting = 'image';
            return getType(state);
        }

        if (ch === ']' && state.imageAltText) {
            if (modeCfg.highlightFormatting) state.formatting = 'image';
            const type = getType(state);
            state.imageAltText = false;
            state.image = false;
            state.inline = state.f = linkHref;
            return type;
        }

        if (ch === '[' && !state.image) {
            state.linkText = true;
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            return getType(state);
        }

        if (ch === ']' && state.linkText) {
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            const type = getType(state);
            state.linkText = false;
            state.inline = state.f = stream.match(/\(.*?\)| ?\[.*?\]/, false) ? linkHref : inlineNormal;
            return type;
        }

        if (ch === '<' && stream.match(/^(https?|ftps?):\/\/(?:[^\\>]|\\.)+>/, false)) {
            state.f = state.inline = linkInline;
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            let type = getType(state);
            if (type) {
                type += ' ';
            } else {
                type = '';
            }
            return type + tokenTypes.linkInline;
        }

        if (ch === '<' && stream.match(/^[^> \\]+@(?:[^\\>]|\\.)+>/, false)) {
            state.f = state.inline = linkInline;
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            let type = getType(state);
            if (type) {
                type += ' ';
            } else {
                type = '';
            }
            return type + tokenTypes.linkEmail;
        }

        if (ch === '<' && stream.match(/^(!--|[a-z]+(?:\s+[a-z_:.\-]+(?:\s*=\s*[^ >]+)?)*\s*>)/i, false)) {
            const end = stream.string.indexOf('>', stream.pos);
            if (end != -1) {
                const atts = stream.string.substring(stream.start, end);
                if (/markdown\s*=\s*('|"){0,1}1('|"){0,1}/.test(atts)) state.md_inside = true;
            }
            stream.backUp(1);
            state.htmlState = startState(htmlMode);
            return switchBlock(stream, state, htmlBlock);
        }

        if (ch === '<' && stream.match(/^\/\w*?>/)) {
            state.md_inside = false;
            return 'tag';
        } else if (ch === '*' || ch === '_') {
            let len = 1, before = stream.pos == 1 ? ' ' : stream.string.charAt(stream.pos - 2);
            while (len < 3 && stream.eat(ch)) len++;
            const after = stream.peek() || ' ';
            // See http://spec.commonmark.org/0.27/#emphasis-and-strong-emphasis
            const leftFlanking = !/\s/.test(after) && (!punctuation.test(after) || /\s/.test(before) || punctuation.test(before));
            const rightFlanking = !/\s/.test(before) && (!punctuation.test(before) || /\s/.test(after) || punctuation.test(after));
            let setEm = null, setStrong = null;
            if (len % 2) { // Em
                if (!state.em && leftFlanking && (ch === '*' || !rightFlanking || punctuation.test(before)))
                    setEm = true;
                else if (state.em == ch && rightFlanking && (ch === '*' || !leftFlanking || punctuation.test(after)))
                    setEm = false;
            }
            if (len > 1) { // Strong
                if (!state.strong && leftFlanking && (ch === '*' || !rightFlanking || punctuation.test(before)))
                    setStrong = true;
                else if (state.strong == ch && rightFlanking && (ch === '*' || !leftFlanking || punctuation.test(after)))
                    setStrong = false;
            }
            if (setStrong != null || setEm != null) {
                if (modeCfg.highlightFormatting) state.formatting = setEm == null ? 'strong' : setStrong == null ? 'em' : 'strong em';
                if (setEm === true) state.em = ch;
                if (setStrong === true) state.strong = ch;
                const t = getType(state);
                if (setEm === false) state.em = false;
                if (setStrong === false) state.strong = false;
                return t;
            }
        } else if (ch === ' ') {
            if (stream.eat('*') || stream.eat('_')) { // Probably surrounded by spaces
                if (stream.peek() === ' ') { // Surrounded by spaces, ignore
                    return getType(state);
                } else { // Not surrounded by spaces, back up pointer
                    stream.backUp(1);
                }
            }
        }

        if (modeCfg.strikethrough) {
            if (ch === '~' && stream.eatWhile(ch)) {
                if (state.strikethrough) {// Remove strikethrough
                    if (modeCfg.highlightFormatting) state.formatting = 'strikethrough';
                    const t = getType(state);
                    state.strikethrough = false;
                    return t;
                } else if (stream.match(/^[^\s]/, false)) {// Add strikethrough
                    state.strikethrough = true;
                    if (modeCfg.highlightFormatting) state.formatting = 'strikethrough';
                    return getType(state);
                }
            } else if (ch === ' ') {
                if (stream.match(/^~~/, true)) { // Probably surrounded by space
                    if (stream.peek() === ' ') { // Surrounded by spaces, ignore
                        return getType(state);
                    } else { // Not surrounded by spaces, back up pointer
                        stream.backUp(2);
                    }
                }
            }
        }

        if (ch === ' ') {
            if (stream.match(/ +$/, false)) {
                state.trailingSpace++;
            } else if (state.trailingSpace) {
                state.trailingSpaceNewLine = true;
            }
        }

        return getType(state);
    }

    function linkInline(stream, state) {
        const ch = stream.next();

        if (ch === '>') {
            state.f = state.inline = inlineNormal;
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            let type = getType(state);
            if (type) {
                type += ' ';
            } else {
                type = '';
            }
            return type + tokenTypes.linkInline;
        }

        stream.match(/^[^>]+/, true);

        return tokenTypes.linkInline;
    }

    function linkHref(stream, state) {
        // Check if space, and return NULL if so (to avoid marking the space)
        if (stream.eatSpace()) {
            return null;
        }
        const ch = stream.next();
        if (ch === '(' || ch === '[') {
            state.f = state.inline = getLinkHrefInside(ch === '(' ? ')' : ']');
            if (modeCfg.highlightFormatting) state.formatting = 'link-string';
            state.linkHref = true;
            return getType(state);
        }
        return 'error';
    }

    const linkRE = {
        ')': /^(?:[^\\\(\)]|\\.|\((?:[^\\\(\)]|\\.)*\))*?(?=\))/,
        ']': /^(?:[^\\\[\]]|\\.|\[(?:[^\\\[\]]|\\.)*\])*?(?=\])/
    };

    function getLinkHrefInside(endChar) {
        return function(stream, state) {
            const ch = stream.next();

            if (ch === endChar) {
                state.f = state.inline = inlineNormal;
                if (modeCfg.highlightFormatting) state.formatting = 'link-string';
                const returnState = getType(state);
                state.linkHref = false;
                return returnState;
            }

            stream.match(linkRE[endChar]);
            state.linkHref = true;
            return getType(state);
        };
    }

    function footnoteLink(stream, state) {
        if (stream.match(/^([^\]\\]|\\.)*\]:/, false)) {
            state.f = footnoteLinkInside;
            stream.next(); // Consume [
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            state.linkText = true;
            return getType(state);
        }
        return switchInline(stream, state, inlineNormal);
    }

    function footnoteLinkInside(stream, state) {
        if (stream.match(/^\]:/, true)) {
            state.f = state.inline = footnoteUrl;
            if (modeCfg.highlightFormatting) state.formatting = 'link';
            const returnType = getType(state);
            state.linkText = false;
            return returnType;
        }

        stream.match(/^([^\]\\]|\\.)+/, true);

        return tokenTypes.linkText;
    }

    function footnoteUrl(stream, state) {
        // Check if space, and return NULL if so (to avoid marking the space)
        if (stream.eatSpace()) {
            return null;
        }
        // Match URL
        stream.match(/^[^\s]+/, true);
        // Check for link title
        if (stream.peek() === undefined) { // End of line, set flag to check next line
            state.linkTitle = true;
        } else { // More content on line, check if link title
            stream.match(/^(?:\s+(?:"(?:[^"\\]|\\\\|\\.)+"|'(?:[^'\\]|\\\\|\\.)+'|\((?:[^)\\]|\\\\|\\.)+\)))?/, true);
        }
        state.f = state.inline = inlineNormal;
        return tokenTypes.linkHref + ' url';
    }

    const mode = {
        startState: function() {
            return {
                f: blockNormal,

                prevLine: null,
                thisLine: null,

                block: blockNormal,
                htmlState: null,
                indentation: 0,

                inline: inlineNormal,
                text: handleText,

                formatting: false,
                linkText: false,
                linkHref: false,
                linkTitle: false,
                code: 0,
                em: false,
                strong: false,
                header: 0,
                hr: false,
                taskList: false,
                list: false,
                listStack: [],
                quote: 0,
                trailingSpace: 0,
                trailingSpaceNewLine: false,
                strikethrough: false,
                fencedChars: null
            };
        },

        copyState: function(s) {
            return {
                f: s.f,

                prevLine: s.prevLine,
                thisLine: s.thisLine,

                block: s.block,
                htmlState: s.htmlState && copyState(htmlMode, s.htmlState),
                indentation: s.indentation,

                localMode: s.localMode,
                localState: s.localMode ? copyState(s.localMode, s.localState) : null,

                inline: s.inline,
                text: s.text,
                formatting: false,
                linkText: s.linkText,
                linkTitle: s.linkTitle,
                code: s.code,
                em: s.em,
                strong: s.strong,
                strikethrough: s.strikethrough,
                header: s.header,
                hr: s.hr,
                taskList: s.taskList,
                list: s.list,
                listStack: s.listStack.slice(0),
                quote: s.quote,
                indentedCode: s.indentedCode,
                trailingSpace: s.trailingSpace,
                trailingSpaceNewLine: s.trailingSpaceNewLine,
                md_inside: s.md_inside,
                fencedChars: s.fencedChars
            };
        },

        token: function(stream, state) {

            // Reset state.formatting
            state.formatting = false;

            if (stream != state.thisLine) {
                const forceBlankLine = state.header || state.hr;

                // Reset state.header and state.hr
                state.header = 0;
                state.hr = false;

                if (stream.match(/^\s*$/, true) || forceBlankLine) {
                    blankLine(state);
                    if (!forceBlankLine) return null;
                    state.prevLine = null;
                }

                state.prevLine = state.thisLine;
                state.thisLine = stream;

                // Reset state.taskList
                state.taskList = false;

                // Reset state.trailingSpace
                state.trailingSpace = 0;
                state.trailingSpaceNewLine = false;

                state.f = state.block;
                const indentation = stream.match(/^\s*/, true)[0].replace(/\t/g, '    ').length;
                state.indentationDiff = Math.min(indentation - state.indentation, 4);
                state.indentation = state.indentation + state.indentationDiff;
                if (indentation > 0) return null;
            }
            return state.f(stream, state);
        },

        innerMode: function(state) {
            if (state.block == htmlBlock) return {state: state.htmlState, mode: htmlMode};
            if (state.localState) return {state: state.localState, mode: state.localMode};
            return {state: state, mode: mode};
        },

        blankLine: blankLine,

        getType: getType,

        closeBrackets: "()[]{}''\"\"``",
        fold: 'markdown'
    };
    return mode;
}, 'xml');

defineMIME('text/x-markdown', 'markdown');
