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

#ifndef MOUSEINPUTIMPL_H
#define MOUSEINPUTIMPL_H

#include "JsAppImpl.h"
#include "MouseInput.h"

class MouseInputImpl : public MouseInput {
public:
    static MouseInputImpl& GetInstance();
    void SetMouseStatus(int status) override;
    void SetMousePosition(double xPosition, double yPosition) override;
    void DispatchOsTouchEvent() const override;
    void DispatchOsBackEvent() const override;
private:
    MouseInputImpl() noexcept;
    virtual ~MouseInputImpl() {}
    OHOS::MMI::TouchType ConvertToOsType(int status) const;
    OHOS::MMI::SourceTool ConvertToOsTool(int tools) const;
    static constexpr int64_t SEC_TO_NANOSEC = 1000000000;
};

#endif // MOUSEINPUTIMPL_H
