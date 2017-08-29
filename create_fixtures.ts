import {FormatMetadata, modeInfo} from './src/formats/meta';
import {ensureDirSync} from 'fs-extra';
import {resolve} from 'path';
import {touch} from 'shelljs';

modeInfo.forEach((mode: FormatMetadata) => {
    const dirName = resolve(__dirname, 'fixtures', mode.mode);
    ensureDirSync(dirName);
    if (mode.ext) {
        mode.ext.forEach((ext) => {
            touch(resolve(dirName, 'file1.' + ext));
            touch(resolve(dirName, 'file2.' + ext));
        });
    }
});
