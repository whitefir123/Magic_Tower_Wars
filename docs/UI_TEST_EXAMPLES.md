# UI 系统测试示例

本文档提供一些测试示例，帮助你验证 UI 系统是否正常工作。

---

## 在浏览器控制台中测试

打开游戏后，按 F12 打开浏览器控制台，然后复制粘贴以下代码进行测试。

### 测试 1：基础打开/关闭功能

```javascript
// 测试背包
console.log('测试背包...');
game.ui.openInventory();
setTimeout(() => game.ui.closeInventory(), 2000);

// 测试图鉴
setTimeout(() => {
  console.log('测试图鉴...');
  game.ui.openBestiary();
  setTimeout(() => game.ui.closeBestiary(), 2000);
}, 2500);

// 测试商店
setTimeout(() => {
  console.log('测试商店...');
  game.ui.openShop();
  setTimeout(() => game.ui.closeShop(), 2000);
}, 5000);

console.log('✓ 测试完成');
```

### 测试 2：样式配置

```javascript
// 测试背包样式
console.log('测试背包样式...');
game.ui.openInventory();

// 等待 1 秒后放大格子
setTimeout(() => {
  console.log('放大背包格子...');
  game.ui.updateInventoryStyle({ slotSize: 64, slotGap: 8 });
}, 1000);

// 再等 2 秒后恢复
setTimeout(() => {
  console.log('恢复背包格子...');
  game.ui.updateInventoryStyle({ slotSize: 48, slotGap: 4 });
}, 3000);

// 最后关闭
setTimeout(() => {
  game.ui.closeInventory();
  console.log('✓ 测试完成');
}, 5000);
```

### 测试 3：图鉴样式

```javascript
// 测试图鉴样式
console.log('测试图鉴样式...');
game.ui.openBestiary();

// 等待 1 秒后更改颜色
setTimeout(() => {
  console.log('更改选中颜色...');
  game.ui.updateBestiaryStyle({ 
    selectedColor: '#ff0000',
    fontSize: 18 
  });
}, 1000);

// 再等 2 秒后恢复
setTimeout(() => {
  console.log('恢复样式...');
  game.ui.updateBestiaryStyle({ 
    selectedColor: '#ffd700',
    fontSize: 14 
  });
}, 3000);

// 最后关闭
setTimeout(() => {
  game.ui.closeBestiary();
  console.log('✓ 测试完成');
}, 5000);
```

### 测试 4：商店样式

```javascript
// 测试商店样式
console.log('测试商店样式...');
game.ui.openShop();

// 等待 1 秒后更改样式
setTimeout(() => {
  console.log('更改商店样式...');
  game.ui.updateShopStyle({ 
    fontSize: 20,
    priceColor: '#00ff00'
  });
}, 1000);

// 再等 2 秒后恢复
setTimeout(() => {
  console.log('恢复样式...');
  game.ui.updateShopStyle({ 
    fontSize: 16,
    priceColor: '#ffd700'
  });
}, 3000);

// 最后关闭
setTimeout(() => {
  game.ui.closeShop();
  console.log('✓ 测试完成');
}, 5000);
```

### 测试 5：OverlayManager

```javascript
// 测试弹窗管理
console.log('测试 OverlayManager...');

// 打开背包
game.ui.openInventory();
console.log('背包已打开');
console.log('有弹窗打开？', game.ui.hasActiveOverlay()); // 应该是 true
console.log('顶层弹窗：', game.ui.getTopOverlay()); // 应该是 'inventory'

// 打开图鉴（会自动关闭背包）
setTimeout(() => {
  game.ui.openBestiary();
  console.log('图鉴已打开（背包已自动关闭）');
  console.log('顶层弹窗：', game.ui.getTopOverlay()); // 应该是 'bestiary'
}, 2000);

// 关闭所有
setTimeout(() => {
  game.ui.closeAllOverlays();
  console.log('所有弹窗已关闭');
  console.log('有弹窗打开？', game.ui.hasActiveOverlay()); // 应该是 false
  console.log('✓ 测试完成');
}, 4000);
```

### 测试 6：ESC 键功能

```javascript
// 测试 ESC 键
console.log('测试 ESC 键...');
console.log('打开背包，然后按 ESC 键关闭');

game.ui.openInventory();

// 提示用户按 ESC
console.log('👉 请按 ESC 键关闭背包');

// 10 秒后检查是否已关闭
setTimeout(() => {
  if (!game.ui.hasActiveOverlay()) {
    console.log('✓ ESC 键功能正常');
  } else {
    console.log('⚠️ 请手动测试 ESC 键');
  }
}, 10000);
```

### 测试 7：主题切换

