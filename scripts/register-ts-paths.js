// Lets ts-node resolve the @medicpadi-backend/* path aliases from tsconfig.base.json,
// which the TypeORM CLI needs to load entities. Preload with `-r ./scripts/register-ts-paths.js`.
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const { config } = ts.readConfigFile(
  path.join(root, 'tsconfig.base.json'),
  ts.sys.readFile,
);
const { baseUrl = '.', paths = {} } = config.compilerOptions;

// The repo only uses exact aliases (no wildcards)
const aliases = new Map(
  Object.entries(paths).map(([alias, [target]]) => [
    alias,
    path.resolve(root, baseUrl, target),
  ]),
);

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolveFilename.call(this, aliases.get(request) ?? request, ...rest);
};
