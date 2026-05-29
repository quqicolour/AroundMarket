# ELFLAB 前端设计文档

> **设计理念**：参考 Polymarket 的极简交易 UI，现代化暗色主题，以数据为核心，减少视觉噪音，让用户专注于市场信息和交易行为。

---

## 一、技术栈与项目结构

### 1.1 技术选型

| 层级 | 技术 | 版本 |
|------|------|------|
| 构建 | Vite | ^5.x |
| UI 框架 | React | ^18.x |
| Web3 交互 | wagmi | ^2.x |
| ETH 交互 | viem | ^2.x |
| 钱包连接 | RainbowKit | ^2.x |
| 样式 | Tailwind CSS | ^3.x |
| 状态管理 | Zustand | ^4.x |
| 数据获取 | TanStack Query | ^5.x |
| 图表 | Recharts | ^2.x |
| 组件库 | shadcn/ui（暗色适配） | latest |

### 1.2 项目结构

```
elflab-front/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── wagmi.ts                    # wagmi 配置 + chain
│   ├── abi/
│   │   ├── PredictionMarketFactory.json
│   │   ├── Market.json              # Market 模板 ABI（克隆代理）
│   │   ├── ConditionalTokens.json
│   │   ├── SettlementManager.json
│   │   ├── OrderBook.json
│   │   └── MatchingEngine.json
│   ├── constants/
│   │   └── addresses.ts            # 合约地址常量
│   ├── hooks/
│   │   ├── useMarkets.ts           # 市场列表查询
│   │   ├── useMarket.ts            # 单个市场详情
│   │   ├── useOrderBook.ts         # 订单簿查询
│   │   ├── useTrade.ts             # 交易（下单/成交）
│   │   ├── usePositions.ts         # 用户持仓
│   │   └── useCreateMarket.ts      # 创建市场
│   ├── store/
│   │   └── marketStore.ts           # Zustand 全局状态
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx           # 顶部导航
│   │   │   ├── Sidebar.tsx          # 侧边导航（可选）
│   │   │   └── Footer.tsx
│   │   ├── market/
│   │   │   ├── MarketCard.tsx        # 市场卡片（列表页）
│   │   │   ├── MarketHeader.tsx      # 市场头部（名称/价格/状态）
│   │   │   ├── OrderBook.tsx         # 订单簿组件
│   │   │   ├── TradePanel.tsx        # 交易面板（买入/卖出 YES/NO）
│   │   │   ├── PriceChart.tsx        # 价格走势图
│   │   │   └── MarketStats.tsx       # 市场统计（成交量/流动性）
│   │   ├── portfolio/
│   │   │   ├── PositionCard.tsx       # 持仓卡片
│   │   │   └── PortfolioSummary.tsx   # 组合总览
│   │   └── ui/                       # shadcn/ui 组件暗色适配
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── badge.tsx
│   │       ├── separator.tsx
│   │       └── skeleton.tsx
│   ├── pages/
│   │   ├── Home.tsx                 # 首页：市场列表
│   │   ├── MarketDetail.tsx         # 市场详情页
│   │   ├── Portfolio.tsx            # 我的持仓
│   │   ├── CreateMarket.tsx         # 创建市场
│   │   └── NotFound.tsx
│   ├── lib/
│   │   ├── utils.ts                  # 工具函数（formatCurrency 等）
│   │   └── format.ts                # 格式化（价格/时间/百分比）
│   └── styles/
│       └── globals.css              # Tailwind 入口 + 暗色变量
```

---

## 二、视觉设计规范

### 2.1 配色方案（Polymarket 风格暗色）

