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

import type { SourceFile } from 'typescript';
import { SyntaxKind } from 'typescript';
import { firstCharacterToUppercase, getClassNameSet } from '../common/commonUtils';
import type { ReturnTypeEntity } from '../common/commonUtils';
import { getImportDeclarationArray } from '../declaration-node/importAndExportDeclaration';
import type { ImportElementEntity } from '../declaration-node/importAndExportDeclaration';
import type { MethodEntity } from '../declaration-node/methodDeclaration';

/**
 * get warn console template
 * @param interfaceNameOrClassName
 * @param functionNameOrPropertyName
 * @returns
 */
export function getWarnConsole(interfaceNameOrClassName: string, functionNameOrPropertyName: string): string {
  return `console.warn('The ${interfaceNameOrClassName}.${functionNameOrPropertyName} interface in the Previewer is a mocked implementation and may behave differently than on a real device.');\n`;
}

/**
 * generate return statement;
 * @param returnType
 * @param sourceFile
 * @returns
 */
export function getReturnStatement(returnType: ReturnTypeEntity, sourceFile: SourceFile): string {
  if (returnType.returnKind === SyntaxKind.TypeReference) {
    if (returnType.returnKindName.startsWith('Promise')) {
      return `return new Promise((resolve, reject) => {
        resolve('[PC Preview] unknown type');
      })`;
    } else if (returnType.returnKindName === 'T') {
      return 'return \'[PC Preview] unknown type\'';
    } else if (returnType.returnKindName === 'String') {
      return `return ${returnType.returnKindName}(...args)`;
    } else if (returnType.returnKindName === 'ArrayBuffer') {
      return `return new ${returnType.returnKindName}(0)`;
    } else if (returnType.returnKindName.startsWith('Array')) {
      if (returnType.returnKindName.includes('<') && returnType.returnKindName.includes('>')) {
        return `return [${generateGenericTypeToMockValue(returnType.returnKindName)}]`;
      } else {
        return `return new ${returnType.returnKindName}()`;
      }
    } else if (returnType.returnKindName.startsWith('Readonly')) {
      return `return ${returnType.returnKindName.split('<')[1].split('>')[0]}`;
    } else if (checkIsGenericSymbol(returnType.returnKindName)) {
      return `return '[PC Preview] unknown iterableiterator_${returnType.returnKindName}'`;
    } else if (returnType.returnKindName.startsWith('Uint8Array')) {
      return `return new ${returnType.returnKindName}()`;
    } else if (returnType.returnKindName.startsWith('IterableIterator')) {
      if (returnType.returnKindName.includes(',')) {
        return `let index = 0;
        const IteratorEntriesMock = {
          *[Symbol.iterator]() {
            yield ['[PC Preview] unknown paramIterMock_K', '[PC Preview] unknown paramIterMock_V'];
          },
          next: () => {
            if (index < 1) {
              const returnValue = ['[PC Previwe] unknown paramIterMock_K', '[PC Previwe] unknown paramIterMock_V'];
              index++;
              return {
                value: returnValue,
                done: false
              };
            } else {
              return {
                done: true
              };
            }
          }
        };
        return IteratorEntriesMock;`;
      } else {
        return `let index = 0;
        const IteratorStringMock = {
          *[Symbol.iterator]() {
            yield '[PC Preview] unknown string';
          },
          next: () => {
            if (index < 1) {
              const returnValue = '[PC Previwe] unknown string';
              index++;
              return {
                value: returnValue,
                done: false
              };
            } else {
              return {
                done: true
              };
            }
          }
        };
        return IteratorStringMock;`;
      }
    } else if (returnType.returnKindName.includes('<T>')) {
      const tmpReturn = returnType.returnKindName.split('<')[0];
      if (tmpReturn.startsWith('Array')) {
        return 'return []';
      } else {
        `return new ${tmpReturn}()`;
      }
    } else if (returnType.returnKindName.includes('<')) {
      return `return new ${returnType.returnKindName.split('<')[0]}()`;
    } else {
      if (getClassNameSet().has(returnType.returnKindName)) {
        if (returnType.returnKindName === 'Want') {
          return 'return mockWant().Want';
        } else {
          return `return new ${returnType.returnKindName}()`;
        }
      } else if (propertyTypeWhiteList(returnType.returnKindName) === returnType.returnKindName) {
        return `return ${getTheRealReferenceFromImport(sourceFile, returnType.returnKindName)}`;
      } else {
        return `return ${propertyTypeWhiteList(returnType.returnKindName)}`;
      }
    }
  } else if (returnType.returnKind === SyntaxKind.UnionType) {
    const returnNames = returnType.returnKindName.split('|');
    let returnName = returnNames[0];
    for (let i = 0; i < returnNames.length; i++) {
      if (!returnNames[i].includes('[]') && !returnNames[i].includes('<')) {
        returnName = returnNames[i];
        break;
      }
    }
    if (returnName.trimStart().trimEnd() === 'void') {
      return '';
    }
    if (getClassNameSet().has(returnName)) {
      return `return new ${returnName}()`;
    } else {
      return `return ${getBaseReturnValue(returnName.trimStart().trimEnd())}`;
    }
  } else {
    return 'return \'[PC Preview] unknown type\'';
  }
  return 'return \'[PC Preview] unknown type\'';
}

