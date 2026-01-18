/**
 * 铁匠铺素材使用示例
 * 
 * 这个文件展示了如何在游戏中使用新添加的铁匠铺素材
 */

// ============================================
// 示例 1: 在 ForgeUI 中添加背景图片
// ============================================

// 在 ForgeUI.js 的 injectStyles() 方法中修改：
const forgeModalStyle = `
  .forge-modal {
    position: relative;
    /* 使用铁匠铺背景图片，如果加载失败则使用渐变色 */
    background: url('https://i.postimg.cc/NMZFpb0P/tiejiangpubackground1.png') center/cover no-repeat,
                linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    background-blend-mode: overlay; /* 混合模式让背景更有层次 */
    border: 3px solid #d4af37;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  }
  
  /* 添加半透明遮罩层，确保文字可读性 */
  .forge-modal::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 12px;
    pointer-events: none;
    z-index: 0;
  }
  
  /* 确保内容在遮罩层之上 */
  .forge-header,
  .forge-content,
  .forge-footer {
    position: relative;
    z-index: 1;
  }
`;

// ============================================
// 示例 2: 添加铁匠NPC头像
// ============================================

// 在 ForgeUI.js 的 createUI() 方法中修改 header 部分：
const headerHTML = `
  <div class="forge-header">
    <div style="display: flex; align-items: center; gap: 15px;">
      <!-- 铁匠NPC头像 -->
      <div class="blacksmith-avatar" style="
        width: 64px;
        height: 64px;
        border: 2px solid #d4af37;
        border-radius: 8px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.5);
      ">
        <img src="https://i.postimg.cc/rpT0xfH5/tiejiang1.png" 
             alt="铁匠" 
             style="
               width: 100%;
               height: 100%;
               image-rendering: pixelated;
               image-rendering: -moz-crisp-edges;
               image-rendering: crisp-edges;
             ">
      </div>
      <div>
        <h2 class="forge-title">铁匠铺</h2>
        <p style="margin: 0; font-size: 12px; color: #aaa;">
          铁匠等级: <span id="blacksmith-level">1</span>
        </p>
      </div>
    </div>
    <button class="forge-close-btn">✕</button>
  </div>
`;

// ============================================
// 示例 3: 渲染品质边框
// ============================================

/**
 * 为装备卡片添加品质边框
 * @param {HTMLElement} cardElement - 装备卡片元素
 * @param {string} quality - 品质 (COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC)
 */
function applyQualityBorder(cardElement, quality) {
  const game = window.game;
  const loader = game?.loader;
  const borderImg = loader?.getImage('FORGE_QUALITY_BORDERS');
  
  if (!borderImg || !borderImg.complete) {
    // 降级方案：使用纯色边框
    const qualityColors = {
      COMMON: '#ffffff',
      UNCOMMON: '#1eff00',
      RARE: '#0070dd',
      EPIC: '#a335ee',
      LEGENDARY: '#ff8000',
      MYTHIC: '#e6cc80'
    };
    cardElement.style.border = `2px solid ${qualityColors[quality] || '#ffffff'}`;
    return;
  }
  
  // 假设品质边框图是 6x1 的精灵图（6种品质横向排列）
  const qualityIndex = {
    COMMON: 0,
    UNCOMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4,
    MYTHIC: 5
  };
  
  const index = qualityIndex[quality] || 0;
  const cols = 6;
  const cellW = borderImg.width / cols;
  const cellH = borderImg.height;
  
  // 创建canvas来提取单个边框
  const canvas = document.createElement('canvas');
  canvas.width = cellW;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(borderImg, index * cellW, 0, cellW, cellH, 0, 0, cellW, cellH);
  
  // 应用边框
  cardElement.style.borderImage = `url(${canvas.toDataURL()}) 30 round`;
  cardElement.style.borderWidth = '3px';
  cardElement.style.borderStyle = 'solid';
}