```css
/* globals.css — CSS 变量 */
:root {
  /* 背景层次 */
  --bg-base:       #0d1117;   /* 主背景 */
  --bg-surface:    #161b22;   /* 卡片/面板背景 */
  --bg-elevated:   #21262d;   /* 悬浮/高亮层 */
  --bg-overlay:    #30363d;   /* 模态框/下拉 */

  /* 边框 */
  --border:        #30363d;
  --border-subtle: #21262d;

  /* 主色调 */
  --primary:       #4F46E5;   /* Indigo — 主操作/链接 */
  --primary-hover: #4338CA;

  /* 文字层次 */
  --text-primary:  #f0f6fc;   /* 标题/重要文字 */
  --text-secondary:#8b949e;   /* 次要文字 */
  --text-tertiary: #484f58;   /* 禁用/占位符 */

  /* YES 颜色 */
  --yes:           #22c55e;   /* 绿色 — 看涨/YES */
  --yes-muted:     #166534;

  /* NO 颜色 */
  --no:            #ef4444;   /* 红色 — 看跌/NO */
  --no-muted:      #991b1b;

  /* 价格颜色 */
  --price-up:      #22c55e;
  --price-down:    #ef4444;

  /* 功能色 */
  --success:       #22c55e;
  --warning:       #f59e0b;
  --error:        #ef4444;
  --info:         #3b82f6;
}
```

### 2.2 字体

- **主字体**：Inter（Google Fonts）— UI 界面
- **数字/价格**：JetBrains Mono — 等宽，适合价格数字对齐
- **中文回退**：system-ui, -apple-system, "PingFang SC", "Microsoft YaHei"

### 2.3 间距系统（8px 基准）

| token | value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

### 2.4 圆角

- 卡片/面板：`rounded-xl` (12px)
- 按钮：`rounded-lg` (8px)
- 标签/徽章：`rounded-md` (6px)
- 输入框：`rounded-lg` (8px)

### 2.5 动效

- 过渡时间：150ms（快速交互）/ 300ms（面板展开）
- 缓动：`ease-out`
- 价格变动：数字颜色闪烁 300ms 后淡出
- 订单簿更新：行高亮闪烁（背景色从 `--bg-elevated` 到透明）300ms

---

## 三、页面结构与功能

### 3.1 首页 — 市场列表（Home.tsx）

**布局**：两栏布局，左侧筛选器（折叠），右侧市场卡片网格。

**顶部区块**：
- 标题 "预测市场" + 搜索框（模糊匹配问题文本）
- 筛选标签：`全部` `即将关闭` `新建` `已解决`
- 排序：`成交量` `最新` `即将到期`

**市场卡片（MarketCard）**：

```
┌─────────────────────────────────────────────┐
│ [状态徽章]                    [关闭倒计时] │
│                                             │
│ 问题描述文字（最多2行，超出截断）            │
│                                             │
│ YES  [━━━●━━━━━━━━] 67%   $0.67           │
│ NO   [━━━━━━━━━●━━] 33%   $0.33           │
│                                             │
│ 成交量: $12,340   交易次数: 89              │
└─────────────────────────────────────────────┘
```

- 状态徽章颜色：OPEN → Indigo，CLOSED → Gray，RESOLVED → Green
- 价格条：YES/NO 比例用对应颜色填充
- 点击跳转 MarketDetail

**空状态**：显示插图 + "暂无市场，来创建第一个吧"

### 3.2 市场详情页（MarketDetail.tsx）

**单页布局（Polymarket 参考）**：两栏固定 + 底部订单簿。

```
┌────────────────────────────────────────────────────────┐
│  [← 返回]   问题描述文字                    [分享] [⚙] │
├─────────────────────────┬──────────────────────────────┤
│                         │                              │
│     价格走势图           │       交易面板               │
│     (PriceChart)        │       (TradePanel)           │
│                         │                              │
├─────────────────────────┤       YES 按钮  NO 按钮      │
│                         │       限价    市价          │
│     订单簿               │       [价格输入]            │
│     (OrderBook)          │       [数量输入]            │
│                         │       [买入/卖出]            │
│     买卖盘深度可视化      │                              │
├─────────────────────────┴──────────────────────────────┤
│                                                        │
│              我的持仓 / 历史交易                       │
└────────────────────────────────────────────────────────┘
```

**3.2.1 价格走势图（PriceChart）**
- 折线图显示 YES 价格随时间变化
- X 轴：时间，Y 轴：价格（$0.00 – $1.00）
- 悬浮显示：时间戳 + 价格 + 成交量
- 参考 Polymarket：简洁折线图，无网格线，深色背景
- 数据来源：链上历史成交记录聚合（前端自行聚合 Trade 事件）

