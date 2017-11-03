# Basta
[![npm](https://img.shields.io/npm/v/basta.svg?style=flat-square)](https://www.npmjs.com/package/basta)
[![npm](https://img.shields.io/npm/l/basta.svg?style=flat-square)](https://www.npmjs.com/package/basta)

Duplication detection tool (copy-paste detector) for programming languages, support different type of programming languages like javascript, jsx, typescript, html, java, c, swift, php, go, python and [other 150 languages...](docs/FORMATS.md)


## Installation

```
npm install -g basta

```
or 

```
yarn global add basta
```

## Usage

```
  Usage: basta [options] <path>

  Basta is clone detection tool (copy/paste detector), support 100+ programming languages. Developed by Andrey Kucherenko.
  Example usage: basta -t 10 /path/to/code


  Options:

    -V, --version             output the version number
    -l, --min-lines [number]  min size of duplication in code lines (Default is 5)
    -t, --threshold [number]  threshold for duplication, in case duplications >= threshold basta will exit with error
    -c, --config [string]     path to config file (Default is .basta.json in <path>)
    -e, --exclude [string]    glob pattern for files what should be excluded from duplication detection
    -r, --reporter [string]   reporter to use (Default is console)
    -o, --output [string]     reporter to use (Default is ./report/)
    -b, --blame               blame authors of duplications (get information about authors from git)
    -s, --silent              Do not write detection progress and result to a console
    -d, --debug               show debug information(options list and selected files)
    --list                    show list of all supported formats
    --dontSkipComments        don't skip comments
    -h, --help                output usage information
```

If file `.basta.json` located in the root of project, values from the file will be used as defaults.
`.basta.json` should be correct json file:
```json
{
  "exclude": [
    "**/node_modules/**",
    "**/*.min.js",
    "**/*.!(vue|html)"
  ],
  "path": "./fixtures/",
  "threshold": 10,
  "silent": true
}
```

## TODO

Basta tool is continuously improved, all plans are [here](TODO.md). Please feel free to add new feature requests.

## License

[The MIT License](LICENSE)