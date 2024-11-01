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

import fs from 'fs';
import path from 'path';
import type { SourceFile } from 'typescript';
import { SyntaxKind } from 'typescript';
import type { InterfaceEntity } from '../declaration-node/interfaceDeclaration';
import { generateCommonMethodSignature } from './generateCommonMethodSignature';
import { generateIndexSignature } from './generateIndexSignature';
import { generatePropertySignatureDeclaration } from './generatePropertySignatureDeclaration';
import { dtsFileList, getApiInputPath, hasBeenImported, specialFiles } from '../common/commonUtils';
import type { ImportElementEntity } from '../declaration-node/importAndExportDeclaration';
import type { PropertySignatureEntity } from '../declaration-node/propertySignatureDeclaration';

/**
 * generate interface
 * @param interfaceEntity
 * @param sourceFile
 * @param isSourceFile
 * @returns
 */
export function generateInterfaceDeclaration(
  interfaceEntity: InterfaceEntity,
  sourceFile: SourceFile,
  isSourceFile: boolean,
  mockApi: string,
  currentSourceInterfaceArray: InterfaceEntity[],
  importDeclarations?: ImportElementEntity[],
  extraImport?: string[]
): string {
  const interfaceName = interfaceEntity.interfaceName;
  let interfaceBody = '';
  let interfaceElementSet = new Set<string>();
  if (interfaceEntity.exportModifiers.length > 0 || isSourceFile) {
    interfaceBody += `export const ${interfaceName} = { \n`;
  } else {
    interfaceBody += `const ${interfaceName} = { \n`;
  }
  if (interfaceEntity.interfacePropertySignatures.length > 0) {
    const isAddExtraImportReturn = isNeedAddExtraImport(interfaceEntity, interfaceBody, interfaceName, mockApi, sourceFile,
      interfaceElementSet, extraImport, importDeclarations);
    interfaceElementSet = isAddExtraImportReturn.interfaceElementSet;
    interfaceBody = isAddExtraImportReturn.interfaceBody;
  }
  if (interfaceEntity.interfaceMethodSignature.size > 0) {
    interfaceEntity.interfaceMethodSignature.forEach(value => {
      interfaceBody += generateCommonMethodSignature(interfaceName, value, sourceFile, mockApi) + '\n';
      interfaceElementSet.add(value[0].functionName);
    });
  }
  if (extraImport.length > 0) {
    for (let i = 0; i < extraImport.length; i++) {
      if (mockApi.includes(extraImport[i])) {
        extraImport.splice(i, 1);
      }
    }
  }
  if (interfaceEntity.indexSignature.length > 0) {
    interfaceEntity.indexSignature.forEach(value => {
      interfaceBody += generateIndexSignature(value) + '\n';
      interfaceElementSet.add(value.indexSignatureKey);
    });
  }
  interfaceBody = assemblyInterface(interfaceEntity, currentSourceInterfaceArray, interfaceBody,
    sourceFile, interfaceElementSet, mockApi, interfaceName);
  return interfaceBody;
}

/**
 * @param interfaceEntity
 * @param interfaceBody
 * @param interfaceName
 * @param mockApi
 * @param sourceFile
 * @param interfaceElementSet
 * @param extraImport
 * @param importDeclarations
 * @returns
 */
function isNeedAddExtraImport(
  interfaceEntity: InterfaceEntity,
  interfaceBody: string,
  interfaceName: string,
  mockApi: string,
  sourceFile: SourceFile,
  interfaceElementSet: Set<string>,
  extraImport: string[],
  importDeclarations: ImportElementEntity[]
): { interfaceBody: string; interfaceElementSet: Set<string> } {
  interfaceEntity.interfacePropertySignatures.forEach(value => {
    interfaceBody += generatePropertySignatureDeclaration(interfaceName, value, sourceFile, mockApi) + '\n';
    interfaceElementSet.add(value.propertyName);
    if (!value.propertyTypeName.includes(' ')) {
      // Find out whether the value.propertyTypeName was introduced through import.
      const regex = new RegExp(`import[\\s\n]*?{?[\\s\n]*?${value.propertyTypeName}[,\\s\n]*?`);
      const results = mockApi.match(regex);
      if (results) {
        return;
      }
      let temp = false;
      importDeclarations.forEach(element => {
        // Determine whether the external variable introduced by import contains value.propertyTypeName.
        if (
          element.importPath.startsWith('\'@ohos') &&
          element.importElements.match(new RegExp(`[\\s\n]*${value.propertyTypeName}[,\\s\n]*`))
        ) {
          temp = true;
        }
      });
      if (temp) {
        return;
      }
    }
    addExtraImport(extraImport, importDeclarations, sourceFile, value);
  });
  return {
    interfaceBody,
    interfaceElementSet
  };
}

