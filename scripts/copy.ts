import * as fs from 'fs-extra';
import * as path from 'path';

const LIB_PATH = './lib';
const PRESERVED_FILES = ['package.json', 'README.md'];

for (const file of PRESERVED_FILES) {
  fs.copySync(file, path.join(LIB_PATH, file));
}
