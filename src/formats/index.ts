import {copyObj, countColumn, createObj} from './misc';
import {readdirSync, statSync} from 'fs';
import {resolve} from 'path';

// Known modes, by name and by MIME
export const modes = {};
export const mimeModes = {};

export function readFormats(formats: string[] = []) {
    readdirSync(__dirname).filter((file) => {
        return statSync(resolve(__dirname + '/' + file)).isDirectory();
    }).map((file) => {
        if (formats.length === 0 || formats.includes(file)) {
            readFormat(file);
        }
    });
}

export function readFormat(format: string) {
    if (format) {
        require(resolve(__dirname + '/' + format + '/' + format));
    }
}

// Extra arguments are stored as the mode's dependencies, which is
// used by (legacy) mechanisms like loadmode.js to automatically
// load a mode. (Preferred mechanism is the require/define calls.)
export function defineMode(name, mode, ...args) {
    if (args.length > 2) {
        mode.dependencies = args;
    }
    modes[name] = mode;
}

export function defineMIME(mime, spec) {
    mimeModes[mime] = spec;
}

defineMode('null', () => {
    return {
        token: (stream) => {
            stream.skipToEnd();
        }
    };
});

defineMIME('text/plain', 'null');

export function overlayMode(base, overlay, combine = null) {
    return {
        startState: () => {
            return {
                base: startState(base),
                overlay: startState(overlay),
                basePos: 0, baseCur: null,
                overlayPos: 0, overlayCur: null,
                streamSeen: null
            };
        },
        copyState: (state) => {
            return {
                base: copyState(base, state.base),
                overlay: copyState(overlay, state.overlay),
                basePos: state.basePos, baseCur: null,
                overlayPos: state.overlayPos, overlayCur: null
            };
        },

        token: (stream, state) => {
            if (stream != state.streamSeen ||
                Math.min(state.basePos, state.overlayPos) < stream.start) {
                state.streamSeen = stream;
                state.basePos = state.overlayPos = stream.start;
            }

            if (stream.start === state.basePos) {
                state.baseCur = base.token(stream, state.base);
                state.basePos = stream.pos;
            }
            if (stream.start === state.overlayPos) {
                stream.pos = stream.start;
                state.overlayCur = overlay.token(stream, state.overlay);
                state.overlayPos = stream.pos;
            }
            stream.pos = Math.min(state.basePos, state.overlayPos);

            // state.overlay.combineTokens always takes precedence over combine,
            // unless set to null
            if (state.overlayCur == null) {
                return state.baseCur;
            } else if (state.baseCur != null &&
                state.overlay.combineTokens ||
                combine && state.overlay.combineTokens == null) {
                return state.baseCur + ' ' + state.overlayCur;
            } else {
                return state.overlayCur;
            }
        },

        indent: base.indent && function (state, textAfter) {
            return base.indent(state.base, textAfter);
        },
        electricChars: base.electricChars,

        innerMode: function (state) {
            return {state: state.base, mode: base};
        },

        blankLine: function (state) {
            let baseToken, overlayToken;
            if (base.blankLine) baseToken = base.blankLine(state.base);
            if (overlay.blankLine) overlayToken = overlay.blankLine(state.overlay);

            return overlayToken == null ?
                baseToken :
                (combine && baseToken != null ? baseToken + ' ' + overlayToken : overlayToken);
        }
    };
}

// Given a MIME type, a {name, ...options} config object, or a name
// string, return a mode config object.
export function resolveMode(spec) {
    if (typeof spec === 'string' && mimeModes.hasOwnProperty(spec)) {
        spec = mimeModes[spec];
    } else if (spec && typeof spec.name == 'string' && mimeModes.hasOwnProperty(spec.name)) {
        let found = mimeModes[spec.name];
        if (typeof found === 'string') {
            found = {name: found};
        }
        spec = createObj(found, spec);
        spec.name = found.name;
    } else if (typeof spec === 'string' && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
        return resolveMode('application/xml');
    } else if (typeof spec === 'string' && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
        return resolveMode('application/json');
    }

    if (typeof spec === 'string') {
        return {name: spec};
    } else {
        return spec || {name: 'null'};
    }
}


export function hasFormat(mode) {
    return modes.hasOwnProperty(mode);
}

