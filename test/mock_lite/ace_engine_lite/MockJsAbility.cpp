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

#include "js_ability.h"
#include "MockGlobalResult.h"

namespace OHOS {
namespace ACELite {
    JSAbility::~JSAbility() {}

    void JSAbility::Launch(const char *abilityPath, const char *bundleName, uint16_t token, const char*pageInfo)
    {
        g_jsAbilityLaunch = true;
    }

    void JSAbility::Show()
    {
        g_jsAbilityShow = true;
    }

    void JSAbility::Hide()
    {
        g_jsAbilityHide = true;
    }

    void JSAbility::TransferToDestroy()
    {
        g_jsAbilityTransferToDestroy = true;
    }

    void *MemoryHeap::operator new(size_t size)
    {
        if (size > 1024) { // 1024 is maxSize for test
            return nullptr;
        }
        return malloc(size);
    }

    void *MemoryHeap::operator new[](size_t size)
    {
        if (size > 1024) { // 1024 is maxSize for test
            return nullptr;
        }
        return malloc(size);
    }

    void MemoryHeap::operator delete(void *p)
    {
        free(p);
    }

    void MemoryHeap::operator delete[](void *p)
    {
        free(p);
    }
}
}