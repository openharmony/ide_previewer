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

import path from 'path';
import type { SourceFile } from 'typescript';
import { SyntaxKind } from 'typescript';
import { allEnumMap, fileImportDeclarations, firstCharacterToUppercase, getClassNameSet, specialType } from '../common/commonUtils';
import type { EunmType, ReturnTypeEntity } from '../common/commonUtils';
import { getImportDeclarationArray } from '../declaration-node/importAndExportDeclaration';
import type { ImportElementEntity } from '../declaration-node/importAndExportDeclaration';
import type { MethodEntity } from '../declaration-node/methodDeclaration';
import type { FunctionEntity } from '../declaration-node/functionDeclaration';
import type { MethodSignatureEntity } from '../declaration-node/methodSignatureDeclaration';

const repeatReturn = `} else {
        return {
          done: true
        };
      }`;

const repeatString = `index++;
        return {
          value: returnValue,
          done: false
        };
      ${repeatReturn}
    }
  };`;

const iteratorEntriesMock = `
  let index = 0;
  const IteratorEntriesMock = {
    *[Symbol.iterator]() {
      yield ['[PC Preview] unknown paramIterMock_K', '[PC Preview] unknown paramIterMock_V'];
    },
    next: () => {
      if (index < 1) {
        const returnValue = ['[PC Previwe] unknown paramIterMock_K', '[PC Previwe] unknown paramIterMock_V'];
        ${repeatString}
  return IteratorEntriesMock;
`;

const iteratorStringMock = `
  let index = 0;
  const IteratorStringMock = {
    *[Symbol.iterator]() {
      yield '[PC Preview] unknown string';
    },
    next: () => {
      if (index < 1) {
        const returnValue = '[PC Previwe] unknown string';
        ${repeatString}
  return IteratorStringMock;
`;

/**
 * get warn console template
 * @param interfaceNameOrClassName
 * @param functionNameOrPropertyName
 * @returns
 */
export function getWarnConsole(interfaceNameOrClassName: string, functionNameOrPropertyName: string): string {
  return `console.warn('The ${interfaceNameOrClassName}.${functionNameOrPropertyName} interface in the Previewer is a mocked implementation and may behave differently than on a real device.');\n`;
}

function handlePromiseParams(returnType: ReturnTypeEntity): string {
  const returnKindName = returnType.returnKindName.slice(0, returnType.returnKindName.length - 1).slice(8).trim();
  let returnName = `return new Promise((resolve, reject) => {
    resolve('[PC Preview] unknown type');
  })`;
  Object.keys(paramsTypeStart).forEach(key => {
    if (returnKindName.startsWith(key)) {
      const data = paramsTypeStart[key] === '[PC Preview] unknown type' ? `'${paramsTypeStart[key]}'` : `${paramsTypeStart[key]}`;
      returnName = `return new Promise((resolve, reject) => {
        resolve(${data});
      })`;
    }
  });
  return returnName;
}

/**
 * generate return statement;
 * @param returnType
 * @param sourceFile
 * @returns
 */
export function getReturnStatement(returnType: ReturnTypeEntity, sourceFile: SourceFile): string {
  if (returnType.returnKind === SyntaxKind.TypeReference) {
    return handleTypeReferenceReturnBody(returnType, sourceFile);
  } else if (returnType.returnKind === SyntaxKind.UnionType) {
    return handleUnionTypeReturnBody(returnType, sourceFile);
  }
  let returnName = returnType.returnKindName.trim();
  let temp = true;
  if (returnName.endsWith(']')) {
    returnName = '[]';
    temp = false;
  } else {
    Object.keys(paramsTypeStart).forEach(key => {
      if (returnType.returnKindName.startsWith(key)) {
        returnName = paramsTypeStart[key];
        temp = false;
      }
    });
  }
  if (temp) {
    return 'return \'[PC Preview] unknown type\'';
  }
  return `return ${returnName};`;
}

/**
 * TypeReference return statement;
 * @param returnType
 * @param sourceFile
 * @returns
 */
function handleTypeReferenceReturnBody(returnType: ReturnTypeEntity, sourceFile: SourceFile): string {
  if (returnType.returnKindName.startsWith('Promise')) {
    return handlePromiseParams(returnType);
  }
  const judgmentResult = judgmentReturnBody(returnType);
  if (judgmentResult !== '') {
    return judgmentResult;
  }
  const substepResult = substepReturnBody(returnType);
  if (substepResult !== '') {
    return substepResult;
  }
  if (returnType.returnKindName.includes('<')) {
    return returnType.returnKindName.includes(',')
      ? 'return {};'
      : `return new ${returnType.returnKindName.split('<')[0]}()`;
  } else {
    return generateReturnType(returnType, sourceFile);
  }
}

