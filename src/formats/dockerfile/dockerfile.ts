// Collect all Dockerfile directives
import {defineMIME} from '../index';
import {defineSimpleMode} from '../simple';
const instructions = ['from', 'maintainer', 'run', 'cmd', 'expose', 'env',
        'add', 'copy', 'entrypoint', 'volume', 'user',
        'workdir', 'onbuild'],
    instructionRegex = '(' + instructions.join('|') + ')',
    instructionOnlyLine = new RegExp(instructionRegex + '\\s*$', 'i'),
    instructionWithArguments = new RegExp(instructionRegex + '(\\s+)', 'i');

defineSimpleMode('dockerfile', {
    start: [
        // Block comment: This is a line starting with a comment
        {
            regex: /#.*$/,
            token: 'comment'
        },
        // Highlight an instruction without any arguments (for convenience)
        {
            regex: instructionOnlyLine,
            token: 'variable-2'
        },
        // Highlight an instruction followed by arguments
        {
            regex: instructionWithArguments,
            token: ['variable-2', null],
            next: 'arguments'
        },
        {
            regex: /./,
            token: null
        }
    ],
    arguments: [
        {
            // Line comment without instruction arguments is an error
            regex: /#.*$/,
            token: 'error',
            next: 'start'
        },
        {
            regex: /[^#]+\\$/,
            token: null
        },
        {
            // Match everything except for the inline comment
            regex: /[^#]+/,
            token: null,
            next: 'start'
        },
        {
            regex: /$/,
            token: null,
            next: 'start'
        },
        // Fail safe return to start
        {
            token: null,
            next: 'start'
        }
    ],
    meta: {
        lineComment: '#'
    }
});

defineMIME('text/x-dockerfile', 'dockerfile');