```javascript
// 定义主题
const themes = {
  default: {
    inventory: { slotSize: 48, slotGap: 4, equipmentIconSize: 28 },
    bestiary: { fontSize: 14, listItemHeight: 40, selectedColor: '#ffd700' },
    shop: { fontSize: 16, priceColor: '#ffd700' }
  },
  large: {
    inventory: { slotSize: 64, slotGap: 8, equipmentIconSize: 36 },
    bestiary: { fontSize: 18, listItemHeight: 50, selectedColor: '#ffd700' },
    shop: { fontSize: 20, priceColor: '#ffd700' }
  },
  compact: {
    inventory: { slotSize: 40, slotGap: 2, equipmentIconSize: 24 },
    bestiary: { fontSize: 12, listItemHeight: 35, selectedColor: '#ffd700' },
    shop: { fontSize: 14, priceColor: '#ffd700' }
  }
};

// 应用主题函数
function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) {
    console.error('主题不存在：', themeName);
    return;
  }
  
  game.ui.updateInventoryStyle(theme.inventory);
  game.ui.updateBestiaryStyle(theme.bestiary);
  game.ui.updateShopStyle(theme.shop);
  
  console.log('✓ 已切换到主题：', themeName);
}

// 测试主题切换
console.log('测试主题切换...');
game.ui.openInventory();

setTimeout(() => {
  console.log('切换到大字体主题...');
  applyTheme('large');
}, 1000);

setTimeout(() => {
  console.log('切换到紧凑主题...');
  applyTheme('compact');
}, 3000);

setTimeout(() => {
  console.log('恢复默认主题...');
  applyTheme('default');
}, 5000);

setTimeout(() => {
  game.ui.closeInventory();
  console.log('✓ 测试完成');
}, 7000);
```

### 测试 8：样式配置保存和恢复

```javascript
// 保存配置到 localStorage
function saveUIConfig() {
  const config = {
    inventory: game.ui.inventoryUI.style,
    bestiary: game.ui.bestiaryUI.style,
    shop: game.ui.shopUI.style
  };
  
  localStorage.setItem('uiConfig', JSON.stringify(config));
  console.log('✓ UI 配置已保存');
}

// 恢复配置
function loadUIConfig() {
  const saved = localStorage.getItem('uiConfig');
  if (!saved) {
    console.log('⚠️ 没有保存的配置');
    return;
  }
  
  try {
    const config = JSON.parse(saved);
    
    game.ui.updateInventoryStyle(config.inventory);
    game.ui.updateBestiaryStyle(config.bestiary);
    game.ui.updateShopStyle(config.shop);
    
    console.log('✓ UI 配置已恢复');
  } catch (e) {
    console.error('❌ 恢复配置失败', e);
  }
}

// 测试保存和恢复
console.log('测试配置保存和恢复...');

// 修改样式
game.ui.updateInventoryStyle({ slotSize: 60 });
game.ui.updateBestiaryStyle({ fontSize: 18 });
game.ui.updateShopStyle({ fontSize: 20 });

// 保存
saveUIConfig();

// 恢复默认
setTimeout(() => {
  console.log('恢复默认样式...');
  game.ui.updateInventoryStyle({ slotSize: 48 });
  game.ui.updateBestiaryStyle({ fontSize: 14 });
  game.ui.updateShopStyle({ fontSize: 16 });
}, 2000);

// 从 localStorage 恢复
setTimeout(() => {
  console.log('从 localStorage 恢复...');
  loadUIConfig();
  console.log('✓ 测试完成');
}, 4000);
```

### 测试 9：检查组件状态

```javascript
// 检查所有组件的当前配置
console.log('=== UI 组件状态 ===');

console.log('InventoryUI:', {
  isOpen: game.ui.inventoryUI.isOpen,
  style: game.ui.inventoryUI.style
});

console.log('BestiaryUI:', {
  isOpen: game.ui.bestiaryUI.isOpen,
  selectedMonster: game.ui.bestiaryUI.selectedMonster,
  style: game.ui.bestiaryUI.style
});

console.log('ShopUI:', {
  isOpen: game.ui.shopUI.isOpen,
  prices: game.ui.shopUI.shopPrices,
  style: game.ui.shopUI.style
});

console.log('OverlayManager:', {
  hasActiveOverlay: game.ui.overlayManager.hasActiveOverlay(),
  topOverlay: game.ui.overlayManager.getTopOverlay(),
  registeredOverlays: Array.from(game.ui.overlayManager.overlays.keys())
});
```

### 测试 10：压力测试

