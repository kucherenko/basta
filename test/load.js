'use strict';

const glob = require('glob');
const path = require('path');

module.exports = (sourceDir) =>
{
    require('./testConfig');

    const SPECS_PATTERN = path.join(sourceDir, '/**/*.test.ts');

    glob.sync(SPECS_PATTERN).forEach(
        (spec) => require(spec)
    );

}