**3.2.2 交易面板（TradePanel）**

```
┌────────────────────────────┐
│  [YES]        [NO]         │  ← 方向切换 Tab
│                            │
│  ● 买入    ○ 卖出          │  ← 操作切换
│                            │
│  类型 [限价 ▼]             │
│                            │
│  价格  $  [____0.67____]   │
│  数量  [_______________]   │
│  金额    $ 67.00           │
│                            │
│  ── 可用: $1,234.56 USDC ─ │
│                            │
│  [████████ 买入 YES]       │  ← 主操作按钮
│                            │
│  预计滑点: ~0.1%           │
└────────────────────────────┘
```

- **方向 Tab**：YES / NO — 切换下单方向
- **操作切换**：买入（绿色）/ 卖出（红色）
- **类型**：限价单 / 市价单（市价单无需填写价格）
- **金额计算**：price × amount，实时更新
- **余额显示**：Wallet USDC 余额（from viem ERC20 balanceOf）
- **Gas 估算**：显示预估 gas（viem gasEstimate）
- **按钮状态**：余额不足 → 灰色禁用；无钱包 → "连接钱包"

**3.2.3 订单簿（OrderBook）**

```
              YES 盘                    NO 盘
         价格        数量/订单      价格        数量/订单
         ──────────────────      ──────────────────
         $0.72       120 / 3 →    $0.71       450 / 5 ←
         $0.68       200 / 2 →    $0.65       100 / 1 ←
         $0.67        50 / 1 →    $0.60       300 / 2 ←
    ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
         $0.66       80 / 2 ←    $0.63       200 / 3 →
         $0.65       150 / 4 ←    $0.60       500 / 4 →
         $0.62       100 / 1 ←    $0.55       80 / 2 →
```

- 最佳买价/卖价用颜色高亮
- 价格精度：1e18 → $0.01（分）
- 点击某档价格 → 自动填充 TradePanel 价格输入框
- 撮合箭头指示买卖方向
- `──` 分隔线标记当前市场价格（spread 可视化）

**3.2.4 深度图表（可选）**

- 横向柱状图，显示每个价格档位的总数量
- YES 绿色向右，NO 红色向左，中间交汇处为 spread

### 3.3 创建市场页（CreateMarket.tsx）

**流程**：单页三步表单，无需多页 wizard。

```
┌─────────────────────────────────────────────────────┐
│  创建预测市场                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  问题描述 *                                         │
│  [___________________________________________]     │
│  例：美国 2024 大选谁会获胜？                       │
│                                                     │
│  描述补充（可选）                                   │
│  [___________________________________________]     │
│                                                     │
│  结束时间 *                                         │
│  [📅 选择日期时间___________________________]       │
│                                                     │
│  初始流动性                                         │
│  [________] USDC                                   │
│                                                     │
│  市场结果解释（可选）                                │
│  [___________________________________________]     │
│                                                     │
│  ── 预计成本：~$5.00 gas ──                        │
│                                                     │
│  [创建市场]                                         │
└─────────────────────────────────────────────────────┘
```

- 表单校验：问题描述非空、结束时间 > 当前时间、初始流动性 > 0
- 预估成本：estimate gas × current gas price
- 提交后显示 pending tx，链上确认后跳转市场详情页

### 3.4 组合页面（Portfolio.tsx）

