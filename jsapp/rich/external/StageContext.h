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

#ifndef STAGE_CONTEXT_H
#define STAGE_CONTEXT_H

#include <string>
#include <vector>
#include <optional>
#include <map>

namespace Json2 {
    class Value;
}

namespace OHOS::Ide {
class HspInfo {
public:
    std::string moduleName;
    std::string resourcePath;
    std::vector<uint8_t> moduleJsonBuffer;
};
class StageContext {
public:
    static StageContext& GetInstance();
    const std::optional<std::vector<uint8_t>> ReadFileContents(const std::string& filePath) const;
    // for Previewer
    void SetLoaderJsonPath(const std::string& assetPath);
    void SetHosSdkPath(const std::string& hosSdkPathValue);
    void GetModulePathMapFromLoaderJson();
    std::string GetHspAceModuleBuild(const std::string& hspConfigPath);
    void ReleaseHspBuffers();
    std::map<std::string, std::string> ParseMockJsonFile(const std::string& mockJsonFilePath);
    // for ArkUI and Ability
    std::vector<uint8_t>* GetModuleBuffer(const std::string& inputPath);
    std::vector<uint8_t>* GetLocalModuleBuffer(const std::string& moduleName);
    std::vector<uint8_t>* GetCloudModuleBuffer(const std::string& moduleName);
    std::vector<uint8_t>* GetSystemModuleBuffer(const std::string& inputPath, const std::string& moduleName);
    std::vector<uint8_t>* GetModuleBufferFromHsp(const std::string& hspFilePath, const std::string& fileName);
    void SetPkgContextInfo(std::map<std::string, std::string>& pkgContextInfoJsonStringMap,
        std::map<std::string, std::string>& packageNameList);
    void GetModuleInfo(std::vector<HspInfo>& dependencyHspInfos);
private:
    StageContext() = default;
    ~StageContext() = default;
    bool ContainsRelativePath(const std::string& path) const;
    std::map<std::string, std::string> GetModulePathMap() const;
    std::string GetCloudHspPath(const std::string& hspDir, const std::string& moduleName);
    std::string ReplaceLastStr(const std::string& str, const std::string& find, const std::string& replace);
    int GetHspActualName(const std::string& input, std::string& ret);
    std::string GetActualCloudHspDir(const std::string& actualName);
    std::string GetCloudModuleHspPath(const std::string& actualName);
    std::string GetCloudProjectHspPath(const std::string& actualName);
    std::string GetCloudHspVersion(const std::string& hspPath, const std::string& actualName);
    std::vector<int> SplitHspVersion(const std::string& version);
    int CompareHspVersion(const std::string& version1, const std::string& version2);
    bool UnzipHspFile(const std::string& hspFilePath, const std::string& writePath,
        const std::vector<std::string> fileNames);
    void GetHspinfo(const std::string& packageName, HspInfo& hspInfo);
    bool GetLocalModuleInfo(HspInfo &hspInfo);
    bool GetCloudModuleInfo(const std::string& packageName, HspInfo& hspInfo);
    std::string loaderJsonPath;
    std::map<std::string, std::string> modulePathMap;
    std::map<std::string, std::string> hspNameOhmMap;
    std::map<std::string, std::string> packageNameMap;
    std::map<std::string, std::string> hspResourcesMap;
    std::string projectRootPath;
    std::string buildConfigPath;
    std::vector<std::vector<uint8_t>*> hspBufferPtrsVec;
    int GetUpwardDirIndex(const std::string& path, const int upwardLevel) const;
    std::string localBundleName = "bundle";
    std::string hosSdkPath = "";
};
}
#endif // STAGE_CONTEXT_H