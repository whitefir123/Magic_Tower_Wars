# 铁匠铺素材集成文档

## 素材清单

已生成的铁匠铺素材及其URL：

### 1. 品质边框图标
- **URL**: https://i.postimg.cc/J79PSBd1/pinzhikuang1.png
- **用途**: 装备品质视觉边框效果（6种品质：普通、优秀、稀有、史诗、传说、神话）
- **预期尺寸**: 128x128 或更大（需要包含6种品质的边框）
- **集成位置**: ForgeUI装备卡片、装备详情面板

### 2. 铁匠NPC角色
- **URL**: https://i.postimg.cc/rpT0xfH5/tiejiang1.png
- **用途**: 铁匠NPC角色立绘，用于对话和UI展示
- **预期尺寸**: 64x64 或更大
- **集成位置**: ForgeUI头部、对话系统、铁匠铺入口

### 3. 强化成功特效
- **URL**: https://i.postimg.cc/fTmDhDHs/tiezhentexiao1.png
- **用途**: 装备强化成功时的视觉特效动画
- **预期尺寸**: 64x64 或更大（可能是精灵图动画）
- **集成位置**: VisualEffectsSystem、ForgeUI强化操作反馈

### 4. 强化失败特效
- **URL**: https://i.postimg.cc/DyMsRQMn/tiejiangtexiao2.png
- **用途**: 装备强化失败时的视觉特效动画
- **预期尺寸**: 64x64 或更大（可能是精灵图动画）
- **集成位置**: VisualEffectsSystem、ForgeUI强化操作反馈

### 5. 铁匠铺背景
- **URL**: https://i.postimg.cc/NMZFpb0P/tiejiangpubackground1.png
- **用途**: 铁匠铺UI界面的背景图片
- **预期尺寸**: 800x600 或更大
- **集成位置**: ForgeUI模态框背景

### 6. 强化材料图标
- **URL**: https://i.postimg.cc/02M3Tnyf/qianghuacailiao1.png
- **用途**: 强化材料图标集（保护卷轴、祝福石、套装精华、觉醒石、附魔卷轴等）
- **预期尺寸**: 32x32 每个图标（可能是精灵图）
- **集成位置**: MaterialSystem、ForgeUI材料展示

## 集成步骤

### 步骤 1: 更新 assets.js

在 `src/data/assets.js` 中添加铁匠铺相关资源：

```javascript
// 铁匠铺系统资源
FORGE_QUALITY_BORDERS: { url: "https://i.postimg.cc/J79PSBd1/pinzhikuang1.png" },
FORGE_BLACKSMITH_NPC: { url: "https://i.postimg.cc/rpT0xfH5/tiejiang1.png" },
FORGE_SUCCESS_EFFECT: { url: "https://i.postimg.cc/fTmDhDHs/tiezhentexiao1.png" },
FORGE_FAILURE_EFFECT: { url: "https://i.postimg.cc/DyMsRQMn/tiejiangtexiao2.png" },
FORGE_BACKGROUND: { url: "https://i.postimg.cc/NMZFpb0P/tiejiangpubackground1.png" },
FORGE_MATERIALS: { url: "https://i.postimg.cc/02M3Tnyf/qianghuacailiao1.png" },
```

### 步骤 2: 更新 ForgeUI.js

#### 2.1 添加背景图片

在 `injectStyles()` 方法中更新 `.forge-modal` 样式：

```javascript
.forge-modal {
  position: relative;
  background: url('https://i.postimg.cc/NMZFpb0P/tiejiangpubackground1.png') center/cover,
              linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 3px solid #d4af37;
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}
```

#### 2.2 添加铁匠NPC头像

在 `createUI()` 方法的 header 部分添加：

```javascript
<div class="forge-header">
  <div style="display: flex; align-items: center; gap: 15px;">
    <img src="https://i.postimg.cc/rpT0xfH5/tiejiang1.png" 
         alt="铁匠" 
         style="width: 64px; height: 64px; image-rendering: pixelated;">
    <h2 class="forge-title">铁匠铺</h2>
  </div>
  <button class="forge-close-btn">✕</button>
</div>
```

#### 2.3 添加品质边框效果

在 `createItemCard()` 方法中添加品质边框：

```javascript
createItemCard(itemInstance, slot, source) {
  const itemCard = document.createElement('div');
  itemCard.className = 'forge-item-card';
  
  // 添加品质边框
  const quality = itemInstance.quality || 'COMMON';
  itemCard.style.borderImage = `url('https://i.postimg.cc/J79PSBd1/pinzhikuang1.png') 30 round`;
  itemCard.style.borderWidth = '3px';
  
  // ... 其余代码
}
```

### 步骤 3: 集成特效系统

#### 3.1 创建特效渲染器

在 `src/systems/VisualEffectsSystem.js` 中添加：

