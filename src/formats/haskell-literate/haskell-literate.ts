import '../haskell/haskell';
import {defineMIME, defineMode, getMode, startState} from '../index';
defineMode('haskell-literate', function(config, parserConfig) {
    const baseMode = getMode(config, (parserConfig && parserConfig.base) || 'haskell');

    return {
        startState: function() {
            return {
                inCode: false,
                baseState: startState(baseMode)
            };
        },
        token: function(stream, state) {
            if (stream.sol()) {
                if (state.inCode = stream.eat('>'))
                    return 'meta';
            }
            if (state.inCode) {
                return baseMode.token(stream, state.baseState);
            } else {
                stream.skipToEnd();
                return 'comment';
            }
        },
        innerMode: function(state) {
            return state.inCode ? {state: state.baseState, mode: baseMode} : null;
        }
    };
}, 'haskell');

defineMIME('text/x-literate-haskell', 'haskell-literate');
