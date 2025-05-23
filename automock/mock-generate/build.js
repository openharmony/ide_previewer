/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
function compileMock(apiInputPath) {
  const mockJsPath = path.join(__dirname, '..', './runtime/main/extend/systemplugin');
  let nodeDir = '';
  nodeDir = './current/bin/node';

  
  const bat = spawnSync(`
  ${path.join(__dirname, '..', nodeDir)} ${path.join(__dirname, '..', './node_modules/typescript/bin/tsc')} && 
  ${path.join(__dirname, '..', nodeDir)} ${path.join(__dirname, 'dist')}/main.js ${apiInputPath} && 
  ${path.join(__dirname, '..', nodeDir)} ${path.join(__dirname, '..', './node_modules/eslint/bin/eslint.js')} 
  -c .eslintrc --fix ${mockJsPath}/**/*.js`, {
    cwd: __dirname,
    shell: true
  });
}
const PARAM_INDEX = 2;
const apiInputPath = process.argv[PARAM_INDEX];
compileMock(apiInputPath);
