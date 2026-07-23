#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { compileResearch } = require('./lib/research-publication');

try {
  const result = compileResearch({ rootDir: path.resolve(__dirname, '..') });
  console.log(`Compiled and verified ${result.articleCount} research article(s)`);
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
}
