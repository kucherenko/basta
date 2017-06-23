import '../htmlmixed/htmlmixed'
import {defineMIME, defineMode, getMode} from '../index';
import {multiplexingMode} from '../multiplex';

defineMode('htmlembedded', function(config, parserConfig) {
    return multiplexingMode(getMode(config, 'htmlmixed'), {
        open: parserConfig.open || parserConfig.scriptStartRegex || '<%',
        close: parserConfig.close || parserConfig.scriptEndRegex || '%>',
        mode: getMode(config, parserConfig.scriptingModeSpec)
    });
}, 'htmlmixed');

defineMIME('application/x-ejs', {name: 'htmlembedded', scriptingModeSpec: 'javascript'});
defineMIME('application/x-aspx', {name: 'htmlembedded', scriptingModeSpec: 'text/x-csharp'});
defineMIME('application/x-jsp', {name: 'htmlembedded', scriptingModeSpec: 'text/x-java'});
defineMIME('application/x-erb', {name: 'htmlembedded', scriptingModeSpec: 'ruby'});
