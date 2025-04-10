### 项目说明

creator项目自动化打包工具，全自动化流程

打包： `creator项目构建 -> 项目打包 -> 自动上传远程资源到cdn -> 发送飞书通知`

热更新：`creator项目构建 -> 自动上传远程资源到cdn -> 发送飞书通知` 

* creator项目构建

* 支持平台

  ```txt
  1. andorid （支持多渠道）
  2. ios （未实现，需配合`fastlane`使用）
  3. 鸿蒙 （未实现）
  4. 微信小游戏
  5. 支付宝小游戏
  6. 抖音小游戏
  7. 华为快游戏（未实现）
  ```

* 

### 使用说明

* 项目clone到本地

* 到项目根目录下，执行以下命令， 安装依赖npm包

  ```bash
  npm i
  ```

* 修改根目录下的`config.json`配置文件

  ```js
  {
    	// creator所在路径
      "creator": "/Applications/Cocos/Creator/3.8.0/CocosCreator.app/Contents/MacOS/CocosCreator",
    	// creator项目路径，换成自己的
      "project": "/Users/**/work/kunpo-lib/KunpoDemo",
  
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
              "channel": "ohos",
              "name": "鸿蒙",
              "platform": "ohos",
              "config": "./local/buildConfig_ohos.json"
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
              "keystore": "./cert/android/test.keystore",
            	// android打包秘钥的alias
              "alias": "abcd",
            	// android打包秘钥的密码
              "password": "A123456"
          },
          {
            	// 同上
              "platform": "ios",
              "native": "./native/engine/ios",
              "build": "./build/ios/proj"
          },
          {
  						// 同上
              "platform": "ohos",
              "native": "./native/engine/ohos"
          },
          {
              "platform": "wechatgame",
              "build": "./build/wechatgame",
            	// 微信小游戏的appid
              "appid": "",
            	// 微信小游戏自动上传用的秘钥 相对于此工具的根目录
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
              "appid": "tt8d6bfbd6125e2b4002",
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
              "platform": "ohos",
              "cdnDebug": "test/hot-update-debug/",
              "cdn": "test/hot-update/",
              "dest": "./assets/",
              "src": "./build/ohos/assets",
              "manifest": "./build/ohos/assets/assets/main/native"
          }
      ]
  }
  ```

* 环境变量配置， 作者用的是mac，这里只列出来mac的配置 （一些私密数据通过环境变量来取）

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
  ```

* 配置完成



#### 脚本使用
```bash
# 通过命令行打包
node BuildCommand.js

# 通过命令行热更新 (热更新部分，作者做了一些处理，要用到项目中得修改一部分内容，这里不写了)
node HotUpdateCommand.js

# 可以集成到jenkins自动化流程中
# 打包使用脚本
node BuildJenkins.js -p 渠道类型 -v 版本号 -b build号 -d 是否debug -r 微信和抖音用的上传机器人编号 -m 更新描述 -n 是否通知飞书

# 热更使用脚本
node HotUpdateJenkins.js -p 平台类型(platform) -v 版本号 -hot 资源版本号 -d 是否debug -n 是否通知飞书
```



### 支付宝`cli`说明

> 一个支付宝用户在同一时刻 **仅一份开发工具密钥有效**。 因此，当在不同的电脑上执行 `minidev login` 或者开放平台成功生成身份密钥时，会重新生成 toolId 和公私密钥对，从而导致之前的工具密钥失效

两种解决方案，这里使用的是第一种

1. 在一台机器上执行 `minidev login`后，生成的配置文件复制到另外的机器对应的目录下，默认位置
   * MacOS/Linux： `~/.minidev/config.json`
   * Windows `C:\User\你的用户名\.minidev\config.json`

2. 登录 [开放平台](https://open.alipay.com/platform/developerIndex.htm)， 在 **账户中心** > **密钥管理** > **开发工具密钥** > **生成身份密钥，点击重置** 即可重置密钥进行下载，之后通过指定`identity-key-path`或者设置cli config的方式使用身份秘钥