/**
 * special property whitelist
 * @param propertyTypeName
 * @returns
 */
export function propertyTypeWhiteList(propertyTypeName: string): boolean | number | string {
  const whiteList = ['GLboolean', 'GLuint', 'GLenum', 'GLint', 'NotificationFlags'];
  if (whiteList.includes(propertyTypeName)) {
    if (propertyTypeName === 'NotificationFlags' || propertyTypeName === 'GLenum') {
      return `'[PC Preview] unknown ${propertyTypeName}'`;
    } else if (propertyTypeName === 'GLboolean') {
      return true;
    } else {
      return 0;
    }
  } else {
    return propertyTypeName;
  }
}

/**
 * get basic return value
 * @param value
 * @returns
 */
export function getBaseReturnValue(value: string): string | number | boolean {
  if (value === 'string') {
    return '\'\'';
  } else if (value === 'number') {
    return 0;
  } else if (value === 'boolean') {
    return true;
  } else if (value === 'Object' || value === 'object') {
    return '{}';
  } else if (checkIsGenericSymbol(value)) {
    return '\'[PC Preview] unknown type\'';
  } else if (value === 'WebGLActiveInfo') {
    return '{size: \'[PC Preview] unknown GLint\', type: 0, name: \'[PC Preview] unknown name\'}';
  } else {
    return value;
  }
}

/**
 * get current sourceFile import data
 * @param sourceFile
 * @param typeName
 * @returns
 */