/**
 * generate return type
 * @param returnType
 * @param sourceFile
 * @returns
 */
function generateReturnType(returnType: ReturnTypeEntity, sourceFile: SourceFile): string {
  if (getClassNameSet().has(returnType.returnKindName) && !specialType.includes(returnType.returnKindName)) {
    return returnType.returnKindName === 'Want'
      ? 'return mockWant().Want'
      : `return new ${returnType.returnKindName}()`;
  } else if (getClassNameSet().has(returnType.returnKindName) && specialType.includes(returnType.returnKindName)) {
    return `return ${returnType.returnKindName}`;
  } else if (propertyTypeWhiteList(returnType.returnKindName, sourceFile) === returnType.returnKindName) {
    return `return ${getTheRealReferenceFromImport(sourceFile, returnType.returnKindName)}`;
  } else {
    return `return ${propertyTypeWhiteList(returnType.returnKindName, sourceFile)}`;
  }
}

function judgmentReturnBody(returnType: ReturnTypeEntity): string {
  if (returnType.returnKindName === 'T') {
    return 'return \'[PC Preview] unknown type\'';
  } else if (returnType.returnKindName === 'object' || returnType.returnKindName === 'Object') {
    return 'return {}';
  } else if (returnType.returnKindName === 'Function') {
    return 'return \'[PC Preview] unknown type\'';
  } else if (returnType.returnKindName === 'String' || returnType.returnKindName === 'string') {
    return `return ${returnType.returnKindName}(...args)`;
  } else if (returnType.returnKindName === 'number' || returnType.returnKindName === 'Number') {
    return 'return 0';
  } else if (returnType.returnKindName === 'boolean' || returnType.returnKindName === 'Boolean') {
    return 'return false';
  } else if (returnType.returnKindName === 'ArrayBuffer') {
    return `return new ${returnType.returnKindName}(0)`;
  } else {
    return '';
  }
}

function substepReturnBody(returnType: ReturnTypeEntity): string {
  if (returnType.returnKindName.startsWith('Array')) {
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
    return returnType.returnKindName.includes(',') ? iteratorEntriesMock : iteratorStringMock;
  } else if (returnType.returnKindName.includes('<T>')) {
    const tmpReturn = returnType.returnKindName.split('<')[0];
    return tmpReturn.startsWith('Array') ? 'return []' : 'return {}';
  } else {
    return '';
  }
}

/**
 * UnionType return statement;
 * @param returnType
 * @returns
 */
function handleUnionTypeReturnBody(returnType: ReturnTypeEntity, sourceFile: SourceFile): string {
  const returnNames = returnType.returnKindName.split('|');
  let returnName = returnNames[0];
  for (let i = 0; i < returnNames.length; i++) {
    if (!returnNames[i].includes('[]') && !returnNames[i].includes('<')) {
      returnName = returnNames[i];
      break;
    }
  }
  if (allEnumMap.has(returnName.trim())) {
    let propertySignatureBody = '';
    propertySignatureBody = getEnumReturnValue(propertySignatureBody, returnName.trim(), sourceFile);
    if (propertySignatureBody !== '') {
      return `${propertySignatureBody}`;
    }
  }
  if (returnName.trim() === 'void') {
    return '';
  }
  if (getClassNameSet().has(returnName)) {
    return `return new ${returnName}()`;
  } else {
    return `return ${getBaseReturnValue(returnName.trim())}`;
  }
}

/**
 * special property whitelist
 * @param propertyTypeName
 * @returns
 */
