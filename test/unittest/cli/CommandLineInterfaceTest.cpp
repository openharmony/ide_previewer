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

#include <string>
#include <thread>
#include <fstream>
#include <cstdio>
#include <unistd.h>
#include "gtest/gtest.h"
#define private public
#include "CommandLineInterface.h"
#include "CommandLineFactory.h"
#include "CommandParser.h"
#include "SharedData.h"
#include "MockGlobalResult.h"
using namespace std;

namespace {
    std::string g_configPath = R"(
        {
        "setting": {
        "1.0.0": {
        "KeepScreenOnState": {
            "args": {
            "KeepScreenOnState": true
            }
        },
        "BrightnessMode": {
            "args": {
            "BrightnessMode": 0
            }
        },
        "Brightness": {
            "args": {
            "Brightness": 170
            }
        },
        "WearingState": {
            "args": {
            "WearingState": true
            }
        },
        "Barometer": {
            "args": {
            "Barometer": 101325
            }
        },
        "HeartRate": {
            "args": {
            "HeartRate": 100
            }
        },
        "StepCount": {
            "args": {
            "StepCount": 0
            }
        },
        "Location": {
            "args": {
            "latitude": 39.914417,
            "longitude": 116.39647
            }
        },
        "ChargeMode": {
            "args": {
            "ChargeMode": 0
            }
        },
        "Power": {
            "args": {
            "Power": 0.1
            }
        },
        "Language": {
            "args": {
            "Language": "en-US"
            }
        }
        },
        "1.0.1": {
        "Language": {
            "args": {
            "Language": "zh-CN"
            }
        }
        }
        },
        "frontend": {
        "1.0.0": {
        "Resolution": {
            "args": {
            "Resolution": "454*454"
            }
        },
        "DeviceType": {
            "args": {
            "DeviceType": "liteWearable"
            }
        }
        }
        }
        }
    )";

    // 测试复制构造函数是否被删除
    TEST(CommandLineInterfaceTest, DefaultConstructorDeletedTest)
    {
        EXPECT_TRUE(std::is_copy_constructible<CommandLineInterface>::value == false);
    }

    // 测试赋值运算符是否被删除
    TEST(CommandLineInterfaceTest, AssignmentOperatorDeletedTest)
    {
        EXPECT_TRUE(std::is_copy_assignable<CommandLineInterface>::value == false);
    }

    TEST(CommandLineInterfaceTest, GetInstanceTest)
    {
        CommandLineInterface& instance1 = CommandLineInterface::GetInstance();
        CommandLineInterface& instance2 = CommandLineInterface::GetInstance();
        EXPECT_EQ(&instance1, &instance2);
    }

    TEST(CommandLineInterfaceTest, InitPipeTest)
    {
        CommandLineInterface::GetInstance().InitPipe("phone");
        EXPECT_TRUE(CommandLineInterface::isPipeConnected);
    }

    TEST(CommandLineInterfaceTest, ProcessCommandTest)
    {
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        instance.ProcessCommand();
        EXPECT_TRUE(instance.isFirstWsSend);
    }

    TEST(CommandLineInterfaceTest, ProcessCommandMessageTest)
    {
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        std::string msg = R"({"type":"action","command":"MousePress","version":"1.0.1"})";
        instance.ProcessCommandMessage(msg);
    }

    TEST(CommandLineInterfaceTest, ProcessCommandValidateTest)
    {
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        std::string msg = "{}";
        Json2::Value jsonData1 = JsonReader::ParseJsonData2(msg);
        EXPECT_FALSE(instance.ProcessCommandValidate(false, jsonData1, "Failed to parse the JSON"));
        msg = "[]";
        Json2::Value jsonData2 = JsonReader::ParseJsonData2(msg);
        EXPECT_FALSE(instance.ProcessCommandValidate(true, jsonData2, "Command is not a object"));
        msg = R"({"type":"action","command":"MousePress"})";
        Json2::Value jsonData3 = JsonReader::ParseJsonData2(msg);
        EXPECT_FALSE(instance.ProcessCommandValidate(true, jsonData3, "Command error"));
        msg = R"({"type":"action","command":"MousePress","version":"s.0.1"})";
        Json2::Value jsonData4 = JsonReader::ParseJsonData2(msg);
        EXPECT_FALSE(instance.ProcessCommandValidate(true, jsonData4, "Invalid command version"));
        msg = R"({"type":"action","command":"MousePress","version":"1.0.1"})";
        Json2::Value jsonData5 = JsonReader::ParseJsonData2(msg);
        EXPECT_TRUE(instance.ProcessCommandValidate(true, jsonData5, ""));
    }

    TEST(CommandLineInterfaceTest, GetCommandTypeTest)
    {
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        EXPECT_EQ(instance.GetCommandType(""), CommandLine::CommandType::INVALID);
        EXPECT_EQ(instance.GetCommandType("set"), CommandLine::CommandType::SET);
        EXPECT_EQ(instance.GetCommandType("get"), CommandLine::CommandType::GET);
        EXPECT_EQ(instance.GetCommandType("action"), CommandLine::CommandType::ACTION);
    }

    TEST(CommandLineInterfaceTest, InitTest)
    {
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        instance.Init("phone");
        EXPECT_TRUE(CommandLineFactory::typeMap.size() > 0);
        EXPECT_TRUE(CommandLineInterface::isPipeConnected);
    }

    TEST(CommandLineInterfaceTest, IsStaticIgnoreCmdTest)
    {
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        std::string msg = "Language";
        EXPECT_FALSE(instance.IsStaticIgnoreCmd(msg));
        std::string msg1 = "Language1";
        EXPECT_TRUE(instance.IsStaticIgnoreCmd(msg1));
    }

    void InitSharedData(std::string deviceType)
    {
        if (deviceType == "liteWearable" || "smartVersion") {
            SharedData<bool>(SharedDataType::KEEP_SCREEN_ON, true);
            SharedData<uint8_t>(SharedDataType::BATTERY_STATUS, (uint8_t)ChargeState::NOCHARGE,
                                (uint8_t)ChargeState::NOCHARGE, (uint8_t)ChargeState::CHARGING);
            // The brightness ranges from 1 to 255. The default value is 255.
            SharedData<uint8_t>(SharedDataType::BRIGHTNESS_VALUE, 255, 1, 255);
            SharedData<uint8_t>(SharedDataType::BRIGHTNESS_MODE, (uint8_t)BrightnessMode::MANUAL,
                                (uint8_t)BrightnessMode::MANUAL, (uint8_t)BrightnessMode::AUTO);
            // The value ranges from 0 to 999999. The default value is 0.
            SharedData<uint32_t>(SharedDataType::SUMSTEP_VALUE, 0, 0, 999999);
            // The volume ranges from 0.0 to 1.0. The default value is 1.0.
            SharedData<double>(SharedDataType::VOLUME_VALUE, 1.0, 0.0, 1.0);
            // Battery level range: 0.0–1.0; default: 1.0
            SharedData<double>(SharedDataType::BATTERY_LEVEL, 1.0, 0.0, 1.0);
            // Heart rate range: 0 to 255. The default value is 80.
            SharedData<uint8_t>(SharedDataType::HEARTBEAT_VALUE, 80, 0, 255);
            SharedData<string>(SharedDataType::LANGUAGE, "zh-CN");
            // The value ranges from 180 to 180. The default value is 0.
            SharedData<double>(SharedDataType::LONGITUDE, 0, -180, 180);
            // The atmospheric pressure ranges from 0 to 999900. The default value is 101325.
            SharedData<uint32_t>(SharedDataType::PRESSURE_VALUE, 101325, 0, 999900);
            SharedData<bool>(SharedDataType::WEARING_STATE, true);
            // The value ranges from -90 to 90. The default value is 0.
            SharedData<double>(SharedDataType::LATITUDE, 0, -90, 90);
        } else {
            SharedData<string>(SharedDataType::LANGUAGE, "zh_CN");
            SharedData<string>(SharedDataType::LAN, "zh");
            SharedData<string>(SharedDataType::REGION, "CN");
        }
    }

    TEST(CommandLineInterfaceTest, ReadAndApplyConfigTest)
    {
        string deviceType = "liteWearable";
        CommandParser::GetInstance().deviceType = deviceType;
        CommandLineInterface& instance = CommandLineInterface::GetInstance();
        instance.Init(deviceType);
        InitSharedData(deviceType);
        char buffer[FILENAME_MAX];
        if (getcwd(buffer, FILENAME_MAX) != nullptr) {
            std::string currDir = std::string(buffer);
            std::string currFile = currDir + "/config.json";
            // 创建文件流对象并打开文件
            std::ofstream file(currFile);
            // 检查文件是否成功打开
            if (file.is_open()) {
                file << g_configPath;
                file.close();
                instance.ReadAndApplyConfig(currFile);
            } else {
                printf("Error creating file!\n");\
                EXPECT_TRUE(false);
            }
        } else {
            printf("error: getcwd failed\n");
            EXPECT_TRUE(false);
        }
        EXPECT_TRUE(SharedData<bool>::GetData(SharedDataType::KEEP_SCREEN_ON));
        EXPECT_EQ(SharedData<uint8_t>::GetData(SharedDataType::BRIGHTNESS_VALUE), 170);
        EXPECT_EQ(SharedData<uint8_t>::GetData(SharedDataType::HEARTBEAT_VALUE), 100);
    }

    TEST(CommandLineInterfaceTest, SendJsonDataTest)
    {
        g_output = false;
        std::string msg = R"({"type":"action","command":"MousePress"})";
        Json2::Value jsonData = JsonReader::ParseJsonData2(msg);
        CommandLineInterface::SendJsonData(jsonData);
        EXPECT_TRUE(g_output);
    }

    TEST(CommandLineInterfaceTest, SendJSHeapMemoryTest)
    {
        g_output = false;
        CommandLineInterface::GetInstance().SendJSHeapMemory(1, 1, 1);
        EXPECT_TRUE(g_output);
    }

    TEST(CommandLineInterfaceTest, SendWebsocketStartupSignalTest)
    {
        g_output = false;
        CommandLineInterface::GetInstance().SendWebsocketStartupSignal();
        EXPECT_TRUE(g_output);
    }

    TEST(CommandLineInterfaceTest, CreatCommandToSendDataTest)
    {
        string deviceType = "phone";
        CommandParser::GetInstance().deviceType = deviceType;
        CommandLineInterface::GetInstance().Init(deviceType);
        g_output = false;
        EXPECT_FALSE(g_output);
        Json2::Value val;
        CommandLineInterface::GetInstance().CreatCommandToSendData("LoadContent", val, "get");
        EXPECT_TRUE(g_output);
    }
}
