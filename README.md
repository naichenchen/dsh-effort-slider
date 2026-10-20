# @local/effort-slider

**推理等级滑动变阻器** —— 把 DSH 官方模型选择器里的「推理等级」从按钮列表换成可拖动的滑块，视觉参考 OpenAI Codex。

## 这是什么

DSH 官方的模型选择器（composer 里的 `DeepSeek-Flash Off ⌄`）点开后，推理等级是一列单选按钮（Off / Low / High / Max）。本插件用 `conversation.input.model` slot **整体替换**这个控件，改成：

```
第一层（点开就看到）
┌─────────────────────────────┐
│ 模型          DeepSeek-Flash › │
│ 推理等级                Off  › │
└─────────────────────────────┘

第二层 · 点「模型」              第二层 · 点「推理等级」
┌───────────────────────┐      ┌───────────────────────┐
│ ‹ 模型                 │      │ ‹ 推理等级             │
│ DeepSeek              │      │ 当前             Off   │
│  DeepSeek-Flash   ✓   │      │ ●━━━━━━━━━            │
│  DeepSeek-V4-Pro      │      │ Off  Low  High  Max   │
│ ...（内部滚动）        │      └───────────────────────┘
└───────────────────────┘
```

## 功能

- **双层导航**：第一层两个入口，各自进入子页；点 `<` 或按 `Esc` 返回
- **滑块调节**：拖动时跟手预览，**松手才提交**（不会滑过中间档位就切换）
- **卡片不自动关**：拖动滑块、切换模型都不会关闭卡片，只有点外部才关
- **键盘可用**：方向键 / Home / End 调节，松键提交
- **主题适配**：颜色全部走 DSH 主题变量（`--dsw-*`），明暗主题都正常

## 技术实现

| 项 | 说明 |
|---|---|
| 挂载点 | `conversation.input.model`（single slot，整体替换官方控件） |
| 数据来源 | `ctx.modelDirectories.directoryFor(sessionId)` ✅ 与官方共用同一份 per-session 目录 |
| 状态订阅 | `directory.store.getSnapshot()` + `subscribe()` + `useSyncExternalStore` |
| 提交方式 | `directory.select({ provider, model, reasoningEffort })` |
| 依赖注入 | `ctx.inject(['slots','sessions','modelDirectories','remote','remote.session'], ...)` |

**关键点**：必须注入 `remote` 和 `remote.session`，否则 `directoryFor()` 会抛
`cannot get property "remote.session" without inject`。

## 可调参数（都在 `client.js` 里）

| 参数 | 位置 | 当前值 | 作用 |
|---|---|---|---|
| 卡片宽度 | `const lw = 260;` | 260px | 卡片和滑轨的总宽 |
| 卡片最大高度 | `const maxH = Math.min(300, ...)` | 300px | 超出内部滚动 |
| 垂直间距 | `const GAP_V = 8;` | 8px | 卡片底部到输入框顶部 |
| 轨道粗细 | `.ms-track { height: }` | 12px | 渐变滑轨高度 |
| 滑块头 | `::-webkit-slider-thumb { width/height }` | 24px | 圆形拖动手柄 |
| 拖动区高度 | `.ms-range { height: }` | 32px | 可点击/拖动区域 |
| 位置偏移 | `x = rect.right - lw` | — | 官方逻辑：右边缘对齐按钮 |

## 位置逻辑

完全照搬官方 `dsh-client-ui-model-selection` 的算法：

```js
const rect = root.getBoundingClientRect();
const lw = 260;                    // 卡片宽
const lh = menu.offsetHeight;      // 卡片实际高
let x = rect.right - lw;           // 右边缘对齐按钮右边缘
let y = rect.top - 8 - lh;         // 按钮上方 8px
```

再做屏幕边界约束（8px 边距），上方放不下自动翻到下方。

## 管理

```bash
# 停用（恢复官方控件）
plugin_manager action=set_bundle target=@local/effort-slider enabled=false

# 启用
plugin_manager action=set_bundle target=@local/effort-slider enabled=true
```

停用后 `conversation.input.model` 会回落到官方组件，无需重装。

## 目录

```
effort-slider/
├── package.json          # 包清单 + dsh.client 声明
├── cordis.patch.yml      # 插入插件行
├── index.js              # Host 侧空实现（仅客户端渲染）
├── client.js             # 全部逻辑：组件 + 样式（约 23KB）
└── README.md
```

## 备份

改这个插件前，官方原始文件备份在 `C:\Users\奈辰辰\.reasonix\client.js.backup`
（79585 字节），那是 `dsh-client-ui-model-selection/lib/client.js` 的原始版本，
用于万一需要还原官方文件时参考。

## 注意事项

- 插件通过 `link:` 安装到 profile，**改源码即时生效**，刷新页面即可看到
- 卡片定位在**首次打开**和**切换层级**时各测一次，极端窗口尺寸变化下可能需重开一次
- 如果卡片完全不显示，先看是否 `menuPos` 为空（定位计算失败），
  再检查 `ctx.inject` 的依赖列表是否有 `remote.session`
