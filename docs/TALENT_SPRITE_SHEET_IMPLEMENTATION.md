# 天赋树精灵图系统实现文档

## 概述
天赋树节点视觉系统已从**独立图片URL**重构为**单精灵图（Sprite Sheet）切片**系统，通过CSS `background-position` 实现不同节点状态的显示。

---

## 1. 配置结构（`src/constants.js`）

### 1.1 新增配置：`TALENT_VISUALS`

```javascript
export const TALENT_VISUALS = {
  // 精灵图URL（需要替换为实际路径）
  SPRITE_SHEET_URL: '[PLACEHOLDER_SPRITE_SHEET_URL]',
  
  // 精灵图网格尺寸（每个图块的像素大小）
  GRID_SIZE: 128,
  
  // 精灵图映射表
  MAPPING: {
    SMALL: {
      LOCKED:    { col: 0, row: 0 }, // 锁定状态
      AVAILABLE: { col: 1, row: 0 }, // 可解锁状态
      ALLOCATED: { col: 2, row: 0 }  // 已解锁状态
    },
    MEDIUM: {
      LOCKED:    { col: 0, row: 1 },
      AVAILABLE: { col: 1, row: 1 },
      ALLOCATED: { col: 2, row: 1 }
    },
    KEYSTONE: {
      LOCKED:    { col: 0, row: 2 },
      AVAILABLE: { col: 1, row: 2 },
      ALLOCATED: { col: 2, row: 2 }
    }
  }
};
```

### 1.2 精灵图布局

```
┌─────────────┬─────────────┬─────────────┐
│ SMALL       │ SMALL       │ SMALL       │
│ LOCKED      │ AVAILABLE   │ ALLOCATED   │
│ (0,0)       │ (1,0)       │ (2,0)       │
├─────────────┼─────────────┼─────────────┤
│ MEDIUM      │ MEDIUM      │ MEDIUM      │
│ LOCKED      │ AVAILABLE   │ ALLOCATED   │
│ (0,1)       │ (1,1)       │ (2,1)       │
├─────────────┼─────────────┼─────────────┤
│ KEYSTONE    │ KEYSTONE    │ KEYSTONE    │
│ LOCKED      │ AVAILABLE   │ ALLOCATED   │
│ (0,2)       │ (1,2)       │ (2,2)       │
└─────────────┴─────────────┴─────────────┘
```

### 1.3 更新的配置：`TALENT_ASSETS`

```javascript
export const TALENT_ASSETS = {
  NODES: {
    ROOT: {
      size: 50,
      glowColor: 'rgba(255, 215, 0, 0.8)'
    },
    SMALL: {
      size: 48,
      glowColor: 'rgba(106, 106, 128, 0.5)'
    },
    MEDIUM: {
      size: 64,
      glowColor: 'rgba(138, 138, 160, 0.6)'
    },
    KEYSTONE: {
      size: 80,
      glowColor: 'rgba(255, 170, 0, 0.9)',
      shape: 'hexagon'
    }
  },
  // ... 其他配置保持不变
};
```

---

## 2. 渲染逻辑（`src/TalentTreeUI.js`）

### 2.1 精灵切片计算

在 `createNodeElement()` 方法中实现：

```javascript
// 1. 确定节点类型（SMALL/MEDIUM/KEYSTONE）
let spriteType = 'SMALL';
if (node.type === TALENT_NODE_TYPES.KEYSTONE) spriteType = 'KEYSTONE';
else if (node.type === TALENT_NODE_TYPES.MEDIUM) spriteType = 'MEDIUM';

// 2. 确定节点状态（LOCKED/AVAILABLE/ALLOCATED）
let nodeState = 'LOCKED';
if (isUnlocked) {
  nodeState = 'ALLOCATED';
} else if (isReachable && canAfford) {
  nodeState = 'AVAILABLE';
}

// 3. 获取精灵坐标
const spriteCoord = TALENT_VISUALS.MAPPING[spriteType][nodeState];

// 4. 计算 background-position
const bgPosX = -1 * spriteCoord.col * TALENT_VISUALS.GRID_SIZE;
const bgPosY = -1 * spriteCoord.row * TALENT_VISUALS.GRID_SIZE;
```

### 2.2 CSS样式应用

```css
.talent-node {
  background-image: url('SPRITE_SHEET_URL');
  background-size: 384px 384px; /* GRID_SIZE * 3 */
  background-position: bgPosX bgPosY;
  background-repeat: no-repeat;
  width: nodeConfig.size;
  height: nodeConfig.size;
}
```

### 2.3 视觉反馈

