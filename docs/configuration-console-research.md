# StackChan 配置台：功能边界与接入清单

核对日期：2026-10-31。固件基线为小智 v2.5.2；控制台不是固件仓库中的资源编辑器。

**官方 StackChan 还有独立的账号边界**：这台设备按官方流程通过 StackChan World App 绑定 M5Stack 账号。不能假定其智能体会自动出现在普通 `xiaozhi.me` 账号下。[M5Stack 官方说明](https://docs.m5stack.com/zh_CN/StackChan)。仓库中的 `app/lib/util/xiao_zhi_util.dart`、`app/lib/model/XiaoZhi/agent.dart` 和 `server/internal/xiaozhi/xiaozhi.go` 提供了 App 接入小智的具体协议，可作为继续官方服务时的实现依据。没有调用全局开发者 Token 接口、没有读取任何其他用户的设备或智能体。

## 三个不同的配置系统

1. **小智官方云控制台**：角色、音色、模型、记忆、声纹、历史对话、设备绑定、声音复刻、知识库与 MCP。官方 Q&A 说明了角色音色和声纹的服务端操作；M5Stack 官方教程展示了控制台菜单。控制台当前需要登录，未获得用户登录态，不能据此声称已验证其所有账户级功能或 API。
   - [官方 Q&A](https://xiaozhi.me/xz-docs/docs/help-doc/xiaozhi-ai-chatbot-q%26a/)
   - [官方控制台](https://xiaozhi.me/console/)
   - [M5Stack 官方教程](https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/static/pdf/static/en/guide/realtime/xiaozhi/sticks3.pdf)
2. **开源小智服务端智控台**：不是官方控制台源码。可以自建，提供后台接口、数据库和语音服务，不能把它的前端接到官方账号上就认为兼容。
   - [xinnan-tech/xiaozhi-esp32-server](https://github.com/xinnan-tech/xiaozhi-esp32-server)
   - 本次检查提交 `1a095d5bed23e49a17f817c7f378e2a86f298dfc`，许可证 MIT。
3. **本地资源编辑器**：生成资源包，包括唤醒模型、表情和字体。没有角色、云模型或记忆的服务端。当前工作台基于此编辑器，移除固定硬件的重复选择和步骤导航。
   - [78/xiaozhi-assets-generator](https://github.com/78/xiaozhi-assets-generator)
   - 固定提交 `55517b40d724014faff00f941ca700cbf9d14b51`。

## 菜单划分

| 一级菜单 | 功能 | 实际归属与前提 |
| --- | --- | --- |
| 智能体 | 创建/选择智能体、角色模板、昵称、人设、语言、音色、模型 | 云端，必须连接所选服务端 |
| 对话与记忆 | 对话记录、记忆读取与编辑、记忆类型 | 云端，需要智能体权限 |
| 声音与说话人 | 音色试听、声音复刻、声纹与人物关系 | 云端，实际模型能力和账户权限决定可用项 |
| 知识库 | 知识库、文档及检索配置 | 云端，自建项目使用 RAGFlow 等服务 |
| 工具与 MCP | MCP 接入、工具列表、意图/插件配置 | 云端及设备；不能混同为资源包字段 |
| 设备 | 绑定、设备列表、会话状态、远程指令 | 云端账号及在线设备 |
| 资源 | 唤醒词、字体、字幕、表情素材、预览、导出 | 本地资源包 |
| 系统显示与声音 | 音量、亮度、时区 | StackChan HAL，需设备通信接口 |
| 启动与省电 | 启动 AI、待机动作级别、空闲关机、充电关机策略 | StackChan HAL，部分修改重启后应用 |
| 运动与灯光 | 头部角度、回中、零位标定、RGB | StackChan HAL，实际执行必须连接设备 |
| 扩展动力 | GoPlus2、手臂、左右轮、转向 | 尚需独立总线通信和输出实测；不能推断为已兼容 |
| 诊断与维护 | 固件版本、网络检查、麦克风测试、资源更新 | 固件与设备，资源导出成功不等于刷写成功 |

自建服务器管理员另有：用户管理、模型供应商、模型配置、参数管理、字典、默认角色模板、模板快速配置、功能开关、替换词、通讯录、服务端管理、OTA、声音资源和声音复刻。来源为固定提交中的 [路由清单](https://github.com/xinnan-tech/xiaozhi-esp32-server/blob/1a095d5bed23e49a17f817c7f378e2a86f298dfc/main/manager-web/src/router/index.js) 和 `main/manager-web/src/apis/module/`。这些是服务端管理员功能，不应作为官方云普通账号的承诺。

设备菜单已逐项检查 `firmware/main/apps/app_setup/app_setup.cpp`；可复用的 MCP 工具位于 `firmware/main/hal/hal_mcp.cpp` 和 `firmware/xiaozhi-esp32/main/mcp_server.cc`。当前本地页没有设备传输通道，不能将按钮点击或本地草稿保存描述为已写入设备。

## 表情组件与素材

| 项目 | 许可证/运行方式 | 结论 |
| --- | --- | --- |
| [M5Stack 官方 StackChan avatar](https://github.com/m5stack/StackChan/tree/main/firmware/main/stackchan/avatar) | MIT；当前 LVGL 运行时 | 已有动态眼睛、嘴型、心形、害羞、汗滴、生气、眩晕装饰，应优先复用 |
| [m5stack-avatar](https://github.com/stack-chan/m5stack-avatar) | MIT；Arduino/M5GFX | 可参考表情逻辑，不能直接替换本项目的 ESP-IDF/LVGL 渲染器 |
| [RoboEyes](https://github.com/FluxGarage/RoboEyes) | GPL-3.0；Adafruit GFX | 依赖与许可证均不同，本次不直接混入当前 MIT 固件 |
| [stackchan-mcp 像素动画](https://github.com/migratorywhale/stackchan-mcp) | MIT；7 组 GIF | 引入原始 GIF 素材，沿用现有 LVGL GIF 解码器；保留完整许可证和来源哈希 |
| [Google Noto Emoji](https://github.com/googlefonts/noto-emoji) | 字体与图片许可需分别看源项目说明 | 当前上游编辑器已有 64/128 GIF 预设，不把已有能力算作新接入 |
| [Twemoji](https://github.com/twitter/twemoji) | 图形素材 CC-BY-4.0 | 当前上游编辑器已有 32/64 PNG 预设 |

像素动画固定来源：`migratorywhale/stackchan-mcp@7673c4c9cb93a342824f94c2a91432e4cdbafcf0` 的 `firmware/src/gif_assets.h`。直接提取字节，没有重新绘制。7 个文件合计 153,779 字节，均为 6 帧；6 个文件为 192×192，`smug.gif` 为 288×288。导出时统一走已有 GIF 缩放路径适配为 192×192。21 个情绪索引只映射到 7 个独立动画，其余明确使用平静动画，不声称有 21 套不同动画。

GIF 模式是循环动画，并非口型实时合成。保留原生脸时继续使用现有的动态嘴型和眨眼机制。素材包生成、固件编译、实机显示与语音联动是不同验证项。

本分支另外提供原生情绪装饰开关，通过 `index.json.stackchan.native_expression_effects` 显式启用。固件复用原有 Heart/Shy/Angry/Sweat/Dizzy 组件，覆盖喜爱/飞吻、尴尬、生气、惊讶/震惊、困惑；切换表情只移除本显示适配器创建的装饰，不清理触摸或 IMU 的装饰。GIF 模式不叠加这些装饰。

## 已执行验证

- 网页实际生成并下载像素动画包：3,800,273 字节；21 个情绪索引指向 7 个独立 GIF。
- 解包后验证所有 GIF 为 192×192、6 帧；18 个系统菜单和配网资源与固件基础包逐字节一致。
- 直接菜单导航、原生装饰开关和导出前的必填校验已通过浏览器操作验证。
- 含原生情绪装饰适配的 ESP32-S3 固件编译通过；没有刷写设备，因此实机效果尚未验证。

## 当前需用户决定的依赖

已询问：继续官方服务、自建开源服务端、或连接已有自建后台。云端实现依赖此选择；等待回复期间先完成直接菜单式资源编辑和表情素材接入。不能以未回复等同于同意迁移服务端。
