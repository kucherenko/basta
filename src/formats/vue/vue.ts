import {defineMIME, defineMode, getMode, overlayMode} from '../index';
const tagLanguages = {
    script: [
        ['lang', /coffee(script)?/, 'coffeescript'],
        ['type', /^(?:text|application)\/(?:x-)?coffee(?:script)?$/, 'coffeescript']
    ],
    style: [
        ['lang', /^stylus$/i, 'stylus'],
        ['lang', /^sass$/i, 'sass'],
        ['type', /^(text\/)?(x-)?styl(us)?$/i, 'stylus'],
        ['type', /^text\/sass/i, 'sass']
    ],
    template: [
        ['lang', /^vue-template$/i, 'vue'],
        ['lang', /^pug$/i, 'pug'],
        ['lang', /^handlebars$/i, 'handlebars'],
        ['type', /^(text\/)?(x-)?pug$/i, 'pug'],
        ['type', /^text\/x-handlebars-template$/i, 'handlebars'],
        [null, null, 'vue-template']
    ]
};

defineMode('vue-template', function(config, parserConfig) {
    const mustacheOverlay = {
        token: function(stream) {
            if (stream.match(/^\{\{.*?\}\}/)) return 'meta mustache';
            while (stream.next() && !stream.match('{{', false)) {
            }
            return null;
        }
    };
    return overlayMode(getMode(config, parserConfig.backdrop || 'text/html'), mustacheOverlay);
});

defineMode('vue', function(config) {
    return getMode(config, {name: 'htmlmixed', tags: tagLanguages});
}, 'htmlmixed', 'xml', 'javascript', 'coffeescript', 'css', 'sass', 'stylus', 'pug', 'handlebars');

defineMIME('script/x-vue', 'vue');
defineMIME('text/x-vue', 'vue');
