# Sudoku

一个使用 React、TypeScript 和 Vite 开发的现代数独游戏。

## 功能

- 六档难度，每局随机生成且保证唯一解
- 行、列、宫及相同数字高亮
- 候选数字笔记、撤销、擦除和三次提示
- 错误次数限制、计时、暂停和得分
- 轻量交互音效与可持久记忆的静音开关
- 键盘快捷键与响应式手机布局
- 可安装到手机主屏幕，并支持离线运行
- 自动保存当前游戏进度

## 本地运行

```bash
npm install
npm run dev
```

开发服务器会监听局域网。手机与电脑连接同一 Wi-Fi 后，可打开终端显示的 `Network` 地址临时试玩；此方式需要电脑保持运行。

## 手机上安装

仓库包含 GitHub Pages 自动发布流程。首次需要在仓库的 `Settings → Pages` 中将 `Source` 设为 `GitHub Actions`，之后每次推送到 `main` 都会自动发布到：

[https://f-86.github.io/sudoku/](https://f-86.github.io/sudoku/)

- iPhone/iPad：使用 Safari 打开页面，点击分享按钮，然后选择“添加到主屏幕”。
- Android：使用 Chrome 打开页面，在浏览器菜单中选择“安装应用”或“添加到主屏幕”。

首次在线打开并等待页面加载完成后，应用会缓存游戏资源，之后断网也能启动。主屏幕安装和离线能力需要 HTTPS，因此推荐使用 GitHub Pages 地址，而不是局域网 HTTP 地址。

## 可用命令

```bash
npm run dev
npm run lint
npm run build
npm run build:pages
npm run preview
```

## 快捷键

- `1` 至 `9`：填写数字或候选数
- `Backspace` / `Delete`：擦除
- `N`：切换笔记模式
- `H`：使用提示
- `M`：开启或关闭音效
- `P` / `Space`：暂停或继续
- `Command/Ctrl + Z`：撤销
- 方向键：移动选中格
