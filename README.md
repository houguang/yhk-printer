# yhk-printer

无官方 Windows 驱动的便携卡通迷你热敏打印机（蓝牙名 **YHK-E194**）在电脑上直连打印的工具。
通过浏览器 / Electron 的 **Web Bluetooth** 直连设备，把内容渲染成黑白位图后按 ESC/POS 光栅位图协议下发，复刻手机 App 的打印流程。

## 支持设备

- 蓝牙名：`YHK-E194`（57mm 便携热敏机，约 384 点宽 / 每行 48 字节，200dpi，40mm/s）
- 连接方式：BLE GATT 透传 UART
- 说明：本机 USB 口仅充电、不枚举数据，不能走 Windows 驱动或串口文本打印。

## 工作原理

1. 内容（测试图案 / 文字 / 图片 / 二维码）绘制到 Canvas；
2. 灰度二值化（自适应平均或固定阈值），可选加粗膨胀；
3. 等比缩放到 384 点宽，按 80 行一段切分；
4. 每段封装一条 `GS v 0`（`1D 76 30 00`）光栅位图帧，蓝牙分包依次下发；
5. 末尾固定走 5 个换行出纸。

文字不直接发文本命令，全部以位图形式打印。

## 目录结构

```
yhk-printer/
├── main.js              # Electron 主进程（蓝牙设备选择、权限放行）
├── package.json         # Electron / electron-builder 配置
├── app/
│   ├── index.html       # Electron 渲染页（二维码库走本地）
│   └── qrcode.min.js    # 本地二维码库（离线可用）
└── web/
    └── yhk-printer.html # 浏览器直连版单文件页面
```

## 浏览器版（web/yhk-printer.html）

- 使用支持 Web Bluetooth 的 Chromium 内核浏览器（Chrome / Edge）。
- Web Bluetooth 要求安全上下文：建议用本地静态服务打开，例如在本目录执行
  `python -m http.server 8765`，再访问 `http://localhost:8765/web/yhk-printer.html`。
- 页面内选择内容来源、调整浓淡 / 二值化 / 加粗，点「连接打印机」选中 YHK-E194 后即可打印。

## Electron 桌面版

```bash
npm install
npm start        # 本地调试启动
npm run dist     # 打包 Windows portable 单文件 exe（输出到 dist/）
```

打包产物为免安装 portable exe，打开即用。

### 关键实现说明

Electron 没有内置蓝牙设备选择弹窗，主进程必须监听
`webContents.on('select-bluetooth-device', ...)`，从扫描列表中选出目标设备并回调
`deviceId`；否则 `requestDevice()` 会被当作用户取消。本工程已自动匹配 `YHK` 前缀设备。

## 协议参数

| 项 | 值 |
| --- | --- |
| Service UUID | `49535343-fe7d-4ae5-8fa9-9fafd205e455` |
| TX（主机→机，write） | `49535343-8841-43f4-a8d4-ecbe34729bb3` |
| RX（机→主机，notify） | `49535343-1e4d-4bd9-ba61-23c647249616` |
| 纸宽 | 384 点 / 48 字节每行 |
| 分段高度 | 80 行 / 条 |
| 单包 / 间隔 / 收尾 | 120 字节 · 80ms · 2500ms（页面可调） |

位序 MSB-first，黑像素置位 `1 << (7 - (x & 7))`。

## 已知限制

- 浓度 / 速度 / 温度的私有固件命令在本机实测静默无效，浓淡只能在位图侧（阈值、加粗膨胀）调整。
- 走纸式热敏机不能退纸、不能原地重打，重复下发只会顺排第二幅图，无法同位置叠深。
- 设备回传的 `err:` 状态帧含义未完全定论，打印中途出现一般不影响出图。

## 免责声明

本项目为个人逆向研究与自用工具，与设备厂商无关。协议细节基于实测与公开开源项目整理，
不同批次固件可能存在差异，请自行评估使用风险。
