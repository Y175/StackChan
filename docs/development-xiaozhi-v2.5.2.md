# StackChan / XiaoZhi v2.5.2 开发基线

此分支从 M5Stack 官方 StackChan `f901cc2969189f3f0e96af1442c0f96e77e1e2c1` 开始，保留官方硬件初始化、StackChan World 绑定、局域网 Avatar 路由及原生表情/动作。

| 项目 | 固定版本 |
| --- | --- |
| XiaoZhi | `v2.5.2` / `49b4380b3faa0ceadd28a3e78aaf0f311c46c57e` |
| ESP-IDF | `v6.1` |
| 本分支固件版本 | `2.5.2.1`，与出厂 StackChan `1.6.0` 区分 |
| ESP-NOW | `c3b5f9be245f1a80db9cb938600566aa6a8dd1e5`，包含 IDF 6 支持 |
| 资源编辑器 | `78/xiaozhi-assets-generator` / `55517b40d724014faff00f941ca700cbf9d14b51` |

官方 [issue #120](https://github.com/m5stack/StackChan/issues/120) 的 v2.5.0 迁移作为接口变化参考；未合入其中的工作秘书、飞书、Hermes 和连续会话扩展。该作者的 CoreS3 测试不能替代官方 K151/C156 实机验收。

## 构建固件

先安装 Espressif 官方 ESP-IDF v6.1 和 ESP32-S3 工具链，并激活 `export.sh`。macOS 还需要 CMake 和 Ninja。

```sh
cd firmware
python3 fetch_repos.py
idf.py build
```

`fetch_repos.py` 会核对固定提交、应用板级补丁。补丁不匹配时直接失败；重复执行允许已应用的同一补丁，不丢弃本地修改。

默认仍使用官方 16 MB Flash 分区表：双 OTA 槽和 `assets` 4 MB 分区。没有扩大资源分区，也不依赖 Tab5。

开发固件默认关闭 OTA 服务端提供的固件替换，避免官方服务器下发的原版固件覆盖二开功能；OTA 接口中的联网和设备认证流程仍保留。设置菜单会明确提示通过 USB 更新。后续配置自己的固件发布渠道时，再启用 `CONFIG_STACKCHAN_ALLOW_SERVER_FIRMWARE_UPDATE`。

## 启动网页资源编辑器

```sh
# 在仓库根目录；需先完成固件构建
python3 tools/assets-editor/prepare.py
cd tools/assets-editor/upstream/web
VITE_BASE_URL=/ npm run dev -- --host 127.0.0.1
```

脚本拉取固定编辑器提交，应用 `upstream.patch`，用锁文件安装前端依赖，将本次固件生成的基础资源复制到本地网页。不会连接或刷写 USB 设备。

网页支持：

- 预设或自定义唤醒词；自定义中文优先选择 MultiNet7。
- 预设字体及上传字体转换。
- PNG / GIF 表情资源；不配置表情包时保留 StackChan 原生动态脸。
- 保留全部 18 个 StackChan 系统资源文件，避免菜单、配网图片被通用资源包覆盖。
- 打包时校验文件名、引用、基础包校验和和 4 MB 容量限制。

选择“保留基础字体/唤醒词”时使用这次固件构建的基础资源，**不是读取设备当前内容**。自定义字体不能继承基础 Noto 字体的元数据。网页表情预览用于检查素材，机器人上的字幕位置以实机为准。

中文 MultiNet7 约 2.55 MiB；它和基础大字库一起打包可能超过 4 MB。已验证可打包的组合：MultiNet7 中文 + 普惠体 14px/1bpp + Twemoji 64px + StackChan 系统资源，约 3.55 MiB。超过限制时会报错，需明确选择更小的字体/表情，不会自动删除系统资源。

生成的 `assets.bin` 是 XiaoZhi mmap 资源格式，不是完整固件，也不是普通 SPIFFS 文件系统。首次使用需要本分支固件中的表情显示适配。写入后重启才能重新初始化唤醒词模型。此阶段不提供自动刷写操作。

## 检查

2026-10-31 本地验证：ESP-IDF v6.1 完整构建通过，`stack-chan.bin` 为 3,725,728 字节，原 OTA 槽仍有约 28% 空间；网页生产构建通过；资源包测试 4 项、现有 motion_math_test 1 项通过。浏览器实际下载的测试资源包为 3,719,454 字节，已核对唤醒词、字体、21 个表情及全部 18 个系统文件。尚未刷写设备。

```sh
node --test tools/assets-editor/assets.test.mjs
node tools/assets-editor/validate-baseline.mjs firmware/build/generated_assets.bin
cd tools/assets-editor/upstream/web
VITE_BASE_URL=/ npm run build
```

构建与资源包检查不能证明触摸、摄像头、扬声器、头部舵机在实机上正常。首次刷机前需备份设备，之后验证启动、App 绑定、触摸、唤醒/对话、字体/表情、摄像头和动作。GoPlus2 的通信与输出测试尚独立待做，本分支未启用手臂或轮子输出。

音量、亮度、待机动作、舵机限位和轮子速度属于设备运行配置，需要后续设备 API；本次资源编辑器并未实现这些设置。
