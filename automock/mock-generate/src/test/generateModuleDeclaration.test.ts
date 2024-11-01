/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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

import fs from 'fs';
import path from 'path';
import { describe, expect, test } from '@jest/globals';
import { createSourceFile, ScriptTarget } from 'typescript';
import { generateModuleDeclaration } from '../generate/generateModuleDeclaration';

const filePath = path.join(__dirname, './api/@ohos.ability.ability.d.ts');
const code = fs.readFileSync(filePath);
const sourceFile = createSourceFile(filePath, code.toString(), ScriptTarget.Latest);

describe('generateModuleDeclaration.ts file test', () => {
  test('Test the generateModuleDeclaration function', () => {
    const moduleEntity = {
      typeAliasDeclarations: [
        {
          typeAliasName: 'DataAbilityHelper',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_DataAbilityHelper',
              typeKind: 78
            }
          ],
          modifiers: [92]
        },
        {
          typeAliasName: 'PacMap',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_PacMap',
              typeKind: 78
            }
          ],
          modifiers: [92]
        },
        {
          typeAliasName: 'DataAbilityOperation',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_DataAbilityOperation',
              typeKind: 78
            }
          ],
          modifiers: [92]
        },
        {
          typeAliasName: 'DataAbilityResult',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_DataAbilityResult',
              typeKind: 78
            }
          ],
          modifiers: [92]
        },
        {
          typeAliasName: 'AbilityResult',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_AbilityResult',
              typeKind: 78
            }
          ],
          modifiers: [92]
        },
        {
          typeAliasName: 'ConnectOptions',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_ConnectOptions',
              typeKind: 78
            }
          ],
          modifiers: [92]
        },
        {
          typeAliasName: 'StartAbilityParameter',
          typeAliasTypeKind: 173,
          typeAliasTypeElements: [
            {
              typeName: '_StartAbilityParameter',
              typeKind: 78
            }
          ],
          modifiers: [92]
        }
      ],
      classDeclarations: [],
      interfaceDeclarations: [],
      functionDeclarations: new Map(),
      enumDeclarations: [],
      moduleDeclarations: [],
      variableStatements: [],
      moduleImportEquaqls: [],
      exportDeclarations: [],
      exportModifiers: [133],
      moduleName: 'ability'
    };
    const filename = 'ohos_ability_ability';
    const mockApi = 'import { DataAbilityHelper as _DataAbilityHelper } from \'./ability/dataAbilityHelper\''
      + 'import { PacMap as _PacMap } from \'./ability/dataAbilityHelper\''
      + 'import { DataAbilityOperation as _DataAbilityOperation } from \'./ability/dataAbilityOperation\''
      + 'import { DataAbilityResult as _DataAbilityResult } from \'./ability/dataAbilityResult\''
      + 'import { AbilityResult as _AbilityResult } from \'./ability/abilityResult\''
      + 'import { ConnectOptions as _ConnectOptions } from \'./ability/connectOptions\''
      + 'import { StartAbilityParameter as _StartAbilityParameter } from \'./ability/startAbilityParameter\'';
    const extraImport = [];
    const importDeclarations = [
      {
        importPath: './ability/dataAbilityHelper',
        importElements: '{ DataAbilityHelper as _DataAbilityHelper }'
      },
      {
        importPath: './ability/dataAbilityHelper',
        importElements: '{ PacMap as _PacMap }'
      },
      {
        importPath: './ability/dataAbilityOperation',
        importElements: '{ DataAbilityOperation as _DataAbilityOperation }'
      },
      {
        importPath: './ability/dataAbilityResult',
        importElements: '{ DataAbilityResult as _DataAbilityResult }'
      },
      {
        importPath: './ability/abilityResult',
        importElements: '{ AbilityResult as _AbilityResult }'
      },
      {
        importPath: './ability/connectOptions',
        importElements: '{ ConnectOptions as _ConnectOptions }'
      },
      {
        importPath: './ability/startAbilityParameter',
        importElements: '{ StartAbilityParameter as _StartAbilityParameter }'
      }
    ];
    const data = 'export function mockAbility() {\n\tconst ability = {\n\n\n\tDataAbilityHelper: DataAbilityHelper,\n'
      + 'PacMap: PacMap,\nDataAbilityOperation: DataAbilityOperation,\nDataAbilityResult: DataAbilityResult,\n'
      + 'AbilityResult: AbilityResult,\nConnectOptions: ConnectOptions,\nStartAbilityParameter: StartAbilityParameter,\n\t'
      + '};\n\treturn ability;}\nconst DataAbilityHelper = _DataAbilityHelper;\nconst PacMap = _PacMap;\n'
      + 'const DataAbilityOperation = _DataAbilityOperation;\nconst DataAbilityResult = _DataAbilityResult;\n'
      + 'const AbilityResult = _AbilityResult;\nconst ConnectOptions = _ConnectOptions;\n'
      + 'const StartAbilityParameter = _StartAbilityParameter;\n';
    const result = generateModuleDeclaration(
      moduleEntity,
      sourceFile,
      filename,
      mockApi,
      extraImport,
      importDeclarations
    );
    expect(result).toBe(data);
  });
});