function assemblyInterface(
  interfaceEntity: InterfaceEntity,
  currentSourceInterfaceArray: InterfaceEntity[],
  interfaceBody: string,
  sourceFile: SourceFile,
  interfaceElementSet: Set<string>,
  mockApi: string,
  interfaceName: string
): string {
  if (interfaceEntity.heritageClauses.length > 0) {
    interfaceEntity.heritageClauses.forEach(value => {
      currentSourceInterfaceArray.forEach(currentInterface => {
        if (value.types.includes(currentInterface.interfaceName)) {
          interfaceBody += generateHeritageInterface(currentInterface, sourceFile, interfaceElementSet, mockApi);
        }
      });
    });
  }
  interfaceBody += '}\n';
  if (interfaceEntity.exportModifiers.includes(SyntaxKind.DeclareKeyword)) {
    interfaceBody += `
      if (!global.${interfaceName}) {
        global.${interfaceName} = ${interfaceName};\n
      }
    `;
  }
  return interfaceBody;
}

function generateHeritageInterface(
  interfaceEntity: InterfaceEntity,
  sourceFile: SourceFile,
  elements: Set<string>,
  mockApi: string
): string {
  const interfaceName = interfaceEntity.interfaceName;
  let interfaceBody = '';
  if (interfaceEntity.interfacePropertySignatures.length > 0) {
    interfaceEntity.interfacePropertySignatures.forEach(value => {
      if (!elements.has(value.propertyName)) {
        interfaceBody += generatePropertySignatureDeclaration(interfaceName, value, sourceFile, mockApi) + '\n';
      }
    });
  }

  if (interfaceEntity.interfaceMethodSignature.size > 0) {
    interfaceEntity.interfaceMethodSignature.forEach(value => {
      if (!elements.has(value[0].functionName)) {
        interfaceBody += generateCommonMethodSignature(interfaceName, value, sourceFile, mockApi) + '\n';
      }
    });
  }

  if (interfaceEntity.indexSignature.length > 0) {
    interfaceEntity.indexSignature.forEach(value => {
      if (elements.has(value.indexSignatureKey)) {
        interfaceBody += generateIndexSignature(value) + '\n';
      }
    });
  }
  return interfaceBody;
}

/**
 * @param extraImport
 * @param importDeclarations
 * @param sourceFile
 * @param value
 * @returns
 */
export function addExtraImport(
  extraImport: string[],
  importDeclarations: ImportElementEntity[],
  sourceFile: SourceFile,
  value: PropertySignatureEntity
): void {
  if (extraImport && importDeclarations) {
    const propertyTypeName = value.propertyTypeName.split('.')[0].split('|')[0].split('&')[0].replace(/"'/g, '').trim();
    if (propertyTypeName.includes('/')) {
      return;
    }
    if (hasBeenImported(importDeclarations, propertyTypeName)) {
      return;
    }
    const specialFilesList = [
      ...specialFiles.map(specialFile => path.join(getApiInputPath(), ...specialFile.split('/')))
    ];
    if (!specialFilesList.includes(sourceFile.fileName)) {
      specialFilesList.unshift(sourceFile.fileName);
    }
    searchHasExtraImport(specialFilesList, propertyTypeName, sourceFile, extraImport);
  }
}

/**
 * @param specialFilesList
 * @param propertyTypeName
 * @param sourceFile
 * @param extraImport
 * @returns
 */
function searchHasExtraImport(
  specialFilesList: string[],
  propertyTypeName: string,
  sourceFile: SourceFile,
  extraImport: string[]
): void {
  for (let i = 0; i < specialFilesList.length; i++) {
    const specialFilePath = specialFilesList[i];
    if (!fs.existsSync(specialFilePath)) {
      continue;
    }
    let specialFileContent = fs.readFileSync(specialFilePath, 'utf-8');
    const removeNoteRegx = /\/\*[\s\S]*?\*\//g;
    specialFileContent = specialFileContent.replace(removeNoteRegx, '');
    const regex = new RegExp(`\\s${propertyTypeName}\\s*(<|{|=|extends)`);
    const results = specialFileContent.match(regex);
    if (!results) {
      continue;
    }
    if (sourceFile.fileName === specialFilePath) {
      return;
    }
    let specialFileRelatePath = path.relative(path.dirname(sourceFile.fileName), path.dirname(specialFilePath));
    if (!specialFileRelatePath.startsWith('./') && !specialFileRelatePath.startsWith('../')) {
      specialFileRelatePath = './' + specialFileRelatePath;
    }
    if (!dtsFileList.includes(specialFilePath)) {
      dtsFileList.push(specialFilePath);
    }
    specialFileRelatePath = specialFileRelatePath.split(path.sep).join('/');
    const importStr = `import { ${propertyTypeName} } from '${specialFileRelatePath}${
      specialFileRelatePath.endsWith('/') ? '' : '/'
    }${path.basename(specialFilePath).replace('.d.ts', '').replace('.d.ets', '')}'\n`;
    if (extraImport.includes(importStr)) {
      return;
    }
    extraImport.push(importStr);
    return;
  }
  if (propertyTypeName.includes('<') || propertyTypeName.includes('[')) {
    return;
  }
  console.log(sourceFile.fileName, 'propertyTypeName', propertyTypeName);
  return;
}
