# UI 系统快速入门

## 5 分钟快速上手

本文档提供快速示例，帮助你快速使用新的 UI 架构。

---

## 基础使用

### 1. 初始化 UI 系统

```javascript
import { UIManager } from './src/ui/UIManager.js';

// 创建 UI 管理器（自动初始化所有组件）
const ui = new UIManager();

// 设置资源加载器（用于图鉴显示怪物图像）
ui.setBestiaryLoader(game.loader);
```

### 2. 打开/关闭界面

```javascript
// 背包
ui.toggleInventory();  // 切换
ui.openInventory();    // 打开
ui.closeInventory();   // 关闭

// 图鉴
ui.toggleBestiary();
ui.openBestiary();
ui.closeBestiary();

// 商店
ui.toggleShop();
ui.openShop();
ui.closeShop();

// 关闭所有弹窗
ui.closeAllOverlays();
```

### 3. 更新界面数据

```javascript
// 更新玩家属性显示（HP、攻击、防御等）
ui.updateStats(player);

// 更新背包显示
ui.updateInventory(player);

// 更新商店显示
ui.updateShop();

// 记录日志消息
ui.logMessage('你获得了一把剑！', 'gain');
ui.logMessage('受到了伤害！', 'warning');
ui.logMessage('任务完成！', 'info');
```

---

## 样式自定义

### 调整背包样式

```javascript
// 放大背包格子
ui.updateInventoryStyle({
  slotSize: 60,          // 格子从 48 增大到 60
  slotGap: 8,            // 间距从 4 增大到 8
  panelScale: 1.2        // 整个面板放大 20%
});

// 缩小装备栏图标
ui.updateInventoryStyle({
  equipmentIconSize: 24  // 图标从 28 缩小到 24
});

// 调整提示框位置
ui.updateInventoryStyle({
  tooltipOffsetX: 20,    // 提示框向右偏移 20px
  tooltipOffsetY: 20     // 提示框向下偏移 20px
});
```

### 调整图鉴样式

```javascript
// 增大列表项高度和字体
ui.updateBestiaryStyle({
  listItemHeight: 50,    // 列表项高度从 40 增大到 50
  fontSize: 16,          // 字体从 14 增大到 16
  titleFontSize: 20      // 标题字体从 18 增大到 20
});

// 更改选中颜色
ui.updateBestiaryStyle({
  selectedColor: '#ff0000',  // 选中项改为红色
  hoverColor: '#ff6666'      // 悬停改为浅红色
});

// 缩放整个面板
ui.updateBestiaryStyle({
  panelScale: 1.1        // 面板放大 10%
});
```

### 调整商店样式

```javascript
// 调整字体和颜色
ui.updateShopStyle({
  fontSize: 18,              // 字体从 16 增大到 18
  priceColor: '#00ff00',     // 价格改为绿色
  titleFontSize: 22          // 标题字体从 20 增大到 22
});

// 调整按钮
ui.updateShopStyle({
  buttonHeight: 60,      // 按钮高度从 50 增大到 60
  buttonGap: 15          // 按钮间距从 10 增大到 15
});
```

---

## 实际应用场景

### 场景 1：玩家拾取物品

```javascript
// 玩家拾取物品时
function pickupItem(itemId) {
  // 1. 添加到背包
  player.addToInventory(itemId);
  
  // 2. 更新背包显示
  ui.updateInventory(player);
  
  // 3. 显示日志
  const itemName = EQUIPMENT_DB[itemId].name;
  ui.logMessage(`获得了 ${itemName}！`, 'gain');
}
```

### 场景 2：玩家战斗

```javascript
// 玩家受到伤害时
function takeDamage(damage) {
  // 1. 扣除生命值
  player.stats.hp -= damage;
  
  // 2. 更新属性显示
  ui.updateStats(player);
  
  // 3. 显示日志
  ui.logMessage(`受到 ${damage} 点伤害！`, 'warning');
}
```

### 场景 3：玩家购买物品

```javascript
// 玩家在商店购买物品
function buyShopItem(itemType) {
  // ShopUI 会自动处理购买逻辑
  // 包括：检查金币、扣除金币、增加属性、更新价格
  
  // 只需调用 buy 方法
  ui.shopUI.buy(itemType);
  
  // UI 会自动更新所有相关显示
}
```

### 场景 4：打开图鉴查看怪物

```javascript
// 打开图鉴并选中特定怪物
function viewMonster(monsterKey) {
  // 1. 打开图鉴
  ui.openBestiary();
  
  // 2. 选中怪物
  ui.bestiaryUI.selectMonster(monsterKey);
}
```

### 场景 5：响应键盘输入

```javascript
// 在游戏的键盘事件处理中
document.addEventListener('keydown', (e) => {
  // ESC 键由 OverlayManager 自动处理，无需手动编码
  
  // I 键打开背包
  if (e.key === 'i' || e.key === 'I') {
    if (!ui.hasActiveOverlay()) {
      ui.toggleInventory();
    }
  }
  
  // B 键打开图鉴
  if (e.key === 'b' || e.key === 'B') {
    if (!ui.hasActiveOverlay()) {
      ui.toggleBestiary();
    }
  }
});
```

---

## 高级技巧

### 技巧 1：运行时切换 UI 主题