```javascript
/**
 * 播放强化成功特效
 */
playEnhanceSuccessEffect(x, y) {
  const effect = {
    type: 'enhance_success',
    x: x,
    y: y,
    frame: 0,
    maxFrames: 8,
    image: this.loader.getImage('FORGE_SUCCESS_EFFECT')
  };
  this.activeEffects.push(effect);
}

/**
 * 播放强化失败特效
 */
playEnhanceFailureEffect(x, y) {
  const effect = {
    type: 'enhance_failure',
    x: x,
    y: y,
    frame: 0,
    maxFrames: 6,
    image: this.loader.getImage('FORGE_FAILURE_EFFECT')
  };
  this.activeEffects.push(effect);
}
```

#### 3.2 在 ForgeUI 中调用特效

在 `handleEnhance()` 方法中：

```javascript
handleEnhance() {
  // ... 现有代码
  
  const result = this.blacksmithSystem.enhanceItem(this.selectedItem, this.player, options);
  
  // 播放特效
  const game = window.game;
  if (game && game.visualEffects) {
    const canvas = game.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    if (result.success) {
      game.visualEffects.playEnhanceSuccessEffect(centerX, centerY);
    } else {
      game.visualEffects.playEnhanceFailureEffect(centerX, centerY);
    }
  }
  
  // ... 其余代码
}
```

### 步骤 4: 材料图标集成

#### 4.1 定义材料图标映射

在 `src/data/forgeModels.js` 中添加：

```javascript
export const FORGE_MATERIAL_ICONS = {
  PROTECTION_SCROLL: { iconIndex: 0 },  // 保护卷轴
  BLESSING_STONE: { iconIndex: 1 },     // 祝福石
  SET_ESSENCE: { iconIndex: 2 },        // 套装精华
  AWAKENING_STONE: { iconIndex: 3 },    // 觉醒石
  ENCHANTMENT_SCROLL: { iconIndex: 4 }, // 附魔卷轴
  ENHANCEMENT_STONE: { iconIndex: 5 }   // 强化石
};
```

#### 4.2 渲染材料图标

创建辅助函数：

```javascript
/**
 * 渲染材料图标
 */
renderMaterialIcon(materialType, size = 32) {
  const game = window.game;
  const loader = game?.loader;
  const materialImg = loader?.getImage('FORGE_MATERIALS');
  
  if (!materialImg || !materialImg.complete) {
    return '<div style="width: 32px; height: 32px; background: #333;"></div>';
  }
  
  const iconData = FORGE_MATERIAL_ICONS[materialType];
  if (!iconData) return '';
  
  const cols = 6; // 假设6列
  const cellW = materialImg.width / cols;
  const cellH = materialImg.height;
  const col = iconData.iconIndex % cols;
  
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(materialImg, col * cellW, 0, cellW, cellH, 0, 0, size, size);
  
  return canvas.outerHTML;
}
```

## 测试清单

### 视觉测试
- [ ] 打开测试页面 `test_blacksmith_assets.html` 查看所有素材
- [ ] 确认每个素材的尺寸和内容
- [ ] 检查素材是否有透明背景
- [ ] 验证像素艺术风格是否清晰（无模糊）

### 功能测试
- [ ] 铁匠铺界面背景正确显示
- [ ] 铁匠NPC头像正确显示
- [ ] 品质边框在装备卡片上正确显示
- [ ] 强化成功时播放成功特效
- [ ] 强化失败时播放失败特效
- [ ] 材料图标在UI中正确显示

### 性能测试
- [ ] 素材加载不影响游戏启动速度
- [ ] 特效动画流畅（60 FPS）
- [ ] 内存占用合理

## 注意事项

1. **图片加载顺序**: 铁匠铺素材应该在 `GAMEPLAY_ASSETS` 中，不影响主菜单加载
2. **像素艺术渲染**: 确保所有canvas渲染都设置 `imageSmoothingEnabled = false`
3. **响应式设计**: 背景图片应该适配不同屏幕尺寸
4. **性能优化**: 特效动画使用对象池避免频繁创建销毁
5. **向后兼容**: 如果素材加载失败，应该有降级方案（使用纯色或渐变）

## 下一步

1. 查看 `test_blacksmith_assets.html` 确认素材尺寸
2. 根据实际尺寸调整代码中的参数
3. 实现特效动画系统
4. 添加音效配合视觉效果
5. 进行完整的用户体验测试

## 相关文件

- `src/data/assets.js` - 资源配置
- `src/ui/ForgeUI.js` - 铁匠铺UI
- `src/systems/VisualEffectsSystem.js` - 视觉特效系统
- `src/systems/BlacksmithSystem.js` - 铁匠系统逻辑
- `src/data/forgeModels.js` - 铁匠系统数据模型
- `test_blacksmith_assets.html` - 素材预览测试页面