// 在 createItemCard() 方法中使用：
function createItemCard(itemInstance, slot, source) {
  const itemCard = document.createElement('div');
  itemCard.className = 'forge-item-card';
  
  // 应用品质边框
  const quality = itemInstance.quality || 'COMMON';
  applyQualityBorder(itemCard, quality);
  
  // ... 其余代码
  return itemCard;
}

// ============================================
// 示例 4: 播放强化特效
// ============================================

/**
 * 在 VisualEffectsSystem.js 中添加强化特效
 */
class EnhancementEffects {
  constructor(game) {
    this.game = game;
    this.loader = game.loader;
    this.activeEffects = [];
  }
  
  /**
   * 播放强化成功特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  playSuccessEffect(x, y) {
    const effectImg = this.loader.getImage('FORGE_SUCCESS_EFFECT');
    if (!effectImg || !effectImg.complete) return;
    
    // 假设特效图是 8帧 的横向精灵图
    const effect = {
      type: 'enhance_success',
      x: x,
      y: y,
      frame: 0,
      maxFrames: 8,
      frameWidth: effectImg.width / 8,
      frameHeight: effectImg.height,
      image: effectImg,
      scale: 1.0,
      alpha: 1.0,
      duration: 600, // 毫秒
      startTime: Date.now()
    };
    
    this.activeEffects.push(effect);
  }
  
  /**
   * 播放强化失败特效
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  playFailureEffect(x, y) {
    const effectImg = this.loader.getImage('FORGE_FAILURE_EFFECT');
    if (!effectImg || !effectImg.complete) return;
    
    // 假设特效图是 6帧 的横向精灵图
    const effect = {
      type: 'enhance_failure',
      x: x,
      y: y,
      frame: 0,
      maxFrames: 6,
      frameWidth: effectImg.width / 6,
      frameHeight: effectImg.height,
      image: effectImg,
      scale: 1.0,
      alpha: 1.0,
      duration: 400, // 毫秒
      startTime: Date.now()
    };
    
    this.activeEffects.push(effect);
  }
  
  /**
   * 更新和渲染特效
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  update(ctx) {
    const now = Date.now();
    
    this.activeEffects = this.activeEffects.filter(effect => {
      const elapsed = now - effect.startTime;
      const progress = elapsed / effect.duration;
      
      if (progress >= 1.0) {
        return false; // 移除已完成的特效
      }
      
      // 计算当前帧
      effect.frame = Math.floor(progress * effect.maxFrames);
      effect.alpha = 1.0 - progress; // 淡出效果
      
      // 渲染特效
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.imageSmoothingEnabled = false;
      
      const sx = effect.frame * effect.frameWidth;
      const sy = 0;
      const sw = effect.frameWidth;
      const sh = effect.frameHeight;
      
      const drawW = sw * effect.scale;
      const drawH = sh * effect.scale;
      const drawX = effect.x - drawW / 2;
      const drawY = effect.y - drawH / 2;
      
      ctx.drawImage(effect.image, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      ctx.restore();
      
      return true; // 保留未完成的特效
    });
  }
}

// 在 ForgeUI.handleEnhance() 中使用：
function handleEnhance() {
  // ... 现有代码
  
  const result = this.blacksmithSystem.enhanceItem(this.selectedItem, this.player, options);
  
  // 播放特效
  const game = window.game;
  if (game && game.enhancementEffects) {
    const canvas = game.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    if (result.success) {
      game.enhancementEffects.playSuccessEffect(centerX, centerY);
      // 播放成功音效
      if (game.audio && game.audio.playForge) {
        game.audio.playForge();
      }
    } else {
      game.enhancementEffects.playFailureEffect(centerX, centerY);
      // 播放失败音效
      if (game.audio && game.audio.playMetalClick) {
        game.audio.playMetalClick();
      }
    }
  }
  
  // ... 其余代码
}

// ============================================
// 示例 5: 渲染材料图标
// ============================================

/**
 * 渲染强化材料图标
 * @param {string} materialType - 材料类型
 * @param {number} size - 图标尺寸
 * @returns {HTMLCanvasElement} Canvas元素
 */
function renderMaterialIcon(materialType, size = 32) {
  const game = window.game;
  const loader = game?.loader;
  const materialImg = loader?.getImage('FORGE_MATERIALS');
  
  if (!materialImg || !materialImg.complete) {
    // 降级方案：返回占位符
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }
  
  // 材料图标映射（假设是横向排列的精灵图）
  const materialIndex = {
    PROTECTION_SCROLL: 0,    // 保护卷轴
    BLESSING_STONE: 1,       // 祝福石
    SET_ESSENCE: 2,          // 套装精华
    AWAKENING_STONE: 3,      // 觉醒石
    ENCHANTMENT_SCROLL: 4,   // 附魔卷轴
    ENHANCEMENT_STONE: 5     // 强化石
  };
  
  const index = materialIndex[materialType] || 0;
  const cols = 6; // 假设6列
  const cellW = materialImg.width / cols;
  const cellH = materialImg.height;
  
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(materialImg, index * cellW, 0, cellW, cellH, 0, 0, size, size);
  
  return canvas;
}

// 在UI中使用材料图标：
function renderMaterialList(materials) {
  const listHTML = materials.map(material => {
    const iconCanvas = renderMaterialIcon(material.type, 48);
    return `
      <div class="material-item">
        ${iconCanvas.outerHTML}
        <div class="material-info">
          <div class="material-name">${material.name}</div>
          <div class="material-count">×${material.count}</div>
        </div>
      </div>
    `;
  }).join('');
  
  return listHTML;
}

// ============================================
// 示例 6: 完整的强化流程（带特效）
// ============================================

/**
 * 完整的强化流程示例
 */
async function performEnhancement(item, player) {
  const forgeUI = window.game.forgeUI;
  const effects = window.game.enhancementEffects;
  
  // 1. 显示强化动画（铁匠挥锤）
  forgeUI.showBlacksmithAnimation('hammering');
  
  // 2. 等待动画完成
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 3. 执行强化逻辑
  const result = window.game.blacksmithSystem.enhanceItem(item, player);
  
  // 4. 播放结果特效
  const canvas = window.game.canvas;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  if (result.success) {
    // 成功特效
    effects.playSuccessEffect(centerX, centerY);
    forgeUI.showMessage('强化成功！', 'success');
    
    // 播放成功音效
    if (window.game.audio) {
      window.game.audio.playForge();
    }
    
    // 显示属性提升
    forgeUI.showStatIncrease(item);
  } else {
    // 失败特效
    effects.playFailureEffect(centerX, centerY);
    forgeUI.showMessage('强化失败...', 'error');
    
    // 播放失败音效
    if (window.game.audio) {
      window.game.audio.playMetalClick();
    }
  }
  
  // 5. 更新UI
  forgeUI.renderItemDetails(item);
  forgeUI.renderItemList();
  
  return result;
}

// ============================================
// 示例 7: 响应式背景处理
// ============================================

/**
 * 根据屏幕尺寸调整铁匠铺背景
 */
function adjustForgeBackground() {
  const modal = document.querySelector('.forge-modal');
  if (!modal) return;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // 移动端使用较小的背景图
  if (width < 768) {
    modal.style.backgroundSize = 'cover';
    modal.style.backgroundPosition = 'center';
  } else {
    modal.style.backgroundSize = 'contain';
    modal.style.backgroundPosition = 'center';
  }
}

// 监听窗口大小变化
window.addEventListener('resize', adjustForgeBackground);

// ============================================
// 使用说明
// ============================================

/*
1. 确保所有素材已添加到 src/data/assets.js 的 GAMEPLAY_ASSETS 中
2. 在游戏初始化时加载这些素材
3. 在 ForgeUI 中应用背景和NPC头像
4. 创建 EnhancementEffects 类来处理特效动画
5. 在强化操作中调用相应的特效方法
6. 测试所有素材在不同分辨率下的显示效果
*/

export {
  applyQualityBorder,
  EnhancementEffects,
  renderMaterialIcon,
  performEnhancement,
  adjustForgeBackground
};
