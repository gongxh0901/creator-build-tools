## 一、前言

作为一名开发人员，应该专注于项目内容，而不是被一些重复性的工作占用大量时间精力，而项目上线后版本更新，会存在多个平台，多个渠道，这些不同渠道的打包，更是会占用大量精力，并且是一种重复性极强的工作。



基于本人目前的项目，我们算是渠道比较少的了

包含：iOS、鸿蒙、android （taptap/抖音app/官方包）、微信小游戏、抖音小游戏、支付宝小游戏



大体拆分一下打包流程

* 小游戏

  ```bash
  编译creator项目 --> 上传远程资源到cdn --> 上传小游戏包到平台 --> 同步包信息给测试
  ```

* 原生平台

  ```bash
  编译creator项目 --> 生成热更新比对文件manifest --> 生成包（android/鸿蒙/ios）--> 同步包信息给测试
  ```



渠道多了之后还是比较繁琐的，所以就有了下边这个自动化打包脚本



## 二、项目简介

这是一个基于creator项目的自动化打包工具

本工具使用的一些特殊工具：

* cdn：用的是阿里云的oss

* 通知：公司用的通讯工具是飞书，所以发送通知是到了飞书的群里

### 1. 支持平台:

* android （支持多渠道配置 比如：taptap、小米、4399等）

* ios （需要自行实现； 配合`fastlane`使用，可以自动上传到 `testflight` ）

* 纯血鸿蒙
* 微信小游戏
* 支付宝小游戏
* 抖音小游戏
* 华为快游戏 （暂未实现）

### 2. 流程

#### 打包原生平台

creator项目构建--> 生成热更新比对文件manifest --> 修改原生项目版本号和build号 --> 开始打包 --> 上传生成的包到cdn --> 发送飞书通知

#### 打包小游戏

creator项目构建--> 上传远程资源到cdn --> 上传包到小游戏后台 --> 修改体验版为新版本 --> 发送飞书通知，附带新包二维码

#### 热更新

creator项目构建 --> 生成并替换热更新比对文件manifest --> 上传更新资源到cdn -> 发送飞书通知



## 三、使用说明

1. 项目clone到本地

2. 到项目根目录下，执行以下命令， 安装依赖npm包

   ```bash
   npm i
   ```