```
┌─────────────────────────────────────────────────────┐
│  我的组合                           [USDC: $1,234] │
├─────────────────────────────────────────────────────┤
│  [持仓]  [历史交易]  [订单]                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  持仓 (Positions)                                   │
│  ┌───────────────────────────────────────────────┐ │
│  │ [市场名称]           YES  50 @ $0.67          │ │
│  │ [市场名称]           NO   20 @ $0.33          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  历史交易 (Trade History)                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ 时间     市场     方向  价格   数量   状态     │ │
│  │ 05-26   选举      YES  $0.67  50     已结算   │ │
│  │ 05-25   气候      NO   $0.41  30     开放中   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  我的订单 (Open Orders)                             │
│  ┌───────────────────────────────────────────────┐ │
│  │ 市场     方向  价格   数量   剩余    操作      │ │
│  │ 选举    YES  $0.70  100   80     [取消]      │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

- 标签页切换：持仓 / 历史交易 / 开放订单
- 赎回按钮：结算后的 YES/NO 仓位显示 "赎回" 按钮，点击调用 SettlementManager.redeem()
- 取消订单：订单行右侧 "取消" 按钮，点击调用 Market.cancelOrder()

---

## 四、核心组件详细规格

### 4.1 Header.tsx

```
┌───────────────────────────────────────────────────────────┐
│ [🦊 ELFLAB]    [市场]  [组合]  [创建]     [🔗 连接钱包]   │
└───────────────────────────────────────────────────────────┘
```

- Logo：🦊 emoji + "ELFLAB" 文字
- 导航：`市场` `组合` `创建`
- 钱包按钮：未连接 → "连接钱包"（RainbowKit Button）；已连接 → 显示短地址 `0x1234...5678`
- 钱包下拉：显示余额、切换账号、断开连接
- 暗色背景，高度 64px，底部 1px 边框

### 4.2 TradePanel.tsx 交互逻辑

```
状态机：
IDLE → FILLED_INPUTS → READY_TO_SUBMIT → SUBMITTING → SUCCESS/ERROR

用户操作：
1. 选择 YES/NO tab
2. 选择 买入/卖出
3. 选择 限价/市价
4. 输入 价格（如限价）
5. 输入 数量
6. 实时计算 金额 = price × amount
7. 点击 [买入 YES] / [卖出 NO]
8. 弹出 RainbowKit 确认弹窗
9. tx pending → 显示 spinner
10. tx 确认 → toast success + 重置表单
11. tx 失败 → toast error
```

- 市价单：不需要价格输入，价格字段灰显，成交价以订单簿最优价成交
- 余额不足：按钮禁用 + tooltip "USDC 余额不足"
- 数量输入：支持百分比快捷按钮 `[25%] [50%] [75%] [MAX]`

### 4.3 OrderBook.tsx 实时更新

- 使用 `useContractRead` 轮询（pollingInterval: 3000）获取订单簿数据
- 价格档位聚合：同一价格的多个订单合并显示总数量和订单数
- 动画：新订单入场时行背景闪烁 300ms
- 点击档位：触发 `onPriceClick(price)` 回调，填充 TradePanel

### 4.4 MarketCard.tsx 样式

- 卡片尺寸：固定宽度（响应式 grid），高度自适应
- 悬浮效果：`hover:border-[--primary]` 边框高亮，`hover:shadow-lg` 阴影
- 价格条：YES 绿色填充宽度比例，NO 红色填充宽度比例
- 关闭倒计时：`<Countdown date={closeDate} />`，到期前 24h 显示红色

---

## 五、web3 交互层（hooks 设计）

### 5.1 useMarkets — 市场列表

```typescript
// 读取 PredictionMarketFactory.nextMarketId() 确定市场总数
// 循环读取 markets(i) 获取每个市场的 MarketData
// 额外读取：各市场的当前 YES 价格（通过 OrderBook.getBestPrice）
// 返回：MarketInfo[]

interface MarketInfo {
  marketId: uint64
  address: address          // EIP-1167 克隆地址
  collateral: address
  conditionId: bytes32
  resolved: boolean
  question: string           // 需前端索引（存储在 IPFS 或后端）
  yesPrice: bigint          // 1e18
  noPrice: bigint
  volume: bigint
  closeTime: uint256
}
```

### 5.2 useMarket — 单市场详情

```typescript
// 传入 marketId，返回：
// - marketAddress（从 factory.markets() 获取）
// - orderBookAddress, matchingEngineAddress
// - bestYesBid, bestYesAsk, bestNoBid, bestNoAsk
// - myPositions: { yesBalance, noBalance }
// - myOrders: OrderData[]
```

### 5.3 useOrderBook — 订单簿

```typescript
// 调用 OrderBook.getSortedPrices(marketId, true/false)
// 遍历每个价格档位获取订单列表
// 返回聚合后的 PriceLevel[]

