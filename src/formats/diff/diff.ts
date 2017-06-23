import {defineMIME, defineMode} from '../index';

defineMode('diff', function() {

    const TOKEN_NAMES = {
        '+': 'positive',
        '-': 'negative',
        '@': 'meta'
    };

    return {
        token: function(stream) {
            const tw_pos = stream.string.search(/[\t ]+?$/);

            if (!stream.sol() || tw_pos === 0) {
                stream.skipToEnd();
                return ('error ' + (
                TOKEN_NAMES[stream.string.charAt(0)] || '')).replace(/ $/, '');
            }

            const token_name = TOKEN_NAMES[stream.peek()] || stream.skipToEnd();

            if (tw_pos === -1) {
                stream.skipToEnd();
            } else {
                stream.pos = tw_pos;
            }

            return token_name;
        }
    };
});

defineMIME('text/x-diff', 'diff');

