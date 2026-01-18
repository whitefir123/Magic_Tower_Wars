# 铁匠铺素材集成 - 快速参考

## 📦 素材清单

| 素材名称 | 布局 | 用途 | 状态 |
|---------|------|------|------|
| 品质边框 | 2行3列 | 装备品质视觉边框 | ✅ 已集成 |
| 铁匠NPC | 2行3列(6帧) | NPC头像和动画 | ✅ 已集成 |
| 成功特效 | 2行4列(8帧) | 强化成功动画 | ✅ 已集成 |
| 失败特效 | 2行4列(8帧) | 强化失败动画 | ✅ 已集成 |
| 铺面背景 | 完整图片 | UI背景 | ✅ 已集成 |
| 材料图标 | 2行3列 | 材料显示 | ✅ 已集成 |

## 🎨 精灵图布局速查

### 品质边框 (2x3)
```
[白-普通] [绿-优秀] [蓝-稀有]
[紫-史诗] [橙-传说] [金-神话]
```

### 铁匠NPC (2x3, 6帧)
```
[待机1] [待机2] [锻造1]
[锻造2] [锻造3] [完成]
```

### 强化特效 (2x4, 8帧)
```
[帧0] [帧1] [帧2] [帧3]
[帧4] [帧5] [帧6] [帧7]
```

### 材料图标 (2x3)
```
[保护卷轴] [祝福石] [套装精华]
[觉醒石] [附魔卷轴] [幸运石]
```

## 🔧 核心API

### 从精灵图提取图标
```javascript
import { extractSpriteIcon } from './data/forgeModels.js';

const icon = extractSpriteIcon(
  spriteImage,  // 精灵图
  row,          // 行索引
  col,          // 列索引
  totalRows,    // 总行数
  totalCols,    // 总列数
  targetSize    // 目标尺寸（可选）
);
```

### 渲染材料图标
```javascript
import { renderMaterialIcon, FORGE_MATERIAL_ICONS } from './data/forgeModels.js';

const icon = renderMaterialIcon(
  'PROTECTION_SCROLL',  // 材料类型
  materialImage,        // 材料精灵图
  48                    // 尺寸
);
```

### 播放强化特效
```javascript
// 成功特效
game.enhancementEffects.playSuccessEffect(x, y);

// 失败特效
game.enhancementEffects.playFailureEffect(x, y);
```

## 📝 常用代码片段

### 1. 渲染铁匠头像
```javascript
const blacksmithImg = loader.getImage('FORGE_BLACKSMITH_NPC');
const cellW = Math.floor(blacksmithImg.width / 3);
const cellH = Math.floor(blacksmithImg.height / 2);

ctx.imageSmoothingEnabled = false;
ctx.drawImage(blacksmithImg, 0, 0, cellW, cellH, x, y, 64, 64);
```

### 2. 应用品质边框
```javascript
import { QUALITY_BORDER_MAPPING } from './data/forgeModels.js';

const borderData = QUALITY_BORDER_MAPPING[quality];
const borderCanvas = extractSpriteIcon(
  borderImage, 
  borderData.row, 
  borderData.col, 
  2, 3, 128
);
```

### 3. 渲染特效帧
```javascript
const frameIndex = Math.floor(progress * 8);
const row = Math.floor(frameIndex / 4);
const col = frameIndex % 4;

const sx = col * frameWidth;
const sy = row * frameHeight;

ctx.drawImage(effectImg, sx, sy, frameWidth, frameHeight, x, y, w, h);
```

## ⚙️ 配置常量

### 材料类型
```javascript
PROTECTION_SCROLL   // 保护卷轴 (0,0)
BLESSING_STONE      // 祝福石 (0,1)
SET_ESSENCE         // 套装精华 (0,2)
AWAKENING_STONE     // 觉醒石 (1,0)
ENCHANTMENT_SCROLL  // 附魔卷轴 (1,1)
LUCKY_STONE         // 幸运石 (1,2)
```

### 品质类型
```javascript
COMMON      // 普通 (0,0) 白色
UNCOMMON    // 优秀 (0,1) 绿色
RARE        // 稀有 (0,2) 蓝色
EPIC        // 史诗 (1,0) 紫色
LEGENDARY   // 传说 (1,1) 橙色
MYTHIC      // 神话 (1,2) 金色
```

### 动画类型
```javascript
IDLE        // 待机动画 [0, 1]
HAMMERING   // 锻造动画 [2, 3, 4]
COMPLETE    // 完成动画 [5]
```

## 🎯 集成检查清单

### 已完成 ✅
- [x] 素材注册到 assets.js
- [x] 数据模型添加到 forgeModels.js
- [x] ForgeUI 应用背景图片
- [x] ForgeUI 显示铁匠头像
- [x] 创建 EnhancementEffects 系统
- [x] ForgeUI 调用特效

### 待完成 ⏳
- [ ] main.js 初始化特效系统
- [ ] main.js 游戏循环更新特效
- [ ] 测试所有功能

## 🚀 快速启动

### 1. 查看素材
```bash
# 在浏览器打开
test_blacksmith_assets.html
```

### 2. 在 main.js 添加
```javascript
import EnhancementEffects from './systems/EnhancementEffects.js';

// 初始化
game.enhancementEffects = new EnhancementEffects(game);

// 游戏循环中
if (game.enhancementEffects) {
  game.enhancementEffects.update(ctx);
}
```

### 3. 测试
- 打开铁匠铺
- 执行强化操作
- 观察特效播放

## 📚 文档索引

- **完整集成指南**: `BLACKSMITH_INTEGRATION_COMPLETE.md`
- **使用示例**: `BLACKSMITH_ASSETS_USAGE_EXAMPLE.js`
- **工作总结**: `BLACKSMITH_ASSETS_SUMMARY.md`
- **素材预览**: `test_blacksmith_assets.html`

## 💡 提示

1. **像素艺术渲染**: 始终设置 `ctx.imageSmoothingEnabled = false`
2. **降级方案**: 所有渲染函数都包含资源加载失败的处理
3. **性能优化**: 特效使用数组过滤，自动清理完成的动画
4. **调试**: 查看浏览器控制台的 `[EnhancementEffects]` 日志

## 🔗 相关文件

```
src/
├── data/
│   ├── assets.js           ← 素材注册
│   └── forgeModels.js      ← 映射和工具
├── systems/
│   └── EnhancementEffects.js  ← 特效系统
└── ui/
    └── ForgeUI.js          ← UI集成

test_blacksmith_assets.html  ← 素材预览
```

---

**快速参考版本**: v1.0  
**最后更新**: 2026-01-18
