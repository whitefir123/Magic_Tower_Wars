# UI 架构文档

## 概述

本项目采用**独立控制**和**低耦合**的 UI 架构设计，确保各个 UI 组件之间互不干扰，易于维护和扩展。

## 核心设计原则

### 1. 去中心化控制原则

- **UIManager** 不包含具体的 DOM 操作代码
- **UIManager** 只提供公共接口（如 `ui.toggleInventory()`, `ui.logMessage()`）
- 具体的 DOM 渲染、样式类名切换、事件监听，全部封装在各自的组件类内部

### 2. 样式与逻辑分离

- 每个 UI 组件类都有独立的 `style` 配置对象
- 支持通过构造函数参数传入配置
- 支持运行时通过 `updateStyle()` 方法修改样式
- 样式修改不会影响其他组件

### 3. 统一的 Overlay 管理

- **OverlayManager** 管理所有全屏弹窗（背包、商店、图鉴、设置等）
- 确保同一时间只有一个弹窗打开
- 自动处理 ESC 键关闭顶层弹窗的逻辑

---

## 组件架构

### UIManager（UI 总管理器）

UIManager 是 UI 系统的入口，负责协调各个 UI 组件。

**职责：**
- 提供统一的公共接口
- 初始化各个 UI 组件
- 将组件注册到 OverlayManager
- 不包含具体的 DOM 操作

**使用示例：**

```javascript
// 初始化 UIManager
const ui = new UIManager();

// 打开/关闭背包
ui.toggleInventory();
ui.openInventory();
ui.closeInventory();

// 打开/关闭图鉴
ui.toggleBestiary();

// 打开/关闭商店
ui.toggleShop();

// 记录日志
ui.logMessage('你获得了一把剑！', 'gain');

// 更新玩家属性显示
ui.updateStats(player);

// 更新背包显示
ui.updateInventory(player);

// 检查是否有弹窗打开
if (ui.hasActiveOverlay()) {
  console.log('当前有弹窗打开');
}

// 关闭所有弹窗
ui.closeAllOverlays();
```

---

### InventoryUI（背包界面组件）

独立管理背包和装备栏的所有渲染和交互逻辑。

**特性：**
- 独立的样式配置
- 拖拽功能
- 物品提示框
- 右键菜单
- 自适应窗口大小变化

**初始化配置：**

```javascript
const inventoryUI = new InventoryUI({
  slotSize: 48,              // 背包格子大小
  equipmentIconSize: 28,     // 装备栏图标大小
  slotGap: 4,                // 格子间距
  slotBorderRadius: 4,       // 格子圆角
  panelScale: 1.0,           // 面板缩放比例
  panelOffsetX: 0,           // 面板水平偏移
  panelOffsetY: 0,           // 面板垂直偏移
  tooltipOffsetX: 12,        // 提示框水平偏移
  tooltipOffsetY: 12,        // 提示框垂直偏移
  enableAnimations: true     // 启用动画
});
```

**运行时修改样式：**

```javascript
// 通过 UIManager 修改背包样式
ui.updateInventoryStyle({
  slotSize: 56,
  panelScale: 1.2,
  enableAnimations: false
});
```

**独立方法：**

```javascript
// 打开/关闭
inventoryUI.open();
inventoryUI.close();
inventoryUI.toggle();

// 渲染（初次打开时）
inventoryUI.render(player);

// 更新（数据变化时）
inventoryUI.update(player);

// 更新样式
inventoryUI.updateStyle({ slotSize: 60 });

// 销毁组件
inventoryUI.destroy();
```

---

### BestiaryUI（图鉴界面组件）

独立管理怪物图鉴的所有渲染和交互逻辑。

**特性：**
- 怪物列表渲染
- 详细信息显示
- 怪物肖像渲染
- 选中高亮效果
- 自适应窗口大小变化

**初始化配置：**

```javascript
const bestiaryUI = new BestiaryUI({
  listItemHeight: 40,        // 列表项高度
  listItemGap: 2,            // 列表项间距
  fontSize: 14,              // 字体大小
  titleFontSize: 18,         // 标题字体大小
  selectedColor: '#ffd700',  // 选中项颜色
  hoverColor: '#ffeb3b',     // 悬停颜色
  panelScale: 1.0,           // 面板缩放比例
  enableAnimations: true,    // 启用动画
  transitionDuration: 200    // 过渡动画时长（毫秒）
});
```