// Given a mode spec (anything that resolveMode accepts), find and
// initialize an actual mode object.
export function getMode(options, spec) {
    spec = resolveMode(spec);
    const mfactory = modes[spec.mode || spec.name];

    if (!mfactory) {
        return getMode(options, 'text/plain');
    }

    const modeObj = mfactory(options, spec);

    if (modeExtensions.hasOwnProperty(spec.name)) {
        const exts = modeExtensions[spec.name];
        for (const prop in exts) {
            if (!exts.hasOwnProperty(prop)) {
                continue;
            }
            if (modeObj.hasOwnProperty(prop)) {
                modeObj['_' + prop] = modeObj[prop];
            }
            modeObj[prop] = exts[prop];
        }
    }
    modeObj.name = spec.name;
    if (spec.helperType) modeObj.helperType = spec.helperType;
    if (spec.modeProps) for (const prop in spec.modeProps)
        modeObj[prop] = spec.modeProps[prop];

    return modeObj;
}

// This can be used to attach properties to mode objects from
// outside the actual mode definition.
export let modeExtensions = {};

export function extendMode(mode, properties) {
    const exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
    copyObj(properties, exts, false);
}

export function copyState(mode, state) {
    if (state === true) {
        return state;
    }
    if (mode.copyState) {
        return mode.copyState(state);
    }
    const nstate = {};
    for (const n in state) {
        let val = state[n];
        if (val instanceof Array) {
            val = val.concat([]);
        }
        nstate[n] = val;
    }
    return nstate;
}

// Given a mode and a state (for that mode), find the inner mode and
// state at the position that the state refers to.
export function innerMode(mode, state) {
    let info;
    while (mode.innerMode) {
        info = mode.innerMode(state);
        if (!info || info.mode == mode) {
            break;
        }
        state = info.state;
        mode = info.mode;
    }
    return info || {mode: mode, state: state};
}

export function startState(mode, a1 = undefined, a2 = undefined) {
    return mode.startState ? mode.startState(a1, a2) : true;
}

export function StringStream(str: string, tabSize = undefined) {
    this.pos = this.start = 0;
    this.string = str;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
    this.lineStart = 0;
}


StringStream.prototype = {
    eol: function () {
        return this.pos >= this.string.length;
    },
    sol: function () {
        return this.pos == this.lineStart;
    },
    peek: function () {
        return this.string.charAt(this.pos) || undefined;
    },
    next: function () {
        if (this.pos < this.string.length)
            return this.string.charAt(this.pos++);
    },
    eat: function (match) {
        const ch = this.string.charAt(this.pos);
        let ok;
        if (typeof match == 'string') ok = ch == match;
        else ok = ch && (match.test ? match.test(ch) : match(ch));
        if (ok) {
            ++this.pos;
            return ch;
        }
    },
    eatWhile: function (match) {
        const start = this.pos;
        while (this.eat(match)) {
        }
        return this.pos > start;
    },
    eatSpace: function () {
        const start = this.pos;
        while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
        return this.pos > start;
    },
    skipToEnd: function () {
        this.pos = this.string.length;
    },
    skipTo: function (ch) {
        const found = this.string.indexOf(ch, this.pos);
        if (found > -1) {
            this.pos = found;
            return true;
        }
    },
    backUp: function (n) {
        this.pos -= n;
    },
    column: function () {
        if (this.lastColumnPos < this.start) {
            this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
            this.lastColumnPos = this.start;
        }
        return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    },
    indentation: function () {
        return countColumn(this.string, null, this.tabSize) -
            (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    },
    match: function (pattern, consume, caseInsensitive) {
        if (typeof pattern == 'string') {
            const cased = str => caseInsensitive ? str.toLowerCase() : str;
            const substr = this.string.substr(this.pos, pattern.length);
            if (cased(substr) == cased(pattern)) {
                if (consume !== false) this.pos += pattern.length;
                return true;
            }
        } else {
            const match = this.string.slice(this.pos).match(pattern);
            if (match && match.index > 0) return null;
            if (match && consume !== false) this.pos += match[0].length;
            return match;
        }
    },
    current: function () {
        return this.string.slice(this.start, this.pos);
    },
    hideFirstChars: function (n, inner) {
        this.lineStart += n;
        try {
            return inner();
        }
        finally {
            this.lineStart -= n;
        }
    }
};

export function runMode(string: string, modespec, {state = false}) {
    const mode = getMode({indentUnit: 2}, modespec);
    const lines = splitLines(string);
    const tokens = [];
    state = state || startState(mode);

    for (let i = 0, e = lines.length; i < e; ++i) {
        if (i) {
            tokens.push({value: '\n'});
        }
        const stream = new StringStream(lines[i]);
        if (!stream.string && mode.blankLine) {
            mode.blankLine(state);
        }
        while (!stream.eol()) {
            const style = mode.token(stream, state);
            tokens.push({
                value: stream.current(),
                type: style || 'blank',
                line: i
            });
            stream.start = stream.pos;
        }
    }
    return tokens;
}

function splitLines(buffer) {
    buffer = buffer.toString()
    return (buffer && buffer.length > 0) ? buffer.split(/\r\n?|\n/) : [];
}

