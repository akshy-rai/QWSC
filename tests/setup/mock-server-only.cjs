/**
 * CommonJS mock for the `server-only` package.
 *
 * tsx compiles TypeScript files via CJS require() in test mode.
 * The real `server-only` package throws unless running in a Next.js
 * React Server Component environment. This hook patches Module._load
 * before the test files are evaluated so that `require('server-only')`
 * becomes a silent no-op.
 *
 * Must be loaded via --require (CJS), e.g.:
 *   node -r ./tests/setup/mock-server-only.cjs ...
 */

'use strict';

const Module = require('node:module');

const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === 'server-only') {
    return {}; // no-op mock
  }
  return originalLoad.apply(this, arguments);
};
