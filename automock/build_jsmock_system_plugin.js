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

const startTime = Date.now();

const fs = require('fs');

const path = require('path');

const webpack = require('webpack');

function addTipToFile(outputFilePath) {
  try {
    countSize(outputFilePath);
    // 读取生成的文件
    let fileContent = fs.readFileSync(outputFilePath, 'utf-8');

    // 添加提示信息到文件头部
    const tipTemp = 'var ts = "The {{}} interface in the previewer is a mocked implementation and may behave differently than on a real device.";\n';

    // 检查文件是否已经有相同提示（避免重复添加）
    if (!fileContent.startsWith('var ts = "The')) {
      fileContent = tipTemp + fileContent;

      // 写回文件
      fs.writeFileSync(outputFilePath, fileContent, 'utf-8');
      console.log(`提示信息已添加到: ${outputFilePath}`);
    } else {
      console.log(`文件已有提示信息: ${outputFilePath}`);
    }

    return true;
  } catch (error) {
    console.error('添加提示信息失败:', error.message);
    return false;
  }
}

function runWebpack(webpackConfig) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(webpackConfig);

    compiler.run((err, stats) => {
      // 清理 watch 模式下的监听器（防止进程挂起）
      compiler.close((closeErr) => {
        if (closeErr) {
          console.warn('关闭 compiler 时出错:', closeErr);
        }
      });

      if (err) {
        // webpack 配置错误或致命错误
        reject(err);
        return;
      }

      if (stats.hasErrors()) {
        // 构建过程存在编译错误
        const errorInfo = stats.toString({
          colors: true,
          errors: true,
          errorDetails: true
        });
        reject(new Error(errorInfo));
        return;
      }
      // 构建成功，返回 stats 对象
      resolve(stats);
    });
  });
}

function countSize(filePath) {
  const file = path.relative(__dirname, filePath);
  fs.stat(filePath, function(error, stats) {
    if (error) {
      console.error('file size is wrong');
    } else {
      const KB_BYTE_LENGTH = 1024;
      const num = 2;
      const size = (stats.size / KB_BYTE_LENGTH).toFixed(num) + 'KB';
      console.log(`generate snapshot file: ${file}...\nthe snapshot file size: ${size}...`);
      const endTime = Date.now();
      console.log(`耗时：${(endTime - startTime) / 1000}秒`);
    }
  });
}

async function runWebpackBuild() {
  const config = {
    // 开发模式，不混淆代码
    mode: 'production',
    entry: path.resolve(__dirname, 'runtime/main/extend/systemplugin/index.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'jsMockSystemPlugin.js'
    },
    optimization: {
      // 显式禁用代码压缩/混淆
      minimize: false
    }
  };

  try {
    const stats = await runWebpack(config);
    const outputFilePath = path.resolve(__dirname, 'dist/jsMockSystemPlugin.js');
    addTipToFile(outputFilePath);
    console.log('构建成功！');
    console.log(stats.toString({ colors: true, chunks: false }));
  } catch (error) {
    console.error('构建失败：', error.message);
  }
}

runWebpackBuild();
