import * as fs from 'fs-extra';
import * as path from 'path';

const PACKAGE_JSON = 'package.json';
const LIB_PATH = './lib';

fs.copySync(PACKAGE_JSON, path.join(LIB_PATH, PACKAGE_JSON));