export function propertyTypeWhiteList(propertyTypeName: string, sourceFile: SourceFile): boolean | number | string {
  const whiteList = ['GLboolean', 'GLuint', 'GLenum', 'GLint', 'NotificationFlags'];
  if (allEnumMap.has(propertyTypeName)) {
    let propertySignatureBody = '';
    propertySignatureBody = getEnumReturnValue(propertySignatureBody, propertyTypeName, sourceFile);
    if (propertySignatureBody !== '') {
      return `${propertySignatureBody}`;
    }
  }
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
      if (value.importElements.trim() === typeName.split('.')[0]) {
        const tmpArr = value.importPath.split('.');
        mockMockName = tmpArr[tmpArr.length - 1].replace(/["']/g, '');
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
      if (mockMockName === 'observer') {
        returnName = `${mockMockName}()${left}`;
      } else {
        returnName = `mock${firstCharacterToUppercase(mockMockName)}()${left}`;
      }
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
function getImportTypeAliasNameFromImportElements(
  importElementEntity: ImportElementEntity[],
  typeName: string
): string {
  for (let i = 0; i < importElementEntity.length; i++) {
    if (importElementEntity[i].importElements.includes('_')) {
      const importElements = importElementEntity[i].importElements.replace('{', '').replace('}', '').split(',');
      typeName = getTypeName(importElements, typeName);
    }
  }
  if (typeName === 'Want') {
    typeName = 'mockWant().Want';
  } else if (typeName === 'InputMethodExtensionContext') {
    typeName = 'mockInputMethodExtensionContext().InputMethodExtensionContext';
  } else if (typeName.includes('<') && typeName.includes(',')) {
    typeName = '{}';
  }
  return typeName;
}

/**
 * get type name , for example: {Context as _Context} return _Context
 * @param importElements
 * @param typeName
 * @returns
 */
function getTypeName(importElements: string[], typeName: string): string {
  for (let j = 0; j < importElements.length; j++) {
    const element = importElements[j].trim();
    if (!element) {
      continue;
    }
    if (`_${typeName}` === element.trim()) {
      return `_${typeName}`;
    }
    if (element.includes(' as ') && `_${typeName}` === element.split('as')[1].trim()) {
      return `_${typeName}`;
    }
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

export const paramsTypeStart = {
  'void': '\'[PC Preview] unknown type\'',
  'Array': '[]',
  'Object': '{}',
  'object': '{}',
  '{': '{}',
  'string': '""',
  'String': '""',
  'number': 0,
  'Number': 0,
  'boolean': false,
  'Boolean': false,
  'ArrayBuffer': 'new ArrayBuffer(0)',
  'Uint8Array': 'new Uint8Array()',
  'unknown': '\'[PC Preview] unknown type\''
};

const removeCallback = (str: string): { type: string; value: string } => {
  const callbackParams = {
    type: 'Callback',
    value: ''
  };
  if (str.startsWith('Callback')) {
    if (str.lastIndexOf('>') < str.lastIndexOf(' | ')) {
      callbackParams.value = str.slice(0, str.lastIndexOf('>')).slice(9).trim();
      callbackParams.type = 'Callback';
    } else {
      callbackParams.value = str.slice(0, str.length - 1).slice(9).trim();
      callbackParams.type = 'Callback';
    }
  } else if (str.startsWith('AsyncCallback')) {
    callbackParams.value = str.slice(0, str.length - 1).slice(14).trim();
    callbackParams.type = 'AsyncCallback';
  }
  let isHaveAnglebrackets = false;
  if (callbackParams.value.includes('<') && callbackParams.value.includes(',')) {
    isHaveAnglebrackets = true;
  }
  if (callbackParams.value.includes(',') && !isHaveAnglebrackets) {
    callbackParams.value = callbackParams.value.split(',')[0].trim();
  }
  return callbackParams;
};

const isInImportType = (mockApi: string, value: string): string => {
  let hasDotFirstWorld = '';
  if (value.includes('.')) {
    hasDotFirstWorld = value.split('.')[0].trim();
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

const firstLetterWord = (word: string): string => {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
};

const hasDotFirstWord = (str: string): string => {
  return str.includes('.') ? str.split('.')[0] : str;
};

function callbackHasNoImportType(callbackParams: { type: string; value: string }): string {
  let callbackData = '';
  let paramsTypeHasType = true;
  if (callbackParams.value.endsWith(']')) {
    callbackData = '[]';
  } else {
    Object.keys(paramsTypeStart).forEach(item => {
      if (callbackParams.value.startsWith(item)) {
        callbackData = paramsTypeStart[item];
        paramsTypeHasType = false;
      }
    });
    if (paramsTypeHasType) {
      callbackData = callbackParams.value;
      if (callbackParams.value.includes('<')) {
        callbackData = `${callbackParams.value.split('<')[0]}`;
      }
      if (callbackParams.value.includes('<') && callbackParams.value.includes(',')) {
        callbackData = '{}';
      }
    }
    if (callbackParams.value === 'Date') {
      callbackData = 'new Date()';
    }
    if (callbackParams.value === 'Uint8Array') {
      callbackData = 'new Uint8Array()';
    }
    if (callbackParams.value === 'T') {
      callbackData = '[PC Preview] unknown type';
    }
  }
  return callbackData;
}

/**
 * get callback parameters data
 * @returns data: parameters data: type: AsyncCallback or Callback
 */
const setCallbackData = (mockApi: string, paramTypeString: string): { data: string; type: string } => {
  const callbackParams = removeCallback(paramTypeString);
  let callbackData = '';
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
    callbackData = callbackHasNoImportType(callbackParams);
  } else {
    callbackData = '[PC Preview] unknown type';
  }
  return {
    data: callbackData,
    type: callbackParams.type
  };
};

/**
 * get callback statement
 * @returns callback statement
 */
export function getCallbackStatement(mockApi: string, paramTypeString?: string): string {
  let outPut = `if (args && typeof args[args.length - 1] === 'function') {
    args[args.length - 1].call(this,`;
  const callbackError = "{'code': '','data': '','name': '','message': '','stack': ''}";
  let callbackDataParams = {
    type: '',
    data: '[PC Preview] unknown type'
  };
  if (paramTypeString) {
    callbackDataParams = setCallbackData(mockApi, paramTypeString);
  }
  if (callbackDataParams?.type === 'AsyncCallback') {
    outPut += ` ${callbackError},`;
  }
  outPut +=
    callbackDataParams.data === '[PC Preview] unknown type'
      ? ` '${callbackDataParams.data}');\n}`
      : ` ${callbackDataParams.data});\n}`;
  return outPut;
}

/**
 * get callback statement
 * @returns callback statement
 */
export function getOverloadedFunctionCallbackStatement(
  entityArray: Array<FunctionEntity> | Array<MethodEntity> | Array<MethodSignatureEntity>,
  sourceFile: SourceFile,
  mockApi: string
): string {
  let overloadedCallbackBody = '';
  entityArray.forEach(functionBody => {
    let content = '';
    let firstParamContent = '';
    let callbackParamContent = '';
    functionBody.args.forEach(arg => {
      if (
        arg.paramTypeString.startsWith("'") && arg.paramTypeString.endsWith("'") ||
        arg.paramTypeString.startsWith('"') && arg.paramTypeString.endsWith('"')
      ) {
        const paramTypeStringArr = arg.paramTypeString.split('|');
        firstParamContent += `if (args && [${paramTypeStringArr}].includes(args[0])) {\n`;
      }
      if (['callback', 'observercallback', 'listener', 'synccallback'].includes(arg.paramName.toLowerCase())) {
        callbackParamContent += getCallbackBody(mockApi, arg.paramTypeString);
      }
    });
    if (firstParamContent) {
      content = `${firstParamContent}${callbackParamContent}\n}` + content;
    } else {
      content += callbackParamContent;
    }
    overloadedCallbackBody += content;
  });
  overloadedCallbackBody += '\n';
  return overloadedCallbackBody;
}

/**
 * get callback statement
 * @returns callback statement
 */
function getCallbackBody(mockApi: string, paramString: string): string {
  let bodyInfo = `if (args && typeof args[args.length - 1] === 'function') {
    args[args.length - 1].call(this,`;
  const callbackError = "{'code': '','data': '','name': '','message': '','stack': ''}";
  if (paramString === 'ErrorCallback') {
    bodyInfo += callbackError + ');\n}';
    return bodyInfo;
  }
  let callbackDataParams = {
    type: '',
    data: '[PC Preview] unknown type'
  };
  if (paramString) {
    callbackDataParams = setCallbackData(mockApi, paramString);
  }
  if (callbackDataParams?.type === 'AsyncCallback') {
    bodyInfo += ` ${callbackError},`;
  }
  bodyInfo +=
    callbackDataParams.data === '[PC Preview] unknown type'
      ? ` '${callbackDataParams.data}');\n`
      : ` ${callbackDataParams.data});\n`;
  bodyInfo += '}';
  return bodyInfo;
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
        }
        return {
          done: true
        };
      }
    };
    return IteratorMock;`;
  }

  return iteratorMethod;
}

function handleReturnDataNoImportType(returnPromiseParams: string, returnType: ReturnTypeEntity): string {
  let returnData = '';
  if (returnPromiseParams.startsWith('[') || returnPromiseParams.endsWith(']')) {
    returnData = '[]';
  } else {
    let paramsTypeHasType = true;
    Object.keys(paramsTypeStart).forEach(item => {
      if (returnPromiseParams.startsWith(item)) {
        returnData = paramsTypeStart[item];
        paramsTypeHasType = false;
      }
    });
    if (paramsTypeHasType) {
      returnData = returnPromiseParams;
      if (returnPromiseParams.includes('<')) {
        returnData = `${returnPromiseParams.split('<')[0]}`;
      }
      if (returnPromiseParams.includes('<') && returnPromiseParams.includes(',')) {
        returnData = '{}';
      }
    }
    if (returnPromiseParams === 'Date') {
      returnData = 'new Date()';
    }
    if (returnPromiseParams === 'T') {
      returnData = '"[PC Preview] unknown type"';
    }
    if (returnType.returnKindName.startsWith('Readonly')) {
      returnData = `${returnType.returnKindName.split('<')[1].split('>')[0]}`;
    }
    if (checkIsGenericSymbol(returnType.returnKindName)) {
      returnData = `'[PC Preview] unknown iterableiterator_${returnType.returnKindName}'`;
    }
  }
  return returnData;
}

/**
 * generate more function name return statement;
 * @param isReturnPromise
 * @param returnType
 * @param sourceFile
 * @param mockApi
 * @returns
 */
export function getReturnData(
  isCallBack: boolean,
  isReturnPromise: boolean,
  returnType: ReturnTypeEntity,
  sourceFile: SourceFile,
  mockApi: string
): string {
  // If the return value is an iterator IterableIterator, then iteratorEntriesMock is directly returned
  if (returnType.returnKindName.startsWith('IterableIterator')) {
    return returnType.returnKindName.includes(',') ? iteratorEntriesMock : iteratorStringMock;
  }
  // If it is a promise, intercept the content of x in promise<x>, which may have the following formats:
  // fun(): y | Promise<y>、 fun(): Promise<x | y | z>、 fun(): Promise<x>、 fun(): Promise<x.y>
  // If it is not a promise, the returned type may be x, x | y | z, x.y
  let returnPromiseParams = returnType.returnKindName;
  if (isReturnPromise) {
    if (returnType.returnKind === SyntaxKind.UnionType) {
      // fun(): y | Promise<y>
      const returnNames = returnPromiseParams.split('|');
      returnPromiseParams = loopReturnNames(returnNames, returnPromiseParams);
    }
    // At this point, obtain the values in these formats: Promise<x | y | z>, Promise<y>, Promise<x.y>, Promise<x>
    const kindName = returnPromiseParams;
    returnPromiseParams = kindName.slice(0, kindName.length - 1).slice(8).trim();
  }
  // At this point, the value type of param in promise<param>may be x, x | y | z, x.y
  if (returnPromiseParams.includes('|')) {
    returnPromiseParams = getSeparatorParam(returnPromiseParams);
  }

  // At this point, the possible types of promiseParam are x, x.y x [] Array<x>
  // Check if it was imported
  let returnData = '"[PC Preview] unknown type"';
  const importType = isInImportType(mockApi, returnPromiseParams);
  if (importType === 'isHasDotImportMock') {
    const upperWord = firstLetterWord(returnPromiseParams); // Image.PixelMap
    const firstWord = hasDotFirstWord(upperWord); // Image
    returnData = `mock${firstWord}()${upperWord.slice(firstWord.length)}`;
  } else if (importType === 'isNoHasDotImportMock') {
    returnData = returnPromiseParams;
  } else if (importType === 'isImportMock') {
    returnData = `mock${firstLetterWord(returnPromiseParams)}()`;
  } else if (importType === 'isImport') {
    returnData = handleReturnDataIsClass(returnPromiseParams);
  } else if (importType === 'noImport') {
    returnData = handleReturnDataNoImportType(returnPromiseParams, returnType);
  } else {
    returnData = '"[PC Preview] unknown type"';
  }
  const data =
    typeof returnData === 'string' && returnData.startsWith('[PC Preview] unknown')
      ? `'${returnData}'`
      : `${returnData}`;
  if (isReturnPromise) {
    return `
        return new Promise((resolve, reject) => {
          resolve(${data});
        })
      `;
  } else {
    return `return ${data}`;
  }
}

/**
 * Handle the case where the return value is class.
 * @param returnPromiseParams  return data
 * @returns string
 */
function handleReturnDataIsClass(returnPromiseParams: string): string {
  if (getClassNameSet().has(returnPromiseParams) && !specialType.includes(returnPromiseParams)) {
    return `new ${returnPromiseParams}()`;
  }
  return returnPromiseParams;
}

/**
 * loop ReturnNames
 * @param returnNames
 * @param returnPromiseParams
 * @returns
 */
function loopReturnNames(returnNames: string[], returnPromiseParams: string): string {
  for (let i = 0; i < returnNames.length; i++) {
    if (returnNames[i].trim().startsWith('Promise<')) {
      // Promise<y>
      returnPromiseParams = returnNames[i].trim();
      break;
    }
  }
  return returnPromiseParams;
}

/**
 *
 * @param returnPromiseParams
 * @returns
 */
function getSeparatorParam(returnPromiseParams: string): string {
  let hasObj = '';
  let hasArr = '';
  let hasUint8Array = '';
  let hasArrayBuffer = '';
  let otherValue = '';
  const paramsArr = returnPromiseParams.split('|');
  for (let i = 0; i < paramsArr.length; i++) {
    const param = paramsArr[i].trim();
    if (param.startsWith('{') || param.startsWith('Object')) {
      hasObj = '{}';
    } else if (param.endsWith(']') || param.startsWith('[') || param.startsWith('Array<')) {
      hasArr = '[]';
    } else if (param.startsWith('Uint8Array')) {
      hasUint8Array = 'Uint8Array';
    } else if (param.startsWith('ArrayBuffer')) {
      hasArrayBuffer = 'ArrayBuffer';
    } else {
      if (param !== null) {
        otherValue = param;
      }
    }
  }
  if (hasObj) {
    return hasObj;
  }
  if (hasArr) {
    return hasArr;
  }
  if (hasUint8Array) {
    return hasUint8Array;
  }
  if (hasArrayBuffer) {
    return hasArrayBuffer;
  }
  return otherValue;
}

/**
 *
 * @param mockName string
 * @param sourceFile SourceFile
 * @returns boolean
 */
export function hasExportDefaultKeyword(mockName: string, sourceFile: SourceFile): boolean {
  let fileContent = sourceFile.getText();
  const removeNoteRegx = /\/\*[\s\S]*?\*\//g;
  fileContent = fileContent.replace(removeNoteRegx, '');
  if (
    fileContent.includes(`export default class ${firstCharacterToUppercase(mockName)} `) ||
    fileContent.includes(`export default interface ${firstCharacterToUppercase(mockName)} `) ||
    fileContent.includes(`export default ${firstCharacterToUppercase(mockName)}`)
  ) {
    return false;
  }
  return true;
}

/**
 *
 * @param propertySignatureBody string
 * @param propertyTypeName string
 * @param sourceFile SourceFile
 * @returns string
 */
export function getEnumReturnValue(
  propertySignatureBody: string,
  propertyTypeName: string,
  sourceFile: SourceFile
): string {
  let enumValue: EunmType[] = [];
  if (allEnumMap.has(propertyTypeName)) {
    enumValue = allEnumMap.get(propertyTypeName);
    for (let i = 0; i < enumValue.length; i++) {
      if (sourceFile.fileName.includes(enumValue[i].eunmPath)) {
        propertySignatureBody = propertyTypeName + '.' + enumValue[i].name;
        break;
      } else {
        propertySignatureBody = getImportEunmValue(propertyTypeName, enumValue);
      }
    }
  }
  return propertySignatureBody;
}

/**
 *
 * @param sourceFileEntity SourceFileEntity
 * @param propertyTypeName string
 * @param enumValue EunmType[]
 * @returns string
 */
function getImportEunmValue(
  propertyTypeName: string,
  enumValue: EunmType[]
): string {
  let importElements: string[] = [];
  let propertySignatureBody = '';
  for (let i = 0; i < fileImportDeclarations.length; i++) {
    importElements = fileImportDeclarations[i].importElements.replace('{', '').replace('}', '').split(',');
    importElements = importElements.map((item) => item.trim());
    let importPath = fileImportDeclarations[i].importPath;
    if (importPath.includes('/')) {
      importPath = path.basename(importPath).replace(/'/g, '');
    } else {
      importPath = importPath.replace(/'/g, '');
    }
    if (importElements.includes(propertyTypeName)) {
      enumValue.forEach((value) => {
        const enumPath = value.eunmPath.slice(0, value.eunmPath.lastIndexOf('.d.'));
        if (enumPath === importPath) {
          propertySignatureBody = propertyTypeName + '.' + value.name;
        }
      });
    }
  }
  return propertySignatureBody;
}

export const overloadedFunctionArr = ['on', 'off'];

export const needToAddBrace = ['ViewData', 'AutoFillType'];

export interface MockFunctionElementEntity {
  elementName: string;
  type: string;
}
export interface ReturnDataParams {
  mockData: string;
  mockFunctionElements: Array<MockFunctionElementEntity>;
}
