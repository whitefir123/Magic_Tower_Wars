# 商店图标显示问题修复说明

## 问题描述
商店页面的全部商品素材无法显示（钻头除外，因为暂无素材）。

## 问题原因分析
1. 图片资源URL配置正确，但在商店打开时可能还未完全加载
2. `createItemIcon`方法中对图片加载状态的检测不够完善
3. 缺少对图片`naturalWidth`和`complete`状态的综合判断

## 修复方案

### 1. 增强图片加载状态检测 (`src/ui/ShopUI.js`)

#### 修改 `createItemIcon` 方法
- 添加更详细的日志输出，帮助调试
- 改进图片加载完成的检测逻辑
- 增强图片加载监听器，确保加载完成后重新渲染

#### 修改 `renderServiceItems` 方法
- 添加 `isImageReady` 辅助函数，综合检查图片的 `complete` 和 `naturalWidth` 状态
- 改进重试逻辑，增加详细的状态日志
- 确保在图片未加载时显示占位符，而不是空白

#### 修改 `renderGoods` 方法
- 使用相同的 `isImageReady` 检测逻辑
- 在图片未准备好时显示占位符
- 添加警告日志，便于追踪问题

### 2. 更新调试页面 (`debug_ui.html`)
- 添加真实图片资源的预加载逻辑
- 修改 `game.loader.getImage` 返回真实加载的图片，而不是占位符
- 确保调试环境与实际游戏环境一致

### 3. 创建测试页面 (`test_shop_icons.html`)
- 独立测试页面，用于验证图片资源是否能正常加载
- 显示所有三种图标精灵图的内容
- 帮助快速定位图片加载问题

## 测试步骤

### 1. 测试图片资源加载
```bash
# 在浏览器中打开测试页面
open test_shop_icons.html
```
检查：
- 三种图标精灵图是否都能正常加载
- 图标切割是否正确
- 是否有CORS错误

### 2. 测试调试UI
```bash
# 在浏览器中打开调试页面
open debug_ui.html
```
操作：
1. 点击"Open Shop (商店)"按钮
2. 检查浏览器控制台的日志输出
3. 确认商品图标是否正常显示

### 3. 测试实际游戏
```bash
# 启动游戏服务器
node server.js
```
操作：
1. 进入游戏
2. 找到商店NPC并打开商店
3. 检查所有商品图标是否正常显示

## 预期结果
- 所有商品图标（装备、消耗品、宝石）都能正常显示
- 图标位置保持不变
- 如果图片未加载，显示文字占位符（商品名称首字）
- 控制台有清晰的日志输出，便于调试

## 关键代码变更

### `createItemIcon` 方法改进
```javascript
// 检查图片是否加载完成
if (img.complete === false || img.naturalWidth === 0) {
  console.warn('ShopUI: Image not loaded yet for item:', item, 
    'img.complete:', img.complete, 'naturalWidth:', img.naturalWidth);
  // 添加加载监听器
  if (!img.hasLoadListener) {
    img.hasLoadListener = true;
    img.onload = () => {
      console.log('ShopUI: Image loaded, re-rendering shop');
      if (this.isOpen) this.render();
    };
  }
  return null;
}
```

### `renderServiceItems` 方法改进
```javascript
// 检查图片是否真正加载完成
const isImageReady = (img) => {
  return img && img.complete && (img.naturalWidth > 0 || img.width > 0);
};

const equipReady = isImageReady(imgEquip);
const consReady = isImageReady(imgCons);
const gemsReady = isImageReady(imgGems);

// 如果图片未加载完成，尝试重试
if ((!equipReady || !consReady || !gemsReady) && this._retryCount < 20) {
  console.warn('ShopUI: Icons not fully loaded yet, retrying...', {
    equipReady, consReady, gemsReady
  });
  this._retryCount = (this._retryCount || 0) + 1;
  setTimeout(() => {
    if (this.isOpen) this.render();
  }, 200);
}
```

## 注意事项
1. 确保图片资源URL可访问（检查CORS设置）
2. 如果使用CDN，确保CDN服务正常
3. 检查浏览器控制台是否有网络错误
4. 图片加载可能需要时间，重试机制会自动处理

## 相关文件
- `src/ui/ShopUI.js` - 商店UI主文件
- `src/data/assets.js` - 资源配置文件
- `src/utils/ResourceManager.js` - 资源管理器
- `debug_ui.html` - 调试页面
- `test_shop_icons.html` - 图标测试页面