3. 修改根目录下的`config.json`配置文件，内容比较多，不过都很好理解，也有比较详细的描述

   ```json
   {
     	// creator所在路径
       "creator": "/Applications/Cocos/Creator/3.8.6/CocosCreator.app/Contents/MacOS/CocosCreator",
     	// creator项目路径，换成自己的
       "project": "/Users/**/work/kunpo-lib/KunpoDemo",
     	// 自定义引擎的绝对路径（不配置 或 "" 表示没有自定义引擎）
   		"customEngine": "/Users/***/work/engine/cocos-engine",
     	// 我这里用的是阿里云 其他配置见 环境变量配置
       "oss": {
           // 原生平台的包上传到cdn上的路径
           "publish": "test/publish"
       },
   
   		// 根据需求自定义渠道
       "channels": [
           {
             	// 自定义的渠道类型
               "channel": "wechatgame",
             	// 自定义的渠道名称
               "name": "微信小游戏",
             	// creator打包用的平台类型 （对应 下边 platforms 字段下的 platform）
               "platform": "wechatgame",
             	// 通过creator导出的 打包用的配置文件
               "config": "./local/buildConfig_wechatgame.json"
           },
           {
               "channel": "alipay",
               "name": "支付宝小游戏",
               "platform": "alipay-mini-game",
               "config": "./local/buildConfig_alipay-mini-game.json"
           },
           {
               "channel": "bytedance",
               "name": "抖音小游戏",
               "platform": "bytedance-mini-game",
               "config": "./local/buildConfig_bytedance-mini-game.json"
           },
           {
               "channel": "huawei",
               "name": "华为快游戏",
               "platform": "huawei-quick-game",
               "config": ""
           },
           {
               "channel": "harmonyos-next",
               "name": "鸿蒙",
               "platform": "harmonyos-next",
               "config": "./local/buildConfig_harmonyos-next.json"
           },
           {
               "channel": "ios",
               "name": "ios",
               "platform": "ios",
               "config": "./local/buildConfig_ios.json"
           },
           {
               "channel": "official",
               "name": "官方android",
               "platform": "android",
               "config": "./local/buildConfig_android.json"
           },
           {
               "channel": "taptap",
               "name": "TapTap",
               "platform": "android",
               "config": "./local/buildConfig_android.json"
           },
           {
               "channel": "douyin",
               "name": "抖音app",
               "platform": "android",
               "config": "./local/buildConfig_android.json"
           }
       ],
     
   		// creator命令行打包用的平台类型
       "platforms": [
           {
             	// 平台类型
               "platform": "android",
             	// native项目路径 相对于creator项目根目录
               "native": "./native/engine/android/app",
             	// 平台项目路径 相对于creator项目根目录 不改导出位置的话，在build文件夹下
               "build": "./build/android/proj",
             	// android打包秘钥路径 相对于此工具的根目录
               "certificate": {
                   "debug": {
                       "keystore": "./cert/android/test.keystore",
                       "keyStorePassword": "A123456",
                       "alias": "abcd",
                       "keyPassword": "A123456"
                   },
                   "release": {
                       "keystore": "./cert/android/test.keystore",
                       "keyStorePassword": "A123456",
                       "alias": "abcd",
                       "keyPassword": "A123456"
                   }
               }
           },
           {
             	// 同上
               "platform": "ios",
               "native": "./native/engine/ios",
               "build": "./build/ios/proj"
           },
           {
   						// 同上
               "platform": "harmonyos-next",
               "native": "./native/engine/harmonyos-next",
               "build": "./build/harmonyos-next/proj",
             	// 鸿蒙打包的证书信息
               "certificate": {
                 	 // 出debug包，可以根据信息自己配置
                   "debug": {
                       "storePassword": "Abc123456",
                       "certpath": "/Users/gongxh/Desktop/harmonyTest/debug.cer",
                       "keyAlias": "abcd",
                       "keyPassword": "Abc123456",
                       "profile": "/Users/gongxh/Desktop/harmonyTest/harmonyTestProfileDebug.p7b",
                       "signAlg": "SHA256withECDSA",
                       "storeFile": "/Users/gongxh/Desktop/harmonyTest/harmonyTest.p12"
                   },
                 	// 正式包，可以从鸿蒙项目根目录中的build-profile.json5文件中拷贝，对应信息
                   "release": {
                       "storePassword": "000000195109A27949A8FFBB4BEFFCEFD4919556F185AF0C9618D20C4F7CC4D9F92BB336732F418915",
                       "certpath": "./cert/harmony/release.cer",
                       "keyAlias": "abcd",
                       "keyPassword": "000000190BAAF6A63567D21E7EC60F23F8F9D0473600090229B776998483F755DA3F48C8DAEE0C00D5",
                       "profile": "./cert/harmony/releaseProfileRelease.p7b",
                       "signAlg": "SHA256withECDSA",
                       "storeFile": "./cert/harmony/harmonyTest.p12"
                   }
               }
           },
           {
               "platform": "wechatgame",
               "build": "./build/wechatgame",
             	// 微信小游戏的appid
               "appid": "",
             	// 微信小游戏自动上传用的秘钥（到微信小游戏后台开启后下载）相对于此工具的根目录
               "privateKey": "./cert/wechat/private.key",
             	// 远程资源上传到cdn仓库中的目录 后边会拼接  dev|prod + 平台 + 版本号
               "remote": "test"
           },
           {
               "platform": "alipay-mini-game",
               "build": "./build/alipay-mini-game",
             	// 支付宝小游戏 appid
               "appid": "",
               "remote": "test"
           },
           {
               "platform": "bytedance-mini-game",
               "build": "./build/bytedance-mini-game",
             	// 抖音小游戏 appid
               "appid": "",
               "remote": "test"
           }
       ],
   
       "hotupdate-tips": {
           "tips": "根据平台做不同配置",
           "cdn-tips": "热更新地址，后边会拼接版本号 eg: url + version + platform",
           "dest-tips": "热更新manifest文件输出相对路径(相对于项目)",
           "src-tips": "项目构建后资源相对路径 用来生成热更新比对md5",
           "manifest-tips": "项目构建后资源中的manifest文件所在目录 根据配置不同，路径也不同"
       },
     	// 原生平台热更新的配置 根据平台做不同配置
       "hotupdate": [
           {
               "platform": "android",
             	 // debug模式 热更新资源上传到cdn上的路径
               "cdnDebug": "test/hot-update-debug/",
             	// release模式 热更新资源上传到cdn上的路径
               "cdn": "test/hot-update/",
             	// manifest文件生成路径 相对于creator项目的根目录
               "dest": "./assets/",
               // 项目构建后，用此目录下的资源生成新的manifest文件
               "src": "./build/android/assets",
             	// creator项目构建后的 manifest 所在的目录，可以是他的父路径 或者 父父路径 ... 会自动查找并替换成新的
               "manifest": "./build/android/assets/assets/main/native"
           },
           {
               "platform": "ios",
               "cdnDebug": "test/hot-update-debug/",
               "cdn": "test/hot-update/",
               "dest": "./assets/",
               "src": "./build/ios/assets",
               "manifest": "./build/ios/assets/assets/main/native"
           },
           {
               "platform": "harmonyos-next",
               "cdnDebug": "test/hot-update-debug/",
               "cdn": "test/hot-update/",
               "dest": "./assets/",
               "src": "./build/harmonyos-next/assets",
               "manifest": "./build/harmonyos-next/assets/assets/main/native",
               "manifest-harmony": "./native/engine/harmonyos-next/entry/src/main/resources/rawfile/Resources/assets/main/native"
           }
       ]
   }
   ```