```javascript
// 定义多个主题
const themes = {
  default: {
    inventory: { slotSize: 48, slotGap: 4 },
    bestiary: { fontSize: 14, selectedColor: '#ffd700' },
    shop: { fontSize: 16, priceColor: '#ffd700' }
  },
  large: {
    inventory: { slotSize: 60, slotGap: 8 },
    bestiary: { fontSize: 18, selectedColor: '#ffd700' },
    shop: { fontSize: 20, priceColor: '#ffd700' }
  },
  compact: {
    inventory: { slotSize: 40, slotGap: 2 },
    bestiary: { fontSize: 12, selectedColor: '#ffd700' },
    shop: { fontSize: 14, priceColor: '#ffd700' }
  }
};

// 切换主题
function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;
  
  ui.updateInventoryStyle(theme.inventory);
  ui.updateBestiaryStyle(theme.bestiary);
  ui.updateShopStyle(theme.shop);
  
  console.log(`已切换到 ${themeName} 主题`);
}

// 使用
applyTheme('large');     // 大字体主题
applyTheme('compact');   // 紧凑主题
applyTheme('default');   // 默认主题
```

### 技巧 2：保存和恢复 UI 配置

```javascript
// 保存 UI 配置到 localStorage
function saveUIConfig() {
  const config = {
    inventory: ui.inventoryUI.style,
    bestiary: ui.bestiaryUI.style,
    shop: ui.shopUI.style
  };
  
  localStorage.setItem('uiConfig', JSON.stringify(config));
  console.log('UI 配置已保存');
}

// 恢复 UI 配置
function loadUIConfig() {
  const saved = localStorage.getItem('uiConfig');
  if (!saved) return;
  
  try {
    const config = JSON.parse(saved);
    
    ui.updateInventoryStyle(config.inventory);
    ui.updateBestiaryStyle(config.bestiary);
    ui.updateShopStyle(config.shop);
    
    console.log('UI 配置已恢复');
  } catch (e) {
    console.error('恢复 UI 配置失败', e);
  }
}

// 在游戏初始化时加载配置
window.addEventListener('load', () => {
  loadUIConfig();
});

// 在配置更改时保存
ui.updateInventoryStyle({ slotSize: 60 });
saveUIConfig();
```

### 技巧 3：创建自定义弹窗管理

```javascript
// 创建一个设置界面并集成到 OverlayManager
class SettingsUI {
  constructor(config = {}) {
    this.style = { fontSize: 16, ...config };
    this.isOpen = false;
    this.init();
  }
  
  init() {
    this.overlay = document.getElementById('settings-overlay');
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // 关闭按钮
    const closeBtn = this.overlay?.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.close());
  }
  
  open() {
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.isOpen = true;
      console.log('SettingsUI 已打开');
    }
  }
  
  close() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      this.isOpen = false;
      console.log('SettingsUI 已关闭');
    }
  }
  
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  
  destroy() {
    this.close();
  }
}

// 在 UIManager 中集成
// 在 UIManager 构造函数中添加：
this.settingsUI = new SettingsUI({ fontSize: 16 });
this.overlayManager.register('settings', this.settingsUI);

// 添加公共接口
toggleSettings() {
  this.overlayManager.toggle('settings');
}
```

### 技巧 4：禁用特定弹窗的自动关闭

```javascript
// 如果你希望某些弹窗可以同时打开（不互相关闭）
ui.overlayManager.open('inventory', { allowStack: true });
ui.overlayManager.open('bestiary', { allowStack: true });

// 现在背包和图鉴可以同时打开
// 按 ESC 会依次关闭（从最后打开的开始）
```

---

## 调试技巧

### 查看当前打开的弹窗

```javascript
// 检查是否有弹窗打开
console.log('有弹窗打开？', ui.hasActiveOverlay());

// 获取当前顶层弹窗
console.log('顶层弹窗：', ui.getTopOverlay());

// 查看所有已注册的弹窗
console.log('已注册弹窗：', Array.from(ui.overlayManager.overlays.keys()));
```

### 查看组件样式配置

```javascript
// 查看背包样式
console.log('背包样式：', ui.inventoryUI.style);

// 查看图鉴样式
console.log('图鉴样式：', ui.bestiaryUI.style);

// 查看商店样式
console.log('商店样式：', ui.shopUI.style);
```

### 强制重新渲染

```javascript
// 如果界面显示不正确，可以强制重新渲染
ui.inventoryUI.render(player);
ui.bestiaryUI.render();
ui.shopUI.render();
```

---

## 常见问题

**Q: 修改背包样式后，为什么图鉴样式也变了？**

A: 不应该出现这种情况。每个组件的样式是完全独立的。如果出现这种情况，可能是直接修改了全局 CSS 而不是使用 `updateStyle()` 方法。

**Q: 如何让背包格子更大？**

A: 使用 `ui.updateInventoryStyle({ slotSize: 60 })`

**Q: 如何禁用所有动画？**

A: 在初始化时设置 `enableAnimations: false`，或运行时调用 `ui.updateInventoryStyle({ enableAnimations: false })`

**Q: ESC 键不起作用？**

A: 确保 OverlayManager 已正确初始化。ESC 键由 OverlayManager 自动处理。

**Q: 如何添加新的弹窗类型（如任务面板、地图等）？**

A: 参考 `InventoryUI` 的实现，创建新的组件类，然后在 `UIManager` 中初始化并注册到 `OverlayManager`。

---

## 下一步

- 阅读 [UI_ARCHITECTURE.md](./UI_ARCHITECTURE.md) 了解详细的架构设计
- 查看各个组件的源代码：
  - `src/ui/UIManager.js`
  - `src/ui/InventoryUI.js`
  - `src/ui/BestiaryUI.js`
  - `src/ui/ShopUI.js`
  - `src/ui/OverlayManager.js`

祝你使用愉快！🎮

