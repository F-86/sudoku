# Sudoku

一个使用 React、TypeScript 和 Vite 开发的现代数独游戏。

## 功能

- 六档难度，每局随机生成且保证唯一解
- 行、列、宫及相同数字高亮
- 候选数字笔记、撤销、擦除和三次提示
- 错误次数限制、计时、暂停和得分
- 键盘快捷键与响应式移动端布局
- 自动保存当前游戏进度

## 本地运行

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run preview
```

## 快捷键

- `1` 至 `9`：填写数字或候选数
- `Backspace` / `Delete`：擦除
- `N`：切换笔记模式
- `H`：使用提示
- `P` / `Space`：暂停或继续
- `Command/Ctrl + Z`：撤销
- 方向键：移动选中格
