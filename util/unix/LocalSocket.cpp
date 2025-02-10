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

#include "LocalSocket.h"

#include <sys/ioctl.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/un.h>

#include <unistd.h>

#include "PreviewerEngineLog.h"

LocalSocket::LocalSocket() : socketHandle(-1) {}

LocalSocket::~LocalSocket()
{
    DisconnectFromServer();
}

bool LocalSocket::ConnectToServer(std::string name, OpenMode openMode, TransMode transMode)
{
    (void)openMode;
    (void)transMode;
    struct sockaddr_un un;
    un.sun_family = AF_UNIX;
    std::size_t length = name.copy(un.sun_path, name.size());
    un.sun_path[length] = '\0';
    socketHandle = socket(AF_UNIX, SOCK_STREAM, 0);
    if (socketHandle < 0) {
        ELOG("Request socket failed");
        return false;
    }
    struct sockaddr* sockun = reinterpret_cast<struct sockaddr*>(&un);
    if (connect(socketHandle, sockun, sizeof(un)) < 0) {
        ELOG("connect socket failed");
        return false;
    }
    isConnected = true;
    return true;
}

bool LocalSocket::RunServer(std::string name)
{
    constexpr int defaultTimeout = 5;
    DisconnectFromServer();
    serverName = name;
    socketHandle = socket(AF_UNIX, SOCK_STREAM, 0);
    if (socketHandle < 0) {
        ELOG("Failed to create socket");
        return false;
    }
    struct sockaddr_un un;
    un.sun_family = AF_UNIX;
    std::size_t length = name.copy(un.sun_path, name.size());
    un.sun_path[length] = '\0';
    unlink(un.sun_path);
    struct sockaddr* sockun = reinterpret_cast<struct sockaddr*>(&un);
    if (bind(socketHandle, sockun, sizeof(un)) < 0) {
        ELOG("Bind failed");
        return false;
    }
    if (listen(socketHandle, defaultTimeout) < 0) {
        ELOG("Listen failed");
        return false;
    }
    isServer = true;
    isConnected = false;
    return true;
}

bool LocalSocket::ConnectClient(bool wait)
{
    if (isConnected) {
        return true;
    }
    if (!isServer) {
        return false;
    }
    if (!wait) {
        fd_set readfds;
        FD_ZERO(&readfds);
        FD_SET(socketHandle, &readfds);

        struct timeval timeout;
        timeout.tv_sec = 0;
        timeout.tv_usec = 0;

        int selectResult = select(socketHandle + 1, &readfds, nullptr, nullptr, &timeout);
        if (selectResult <= 0) {
            return false;
        }
    }
    struct sockaddr_un clientAddr;
    socklen_t clientLen = sizeof(clientAddr);
    int clientSocket = accept(socketHandle, (struct sockaddr*)&clientAddr, &clientLen);
    if (clientSocket < 0) {
        ELOG("Accept failed");
        return false;
    }
    close(socketHandle);
    socketHandle = clientSocket;
    isConnected = true;
    return true;
}

std::string LocalSocket::GetTracePipeName(std::string baseName) const
{
    return std::string("/tmp/") + baseName;
}

std::string LocalSocket::GetCommandPipeName(std::string baseName) const
{
    return std::string("/tmp/") + baseName + "_commandPipe";
}

std::string LocalSocket::GetImagePipeName(std::string baseName) const
{
    return std::string("/tmp/") + baseName + "_imagePipe";
}

void LocalSocket::DisconnectFromServer()
{
    if (socketHandle != -1) {
        shutdown(socketHandle, SHUT_RDWR);
        close(socketHandle);
    }
    isConnected = false;
}

int64_t LocalSocket::ReadData(char* data, size_t length) const
{
    if (!isConnected) {
        if (!isServer || !const_cast<LocalSocket *>(this)->ConnectClient(false))
            return 0;
    }
    if (length > UINT32_MAX) {
        return -1;
    }
    int32_t bytes_read;
    if (ioctl(socketHandle, FIONREAD, &bytes_read) < 0) {
        if (isServer) {
            const_cast<LocalSocket *>(this)->RunServer(serverName);
        }
        return -1;
    }
    if (bytes_read == 0) {
        fd_set readfds;
        FD_ZERO(&readfds);
        FD_SET(socketHandle, &readfds);
        struct timeval timeout;
        timeout.tv_sec = 0;
        timeout.tv_usec = 0;
        int selectResult = select(socketHandle + 1, &readfds, nullptr, nullptr, &timeout);
        if (selectResult < 0) {
            if (isServer) {
                const_cast<LocalSocket *>(this)->RunServer(serverName);
            }
            return -1;
        } else if (selectResult == 0) {
            return 0;
        }
    }
    int32_t readSize = recv(socketHandle, data, length, 0);
    if (readSize < 0) {
        if (isServer) {
            const_cast<LocalSocket *>(this)->RunServer(serverName);
        }
        return -1;
    } else if (readSize == 0) {
        if (isServer) {
            const_cast<LocalSocket *>(this)->RunServer(serverName);
        }
        return 0;
    }
    return readSize;
}

size_t LocalSocket::WriteData(const void* data, size_t length) const
{
    if (length > UINT32_MAX) {
        ELOG("LocalSocket::WriteData length must < %d", UINT32_MAX);
        return 0;
    }
    std::string str((const char*)data);
    ssize_t writeSize = send(socketHandle, str.c_str(), length, 0);
    if (writeSize == 0) {
        ELOG("LocalSocket::WriteData Server is shut down");
    }
    if (writeSize < 0) {
        ELOG("LocalSocket::WriteData ReadFile failed");
    }
    return writeSize;
}

const LocalSocket& LocalSocket::operator>>(std::string& data) const
{
    char c = '\255';
    while (c != '\0' && ReadData(&c, 1) > 0) {
        data.push_back(c);
    }
    return *this;
}

const LocalSocket& LocalSocket::operator<<(const std::string data) const
{
    WriteData(data.c_str(), data.length() + 1);
    return *this;
}