export function getTheRealReferenceFromImport(sourceFile: SourceFile, typeName: string): string {
  const importArray = getImportDeclarationArray(sourceFile);
  let returnName = '';
  let isFromImport = false;
  let isOhos = false;
  let mockMockName = '';
  importArray.forEach(value => {
    if (typeName.includes('.') && typeName.split('.')[0] === value.importElements) {
      isFromImport = true;
      if (value.importPath.includes('@ohos')) {
        isOhos = true;
      }
      if (value.importElements.trimStart().trimEnd() === typeName.split('.')[0]) {
        const tmpArr = value.importPath.split('.');
        mockMockName = tmpArr[tmpArr.length - 1].replace(/'/g, '').replace(/"/g, '');
      }
    }
  });
  if (isFromImport) {
    const splitReturnKindName = typeName.split('.');
    let left = '';
    for (let i = 1; i < splitReturnKindName.length; i++) {
      left += `.${splitReturnKindName[i]}`;
    }
    if (isOhos) {
      returnName = `mock${firstCharacterToUppercase(mockMockName)}()${left}`;
    }
  } else {
    returnName = getImportTypeAliasNameFromImportElements(importArray, typeName);
  }
  return returnName.split('<')[0];
}

/**
 * get return type alias, for example: {Context as _Context} return _Context
 * @param importElementEntity
 * @param typeName
 * @returns
 */
function getImportTypeAliasNameFromImportElements(importElementEntity: ImportElementEntity[], typeName: string): string {
  for (let i = 0; i < importElementEntity.length; i++) {
    if (importElementEntity[i].importElements.includes('_')) {
      const importElements = importElementEntity[i].importElements.replace('{', '').replace('}', '').split(',');
      for (let j = 0; j < importElements.length; j++) {
        const element = importElements[j].trimStart().trimEnd();
        if (!element) {
          continue;
        }
        if (`_${typeName}` === element.split('as')[1].trim()) {
          return `_${typeName}`;
        }
      }
    }
  }
  if (typeName === 'Want') {
    typeName = 'mockWant().Want';
  } else if (typeName === 'InputMethodExtensionContext') {
    typeName = 'mockInputMethodExtensionContext().InputMethodExtensionContext';
  }
  return typeName;
}

/**
 * check is generic symbol
 * @param type
 * @returns
 */
export function checkIsGenericSymbol(type: string): boolean {
  const words = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  return words.includes(type);
}

/**
 * generate basic type default value
 * @param kindName
 * @returns
 */
export function generateGenericTypeToMockValue(kindName: string): string | number | boolean {
  const genericTypeName = kindName.split('<')[1].split('>')[0];
  if (genericTypeName === 'string') {
    return '\'\'';
  } else if (genericTypeName === 'number') {
    return 0;
  } else if (genericTypeName === 'boolean') {
    return true;
  } else if (genericTypeName === 'Object' || genericTypeName === 'object') {
    return '{}';
  } else {
    return '';
  }
}

const paramsTypeStart = {
  'void': '[PC Preview] unknown type',
  'Array': '[]',
  'Object': '{}',
  '{': '{}',
  'string': '',
  'number': 0,
  'boolean': false
};

const removeCallback = (str: string) => {
  const callbackParams = {
    type: 'Callback',
    value: ''
  };
  if (str.startsWith('Callback')) {
    const reg = /callback<(.*?)>/;
    const matchValue = str.match(reg);
    callbackParams.value = matchValue ? matchValue[1] : '';
    callbackParams.type = 'Callback';
  } else if (str.startsWith('AsyncCallback')) {
    const reg = /AsyncCallback<(.*?)>/;
    const matchValue = str.match(reg);
    callbackParams.value = matchValue ? matchValue[1] : '';
    callbackParams.type = 'AsyncCallback';
  }
  return callbackParams;
};

const isInImportType = (mockApi: string, value: string) => {
  let hasDotFirstWorld = '';
  if (value.includes('.')) {
    hasDotFirstWorld = value.split('.')[0];
  }
  if (hasDotFirstWorld && mockApi.includes(`import { mock${firstLetterWord(hasDotFirstWorld)} `)) {
    return 'isHasDotImportMock';
  }
  if (hasDotFirstWorld && mockApi.includes(`import { ${firstLetterWord(hasDotFirstWorld)} `)) {
    return 'isNoHasDotImportMock';
  }
  if (mockApi.includes(`import { mock${firstLetterWord(value)} `)) {
    return 'isImportMock';
  }
  if (mockApi.includes(`import { ${value} `)) {
    return 'isImport';
  }
  return 'noImport';
};

const firstLetterWord = (word: string) => {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
};

const hasDotFirstWord = (str: string) => {
  return str.includes('.') ? str.split('.')[0] : str;
};

/**
 * get callback statement
 * @returns image.PixelMap  mockImage.PixelMap  mockImage
 */
export function getCallbackStatement(mockApi: string, paramTypeString?: string): string {
  let outPut = `if (args && typeof args[args.length - 1] === 'function') {
    args[args.length - 1].call(this,`;
  const callbackError = "{'code': '','data': '','name': '','message': '','stack': ''}";
  let callbackData = '';
  if (paramTypeString) {
    const callbackParams = removeCallback(paramTypeString);
    let importType = '';
    if (callbackParams.value) {
      importType = isInImportType(mockApi, callbackParams.value);
    }
    if (importType === 'isHasDotImportMock') {
      const upperWord = firstLetterWord(callbackParams.value); // Image.PixelMap
      const firstWord = hasDotFirstWord(upperWord); // Image
      callbackData = `mock${firstWord}()${upperWord.slice(firstWord.length)}`;
    } else if (importType === 'isNoHasDotImportMock') {
      callbackData = callbackParams.value;
    } else if (importType === 'isImportMock') {
      callbackData = `mock${firstLetterWord(callbackParams.value)}()`;
    } else if (importType === 'isImport') {
      callbackData = callbackParams.value;
    } else if (importType === 'noImport') {
      let paramsTypeNoHas = true;
      if (callbackParams.value.endsWith(']')) {
        callbackData = '[]';
      } else {
        Object.keys(paramsTypeStart).forEach(item => {
          if (callbackParams.value.startsWith(item)) {
            callbackData = paramsTypeStart[item];
            paramsTypeNoHas = false;
          }
        });
        if (paramsTypeNoHas) {
          callbackData = callbackParams.value;
        }
      }
    } else {
      callbackData = '[PC Preview] unknown type';
    }
    if (callbackParams.type === 'AsyncCallback') {
      outPut += ` ${callbackError},`;
    }
  }
  outPut += callbackData === '[PC Preview] unknown type' ? ` '${callbackData}');\n}` : ` ${callbackData});\n}`;
  return outPut;
}

/**
 * get iterator template string
 * @param methodEntity
 * @returns
 */
export function generateSymbolIterator(methodEntity: MethodEntity): string {
  let iteratorMethod = '';
  if (methodEntity.returnType.returnKindName.includes('<[')) {
    iteratorMethod += `let index = 0;
    const IteratorMock = {
      next: () => {
        if (index < 1) {
          const returnValue = ['[PC Previwe] unknown iterableiterator_k', '[PC Previwe] unknown iterableiterator_v'];
          index++;
          return {
            value: returnValue,
            done: false
          };
        } else {
          return {
            done: true
          };
        }
      }
    };
    return IteratorMock;`;
  } else {
    iteratorMethod += `let index = 0;
    const IteratorMock = {
      next: () => {
        if (index < 1) {
          index++;
          return {
            value: '[PC Preview] unknown any',
            done: false
          };
        } else {
          return {
            done: true
          };
        }
      }
    };
    return IteratorMock;`;
  }

  return iteratorMethod;
}
