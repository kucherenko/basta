import '../yaml/yaml';
import '../gfm/gfm';
import {copyState, defineMode, getMode, startState} from '../';

const START = 0;
const FRONTMATTER = 1;
const BODY = 2;

// a mixed mode for Markdown text with an optional YAML front matter
defineMode('yaml-frontmatter', (config, parserConfig) => {
    const yamlMode = getMode(config, 'yaml');
    const innerMode = getMode(config, parserConfig && parserConfig.base || 'gfm');

    function curMode(state) {
        return state.state === BODY ? innerMode : yamlMode;
    }

    return {
        startState: () => ({
            state: START,
            inner: startState(yamlMode)
        }),
        copyState: state => ({
            state: state.state,
            inner: copyState(curMode(state), state.inner)
        }),
        token: (stream, state) => {
            if (state.state === START) {
                if (stream.match(/---/, false)) {
                    state.state = FRONTMATTER;
                    return yamlMode.token(stream, state.inner);
                } else {
                    state.state = BODY;
                    state.inner = startState(innerMode);
                    return innerMode.token(stream, state.inner);
                }
            } else if (state.state === FRONTMATTER) {
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
        innerMode: state => ({mode: curMode(state), state: state.inner}),
        blankLine: state => {
            const mode = curMode(state);
            if (mode.blankLine) {
                return mode.blankLine(state.inner);
            }
        }
    };
});