4. 环境变量配置， 作者用的是mac，这里只列出来mac的配置 （一些私密数据通过环境变量来取）

   ```bash
   # android包签名工具 apksigner
   export APKSIGNER="/xxxx/sdk/android/build-tools/30.0.3/apksigner"
   export PATH=$PATH:$APKSIGNER
   
   # OSS环境变量 keyid 和 keysecret
   export OSS_ACCESS_KEY_ID="自己的阿里云的 keyid"
   export OSS_ACCESS_KEY_SECRET="自己的阿里云的 keysecret"
   # oss域名
   export OSS_URL="换成自己的"
   # oss REGION
   export OSS_REGION="换成自己的"
   # oss BUCKET
   export OSS_BUCKET="换成自己的"
   export PATH=$PATH:$OSS_ACCESS_KEY_ID:$OSS_ACCESS_KEY_SECRET:$OSS_URL:$OSS_REGION:$OSS_BUCKET
   
   # 飞书图片上传机器人 appid 和 secret
   export FEISHU_ROBOT_APPID="换成自己的"
   export FEISHU_ROBOT_SECRET="换成自己的"
   
   # 飞书自定义机器人的webhook地址  FEISHU_ROBOT_WEBHOOK用于release  FEISHU_ROBOT_WEBHOOK_DEBUG用于debug
   export FEISHU_ROBOT_WEBHOOK="换成自己的"
   export FEISHU_ROBOT_WEBHOOK_DEBUG="换成自己的"
   export PATH=$PATH:$FEISHU_ROBOT_APPID:$FEISHU_ROBOT_SECRET:$FEISHU_ROBOT_WEBHOOK:$FEISHU_ROBOT_WEBHOOK_DEBUG
   
   # 鸿蒙打包用到的环境变量
   # hdc
   export HDC_HOME="${换成自己的}harmony-command-line-tools/sdk/default/openharmony/toolchains"
   export PATH=$PATH:$HDC_HOME
   # hvigor ohpm 
   export PATH=${换成自己的}/harmony-command-line-tools/bin:$PATH
   # hap-sign-tool
   export HAP_SIGN_TOOL="${换成自己的}/harmony-command-line-tools/sdk/default/openharmony/toolchains/lib"
   export PATH=$PATH:$HAP_SIGN_TOOL
   ```



5. 配置结束



#### 脚本使用

* 命令行打包

  ```bash
  # 通过命令行打包 
  cd 工具根目录
  node BuildCommand.js
  ```

* 命令行热更新 

  ```bash
  # 通过命令行热更新
  cd 工具根目录
  node HotUpdateCommand.js
  ```

#### 可以集成到自动化流程中 （比如：jenkins）

```bash
# 打包
node BuildJenkins.js -p 渠道类型 -v 版本号 -b build号 -d 是否debug -r 微信和抖音用的上传机器人编号 -m 更新描述 -n 是否通知飞书

# 热更新
node HotUpdateJenkins.js -p 平台类型(platform) -v 版本号 -hot 资源版本号 -d 是否debug -n 是否通知飞书
```



### 支付宝`cli`说明

> 一个支付宝用户在同一时刻 **仅一份开发工具密钥有效**。 因此，当在不同的电脑上执行 `minidev login` 或者开放平台成功生成身份密钥时，会重新生成 toolId 和公私密钥对，从而导致之前的工具密钥失效

两种解决方案，这里使用的是第一种

1. 在一台机器上执行 `minidev login`后，生成的配置文件复制到另外的机器对应的目录下，默认位置
   * MacOS/Linux： `~/.minidev/config.json`
   * Windows `C:\User\你的用户名\.minidev\config.json`

2. 登录 [开放平台](https://open.alipay.com/platform/developerIndex.htm)， 在 **账户中心** > **密钥管理** > **开发工具密钥** > **生成身份密钥，点击重置** 即可重置密钥进行下载，之后通过指定`identity-key-path`或者设置cli config的方式使用身份秘钥