interface PriceLevel {
  price: uint128
  totalAmount: uint128
  orderCount: uint256
  orders: OrderData[]
}
```

### 5.4 useTrade — 交易

```typescript
// placeOrder(marketAddress, isYes, price, amount) → tx hash
// fillOrder(marketAddress, isYes, limitPrice, amount, minFill) → tx hash
// cancelOrder(marketAddress, orderId) → tx hash

// 使用 wagmi useWriteContract + useWaitForTransactionReceipt
```

### 5.5 usePositions — 用户持仓

```typescript
// 调用 ConditionalTokens.balanceOf(user, positionId)
// positionId = hash(conditionId, outcomeIndex) — 需前端计算
// 返回：{ yesBalance, noBalance, totalCollateral }
```

### 5.6 useCreateMarket — 创建市场

```typescript
// 调用 PredictionMarketFactory.createMarket(
//   _question, _endTime, _initialLiquidity, _fee
// ) → tx hash → 返回 marketId

// 监听 MarketCreated 事件获取新市场地址
```

---

## 六、样式与组件实现细节

### 6.1 Tailwind 暗色配置（tailwind.config.ts）

```typescript
// tailwind.config.ts
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#0d1117',
          surface: '#161b22',
          elevated:'#21262d',
          overlay: '#30363d',
        },
        border: {
          DEFAULT: '#30363d',
          subtle: '#21262d',
        },
        primary: {
          DEFAULT: '#4F46E5',
          hover:   '#4338CA',
        },
        yes: '#22c55e',
        no:  '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', ...],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
```

### 6.2 shadcn/ui 暗色适配

所有 shadcn 组件在 `components/ui/` 下，导入后在全局 CSS 中覆盖 CSS 变量：

```css
/* globals.css */
@layer base {
  :root {
    --background:  var(--bg-base);
    --foreground:  var(--text-primary);
    --card:        var(--bg-surface);
    --border:      var(--border);
    --primary:     var(--primary);
  }
}
```

### 6.3 响应式断点

| Breakpoint | Width | 布局 |
|------------|-------|------|
| sm | 640px | 单列市场卡片 |
| md | 768px | 侧边筛选器展开 |
| lg | 1024px | 两栏市场详情 |
| xl | 1280px | 宽松两栏 |

### 6.4 价格显示规范

- 内部精度：`1e18`（Solidity）
- 显示精度：`$0.01`（分）
- 格式化函数：`formatPrice(price: bigint): string`
  - `price = 67_000_000_000_000_000` → `"$0.67"`
  - `price = 1_000_000_000_000_000_000` → `"$1.00"`
- 输入精度：用户输入分，转换为 1e18 存储

---

## 七、待实现功能（不含 DEX）

~~AMM 流动性池~~（已移除）

| 模块 | 功能 | 状态 |
|------|------|------|
| 市场列表 | 浏览/搜索/筛选市场 | 待实现 |
| 市场详情 | 订单簿 + 交易面板 | 待实现 |
| 价格图表 | 历史价格走势图 | 待实现 |
| 组合页面 | 持仓/历史/订单 | 待实现 |
| 创建市场 | 创建新预测市场 | 待实现 |
| 结算赎回 | 用户赎回已结算头寸 | 待实现 |

---

## 八、技术注意事项

1. **EIP-1167 克隆**：Market 由工厂通过克隆创建，ABI 用 `Market.json`（模板），地址从 `factory.markets(marketId)` 获取
2. **conditionId 计算**：前端需预计算 `hash(questionId, 2)` — 实际由后端/工厂返回
3. **positionId 计算**：前端 `hash(conditionId, outcomeIndex)` — outcomeIndex: YES=0, NO=1
4. **gas 估算**：使用 viem `estimateGas` 显示给用户，避免因 gas 不足失败
5. **USDC 授权**：交易前检查/请求 Market 对 USDC 的 allowance（`safeApprove`）
6. **链上事件聚合**：订单簿历史成交从 `OrderBook.Trade` 事件中聚合前端（无需后端）
7. **钱包连接**：RainbowKit 支持多链，配置 Base Sepolia chain 即可
8. **数据轮询**：订单簿/余额轮询间隔 3s，市场列表轮询间隔 10s（避免过度请求）