**运行时修改样式：**

```javascript
// 通过 UIManager 修改图鉴样式
ui.updateBestiaryStyle({
  listItemHeight: 50,
  fontSize: 16,
  selectedColor: '#ff0000'
});
```

**独立方法：**

```javascript
// 打开/关闭
bestiaryUI.open();
bestiaryUI.close();
bestiaryUI.toggle();

// 渲染
bestiaryUI.render();

// 更新
bestiaryUI.update();

// 选择怪物
bestiaryUI.selectMonster('SLIME');

// 设置资源加载器（用于渲染怪物肖像）
bestiaryUI.setLoader(resourceLoader);

// 更新样式
bestiaryUI.updateStyle({ fontSize: 16 });

// 销毁组件
bestiaryUI.destroy();
```

---

### ShopUI（商店界面组件）

独立管理商店的所有渲染和交互逻辑。

**特性：**
- 价格显示
- 购买逻辑
- 按钮状态管理（根据金币）
- 价格递增机制
- 自适应窗口大小变化

**初始化配置：**

```javascript
const shopUI = new ShopUI({
  buttonHeight: 50,          // 按钮高度
  buttonGap: 10,             // 按钮间距
  fontSize: 16,              // 字体大小
  titleFontSize: 20,         // 标题字体大小
  priceColor: '#ffd700',     // 价格颜色
  disabledColor: '#666',     // 禁用颜色
  panelScale: 1.0,           // 面板缩放比例
  enableAnimations: true,    // 启用动画
  transitionDuration: 200    // 过渡动画时长（毫秒）
});
```

**运行时修改样式：**

```javascript
// 通过 UIManager 修改商店样式
ui.updateShopStyle({
  fontSize: 18,
  priceColor: '#00ff00',
  panelScale: 1.1
});
```

**独立方法：**

```javascript
// 打开/关闭
shopUI.open();
shopUI.close();
shopUI.toggle();

// 渲染
shopUI.render();

// 更新
shopUI.update();

// 购买物品
shopUI.buy('atk');  // 购买攻击力
shopUI.buy('def');  // 购买防御力
shopUI.buy('hp');   // 购买生命值
shopUI.buy('key');  // 购买钥匙

// 重置价格
shopUI.resetPrices();

// 更新样式
shopUI.updateStyle({ fontSize: 18 });

// 销毁组件
shopUI.destroy();
```

---

### OverlayManager（弹窗管理器）

统一管理所有全屏弹窗，确保同一时间只有一个弹窗打开。

**特性：**
- 弹窗注册与管理
- 自动关闭其他弹窗
- ESC 键自动关闭顶层弹窗
- 弹窗栈管理（支持嵌套）

**使用示例：**

```javascript
const overlayManager = new OverlayManager();

// 注册弹窗组件
overlayManager.register('inventory', inventoryUI);
overlayManager.register('bestiary', bestiaryUI);
overlayManager.register('shop', shopUI);

// 打开弹窗（会自动关闭其他弹窗）
overlayManager.open('inventory');

// 关闭弹窗
overlayManager.close('inventory');

// 切换弹窗
overlayManager.toggle('bestiary');

// 关闭所有弹窗
overlayManager.closeAll();

// 检查是否有弹窗打开
if (overlayManager.hasActiveOverlay()) {
  console.log('当前有弹窗打开');
}

// 获取顶层弹窗名称
const topOverlay = overlayManager.getTopOverlay();
console.log('当前顶层弹窗：', topOverlay);

// 销毁管理器
overlayManager.destroy();
```

---

## 最佳实践

### 1. 初始化 UI 系统

```javascript
// 在游戏初始化时创建 UIManager
class Game {
  constructor() {
    // 创建 UI 管理器（自动初始化所有组件）
    this.ui = new UIManager();
    
    // 设置图鉴的资源加载器
    this.ui.setBestiaryLoader(this.loader);
  }
}
```

### 2. 独立调整组件样式

