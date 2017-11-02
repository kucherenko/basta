import '../haskell/haskell';
import {defineMIME, defineMode, getMode, startState} from '../index';
// noinspection TsLint
defineMode('haskell-literate', (config, parserConfig) => {
    const baseMode = getMode(config, (parserConfig && parserConfig.base) || 'haskell');

    // noinspection TsLint
    // noinspection TsLint
    // noinspection TsLint
    return {
        startState: () => ({
            inCode: false,
            baseState: startState(baseMode)
        }),
        token: (stream, state) => {
            if (stream.sol()) {
                if (state.inCode = stream.eat('>')) {
                    return 'meta';
                }
            }
            if (state.inCode) {
                return baseMode.token(stream, state.baseState);
            } else {
                stream.skipToEnd();
                return 'comment';
            }
        },
        innerMode: state => state.inCode ? {state: state.baseState, mode: baseMode} : null
    };
}, 'haskell');

defineMIME('text/x-literate-haskell', 'haskell-literate');