```javascript
// 快速切换测试
console.log('开始压力测试...');

let count = 0;
const interval = setInterval(() => {
  if (count >= 10) {
    clearInterval(interval);
    console.log('✓ 压力测试完成');
    return;
  }
  
  // 随机打开/关闭一个界面
  const rand = Math.random();
  if (rand < 0.33) {
    game.ui.toggleInventory();
    console.log('切换背包');
  } else if (rand < 0.66) {
    game.ui.toggleBestiary();
    console.log('切换图鉴');
  } else {
    game.ui.toggleShop();
    console.log('切换商店');
  }
  
  count++;
}, 500);
```

---

## 手动测试清单

### 背包界面
- [ ] 按 I 键打开/关闭背包
- [ ] 拖拽物品到其他格子
- [ ] 拖拽装备到装备栏
- [ ] 拖拽装备栏物品到背包
- [ ] 鼠标悬停显示物品提示框
- [ ] 右键物品显示菜单（使用/丢弃）
- [ ] 点击 overlay 外部关闭
- [ ] 按 ESC 键关闭
- [ ] 窗口大小改变时正常显示

### 图鉴界面
- [ ] 按 B 键打开/关闭图鉴
- [ ] 点击怪物列表项选中
- [ ] 选中后显示详细信息
- [ ] 显示怪物肖像（如果有）
- [ ] 点击 overlay 外部关闭
- [ ] 按 ESC 键关闭
- [ ] 窗口大小改变时正常显示

### 商店界面
- [ ] 与 NPC 对话打开商店
- [ ] 显示正确的价格
- [ ] 金币不足时按钮禁用
- [ ] 金币足够时按钮可用
- [ ] 购买后金币减少
- [ ] 购买后属性增加
- [ ] 购买后价格上涨
- [ ] 点击关闭按钮关闭
- [ ] 按 ESC 键关闭
- [ ] 窗口大小改变时正常显示

### OverlayManager
- [ ] 打开一个界面时，其他界面自动关闭
- [ ] 按 ESC 关闭当前打开的界面
- [ ] 连续按 ESC 依次关闭所有界面

### 样式配置
- [ ] 修改背包样式不影响图鉴
- [ ] 修改图鉴样式不影响商店
- [ ] 修改商店样式不影响背包
- [ ] 样式配置可以保存到 localStorage
- [ ] 样式配置可以从 localStorage 恢复
- [ ] 主题切换功能正常

---

## 常见问题排查

### 问题 1：界面无法打开
- 检查控制台是否有错误
- 检查 HTML 元素是否存在（`#inventory-overlay`, `#bestiary-overlay`, `#shop-overlay`）
- 检查 CSS 是否正确加载

### 问题 2：ESC 键不起作用
- 检查 OverlayManager 是否正确初始化
- 检查是否有其他代码监听了 ESC 键并阻止了默认行为
- 查看控制台是否有错误

### 问题 3：样式配置不生效
- 检查是否调用了正确的方法（`updateInventoryStyle` 等）
- 检查传入的配置对象是否正确
- 打开界面后再查看效果（样式只在界面打开时生效）

### 问题 4：拖拽功能不正常
- 检查是否是消耗品（消耗品不可拖拽）
- 检查浏览器是否支持拖拽 API
- 查看控制台是否有错误

### 问题 5：购买功能不正常
- 检查玩家是否有足够金币
- 检查 buy 方法是否正确绑定
- 查看控制台是否有错误

---

## 性能测试

### 测试 1：渲染性能

```javascript
// 测试背包渲染性能
console.time('背包渲染');
game.ui.inventoryUI.render(game.player);
console.timeEnd('背包渲染');

// 测试图鉴渲染性能
console.time('图鉴渲染');
game.ui.bestiaryUI.render();
console.timeEnd('图鉴渲染');

// 测试商店渲染性能
console.time('商店渲染');
game.ui.shopUI.render();
console.timeEnd('商店渲染');
```

### 测试 2：更新性能

```javascript
// 测试背包更新性能
console.time('背包更新');
for (let i = 0; i < 100; i++) {
  game.ui.inventoryUI.update(game.player);
}
console.timeEnd('背包更新');

// 测试图鉴更新性能
console.time('图鉴更新');
for (let i = 0; i < 100; i++) {
  game.ui.bestiaryUI.update();
}
console.timeEnd('图鉴更新');

// 测试商店更新性能
console.time('商店更新');
for (let i = 0; i < 100; i++) {
  game.ui.shopUI.update();
}
console.timeEnd('商店更新');
```

---

## 总结

通过以上测试，你可以验证 UI 系统的所有功能是否正常工作。如果发现任何问题，请参考以下文档：

- [UI_ARCHITECTURE.md](./UI_ARCHITECTURE.md) - 详细的架构文档
- [UI_QUICK_START.md](./UI_QUICK_START.md) - 快速入门指南
- [UI_REFACTOR_SUMMARY.md](./UI_REFACTOR_SUMMARY.md) - 重构总结

祝测试顺利！🎉