```javascript
// 只调整背包的样式，不影响其他组件
ui.updateInventoryStyle({
  slotSize: 60,
  slotGap: 8,
  panelScale: 1.2
});

// 只调整图鉴的样式
ui.updateBestiaryStyle({
  fontSize: 16,
  listItemHeight: 50
});

// 只调整商店的样式
ui.updateShopStyle({
  fontSize: 18,
  priceColor: '#ff0000'
});
```

### 3. 响应窗口大小变化

所有组件都会自动响应窗口大小变化，无需手动处理：

```javascript
// 组件内部已自动设置 resize 监听器
// 当窗口大小变化时，组件会自动重新渲染
```

### 4. 避免意外影响

由于每个组件都是独立的，修改一个组件的样式或行为不会影响其他组件：

```javascript
// ✅ 正确：独立修改背包样式
ui.updateInventoryStyle({ slotSize: 60 });

// ❌ 错误：不要直接修改全局 CSS
// 这样会影响所有组件
```

### 5. 清理资源

```javascript
// 在游戏结束或重置时，清理 UI 资源
game.ui.destroy();
```

---

## 组件生命周期

每个 UI 组件都遵循以下生命周期：

1. **初始化（Constructor）**
   - 设置样式配置
   - 初始化内部状态
   - 调用 `init()`

2. **初始化（init）**
   - 初始化 DOM 元素引用
   - 设置事件监听器
   - 设置 resize 监听器

3. **打开（open）**
   - 显示 overlay
   - 设置 `isOpen = true`
   - 调用 `render()`

4. **渲染（render）**
   - 完整渲染组件内容
   - 应用样式配置

5. **更新（update）**
   - 数据变化时调用
   - 如果组件已打开，重新渲染

6. **关闭（close）**
   - 隐藏 overlay
   - 设置 `isOpen = false`
   - 清理临时状态

7. **销毁（destroy）**
   - 关闭组件
   - 清理所有引用
   - 释放资源

---

## 常见问题

### Q1: 如何添加新的 UI 组件？

1. 创建新的组件类（参考 InventoryUI 的结构）
2. 实现 `open()`, `close()`, `toggle()` 方法
3. 在 UIManager 中初始化该组件
4. 将组件注册到 OverlayManager

```javascript
// 1. 创建新组件
class SettingsUI {
  constructor(config = {}) {
    this.style = { ...config };
    this.isOpen = false;
    this.init();
  }
  
  init() { /* ... */ }
  open() { /* ... */ }
  close() { /* ... */ }
  toggle() { /* ... */ }
  render() { /* ... */ }
  update() { /* ... */ }
  destroy() { /* ... */ }
}

// 2. 在 UIManager 中初始化
this.settingsUI = new SettingsUI({ fontSize: 16 });

// 3. 注册到 OverlayManager
this.overlayManager.register('settings', this.settingsUI);

// 4. 添加公共接口
openSettings() {
  this.overlayManager.open('settings');
}
```

### Q2: 如何让组件支持拖拽移动？

使用 `PanelDrag` 工具类：

```javascript
import { PanelDrag } from '../utils/PanelDrag.js';

class MyUI {
  init() {
    const panel = document.querySelector('.my-panel');
    const header = panel.querySelector('.panel-header');
    this.panelDrag = new PanelDrag(panel, header);
  }
  
  destroy() {
    this.panelDrag?.destroy();
  }
}
```

### Q3: 如何禁用 OverlayManager 的自动关闭？

在打开弹窗时传入 `allowStack: true`：

```javascript
// 允许多个弹窗同时打开
overlayManager.open('inventory', { allowStack: true });
overlayManager.open('bestiary', { allowStack: true });
```

### Q4: 如何自定义 ESC 键的行为？

OverlayManager 已自动处理 ESC 键，按下 ESC 会关闭顶层弹窗。如果需要自定义行为，可以在组件的 `close()` 方法中添加逻辑。

---

## 总结

本架构的核心优势：

1. **独立性** - 每个组件完全独立，互不干扰
2. **可配置** - 所有样式都可以通过配置对象自定义
3. **可维护** - 清晰的职责划分，易于维护和扩展
4. **可复用** - 组件可以在不同项目中复用
5. **类型安全** - 清晰的接口定义，减少错误

通过这套架构，你可以轻松地：
- 添加新的 UI 组件
- 独立调整各个组件的样式和行为
- 确保 UI 系统的稳定性和可维护性

