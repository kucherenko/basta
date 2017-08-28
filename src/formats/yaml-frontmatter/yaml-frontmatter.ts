import '../yaml/yaml';
import '../gfm/gfm';
import {defineMode, getMode, startState} from '../index';

const START = 0, FRONTMATTER = 1, BODY = 2;

// a mixed mode for Markdown text with an optional YAML front matter
defineMode('yaml-frontmatter', function (config, parserConfig) {
    const yamlMode = getMode(config, 'yaml');
    const innerMode = getMode(config, parserConfig && parserConfig.base || 'gfm');

    function curMode(state) {
        return state.state == BODY ? innerMode : yamlMode;
    }

    return {
        startState: function () {
            return {
                state: START,
                inner: startState(yamlMode)
            };
        },
        copyState: function (state) {
            return {
                state: state.state,
                inner: copyState(curMode(state), state.inner)
            };
        },
        token: function (stream, state) {
            if (state.state == START) {
                if (stream.match(/---/, false)) {
                    state.state = FRONTMATTER;
                    return yamlMode.token(stream, state.inner);
                } else {
                    state.state = BODY;
                    state.inner = startState(innerMode);
                    return innerMode.token(stream, state.inner);
                }
            } else if (state.state == FRONTMATTER) {
                const end = stream.sol() && stream.match(/---/, false);
                const style = yamlMode.token(stream, state.inner);
                if (end) {
                    state.state = BODY;
                    state.inner = startState(innerMode);
                }
                return style;
            } else {
                return innerMode.token(stream, state.inner);
            }
        },
        innerMode: function (state) {
            return {mode: curMode(state), state: state.inner};
        },
        blankLine: function (state) {
            const mode = curMode(state);
            if (mode.blankLine) return mode.blankLine(state.inner);
        }
    };
});