- **锁定状态**：`filter: grayscale(0.5) brightness(0.7)` + `opacity: 0.5`
- **可解锁状态**：正常显示 + `cursor: pointer`
- **已解锁状态**：正常显示 + 发光效果 (`box-shadow`)
- **悬停效果**：`scale(1.1)` + 增强发光

---

## 3. 使用方法

### 3.1 替换精灵图URL

在 `src/constants.js` 中更新：

```javascript
export const TALENT_VISUALS = {
  SPRITE_SHEET_URL: 'https://your-cdn.com/talent-nodes-sprite.png',
  // ...
};
```

### 3.2 调整网格尺寸（如需要）

如果精灵图的实际尺寸不是128px，修改：

```javascript
GRID_SIZE: 64, // 或其他尺寸
```

同时调整 `TALENT_ASSETS.NODES` 中的 `size` 属性以匹配显示效果。

### 3.3 调整精灵映射（如需要）

如果精灵图布局不同，更新 `MAPPING` 配置：

```javascript
MAPPING: {
  SMALL: {
    LOCKED:    { col: 0, row: 0 },
    AVAILABLE: { col: 1, row: 0 },
    ALLOCATED: { col: 2, row: 0 }
  },
  // 根据实际布局调整...
}
```

---

## 4. 关键公式

### 4.1 Background Position计算

```
posX = -1 × col × GRID_SIZE
posY = -1 × row × GRID_SIZE
```

**原理**：CSS `background-position` 使用负值向左/上移动背景图，从而"切片"出目标区域。

### 4.2 Background Size计算

```
width  = GRID_SIZE × 列数（3）
height = GRID_SIZE × 行数（3）
```

这确保精灵图按原始尺寸显示，防止缩放失真。

---

## 5. 优势

1. **单次加载**：只需加载一张精灵图，减少HTTP请求
2. **状态切换流畅**：通过CSS切换，无需等待图片加载
3. **易于维护**：只需更新一张图片和配置文件
4. **性能优化**：减少内存占用和网络开销

---

## 6. 兼容性说明

### 6.1 其他资产保持不变

- **灵魂水晶**：继续使用CSS/Unicode字符 `💎`（无需图片）
- **背景**：单独的 `TALENT_ASSETS.BACKGROUND.imageUrl`
- **连接线**：Canvas绘制（无精灵图）

### 6.2 根节点特殊处理

目前根节点（ROOT）使用 KEYSTONE 的精灵图。如需独立设计，可在精灵图中添加第4行并更新映射：

```javascript
ROOT: {
  LOCKED:    { col: 0, row: 3 },
  AVAILABLE: { col: 1, row: 3 },
  ALLOCATED: { col: 2, row: 3 }
}
```

---

## 7. 待办事项

- [ ] 将 `[PLACEHOLDER_SPRITE_SHEET_URL]` 替换为实际的精灵图URL
- [ ] 根据实际精灵图调整 `GRID_SIZE`（如果不是128px）
- [ ] 测试不同屏幕分辨率下的显示效果
- [ ] 考虑添加 `@2x` 精灵图支持高DPI屏幕

---

## 8. 调试提示

### 8.1 精灵图未显示

- 检查 `SPRITE_SHEET_URL` 是否正确
- 检查浏览器控制台是否有404错误
- 检查 `GRID_SIZE` 是否匹配实际图片尺寸

### 8.2 显示错误的精灵

- 检查 `MAPPING` 配置的 `col` 和 `row` 值
- 验证 `background-position` 计算公式
- 使用浏览器开发者工具检查元素的 `background-position` 值

### 8.3 精灵图模糊

- 检查 `background-size` 是否正确（应为 `GRID_SIZE * 3`）
- 考虑使用更高分辨率的精灵图
- 添加 `image-rendering: crisp-edges;` CSS属性

---

## 9. 示例代码

### 9.1 完整的节点样式示例

```css
.talent-node-allocated {
  background-image: url('sprite.png');
  background-size: 384px 384px;
  background-position: -256px 0px; /* ALLOCATED SMALL: col=2, row=0 */
  width: 48px;
  height: 48px;
  box-shadow: 0 0 20px rgba(106, 106, 128, 0.5);
}
```

### 9.2 动态切换示例

```javascript
// 解锁节点时自动切换精灵
function unlockNode(nodeId) {
  // ... 解锁逻辑 ...
  
  // 重新渲染会自动计算新的状态和精灵位置
  this.refresh();
}
```

---

**重构完成时间**: 2025年12月23日  
**文件修改**: `src/constants.js`, `src/TalentTreeUI.js`

