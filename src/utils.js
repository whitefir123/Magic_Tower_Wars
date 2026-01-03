// utils.js
import { ASSETS, ICON_GRID_COLS, ICON_GRID_ROWS, TILE_SIZE } from './constants.js';

// 注意：AssetLoader 已被移除，请使用统一的 ResourceManager
// 从 utils/ResourceManager.js 导入并使用 window.ResourceManager 实例

export class Sprite {
  constructor(config) {
    this.assetKey = config.assetKey; this.loader = config.loader;
    this.isStatic = config.isStatic || false;
    this.iconIndex = typeof config.iconIndex === 'number' ? config.iconIndex : null;
    this.destHeight = (typeof config.destHeight === 'number') ? config.destHeight : (this.isStatic ? TILE_SIZE : 56);
    this.direction = 0; this.currentFrame = 0;
    this.animTimer = 0; this.frameInterval = 100;
    this.animationType = config.animationType || 'default'; // 'default', 'player', 'monster', 'static'
  }
  setDirection(dir) { if (this.direction !== dir) { this.direction = dir; this.currentFrame = 0; } }
  
  update(dt, isMoving) {
    if (this.isStatic) return;
    
    // 根据动画类型使用不同的动画逻辑
    if (this.animationType === 'player') {
      this._updatePlayerAnimation(dt, isMoving);
    } else if (this.animationType === 'monster') {
      this._updateMonsterAnimation(dt, isMoving);
    } else if (this.animationType === 'bat') {
      this._updateBatAnimation(dt, isMoving);
    } else if (this.animationType === 'icemonster') {
      this._updateIceMonsterAnimation(dt, isMoving);
    } else if (this.animationType === 'merchant') {
      this._updateMerchantAnimation(dt, isMoving);
    } else {
      // 默认行为（向后兼容）
      this._updateDefaultAnimation(dt, isMoving);
    }
  }
  
  // 玩家动画控制器：只在移动时播放动画，静止时保持第一帧
  _updatePlayerAnimation(dt, isMoving) {
    if (!isMoving) {
      // 静止时保持第一帧，不更新动画
      this.currentFrame = 0;
      this.animTimer = 0;
      return;
    }
    
    // 移动时播放动画
    this.animTimer += dt;
    if (this.animTimer > this.frameInterval) {
      this.animTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 4;
    }
  }
  
  // 怪物动画控制器：持续播放动画（史莱姆稍微慢一点）
  _updateMonsterAnimation(dt, isMoving) {
    this.animTimer += dt;
    const baseInterval = isMoving ? this.frameInterval : Math.max(300, this.frameInterval * 3);
    const scale = (this.assetKey === 'MONSTER_SLIME') ? 1.25 : 1.0; // 史莱姆动画稍慢
    const interval = Math.floor(baseInterval * scale);
    if (this.animTimer > interval) {
      this.animTimer = 0;
      if (isMoving) this.currentFrame = (this.currentFrame + 1) % 4;
      else this.currentFrame = (this.currentFrame + 1) % 2;
    }
  }
  
  // 蝙蝠动画控制器：特殊处理，第四行使用第三行的水平翻转
  _updateBatAnimation(dt, isMoving) {
    this.animTimer += dt;
    const interval = isMoving ? this.frameInterval : Math.max(300, this.frameInterval * 3);
    if (this.animTimer > interval) {
      this.animTimer = 0;
      if (isMoving) this.currentFrame = (this.currentFrame + 1) % 4;
      else this.currentFrame = (this.currentFrame + 1) % 2;
    }
  }
  
  // 冰露冰动画控制器：特殊处理，第四行使用第三行的水平翻转
  _updateIceMonsterAnimation(dt, isMoving) {
    this.animTimer += dt;
    const interval = isMoving ? this.frameInterval : Math.max(300, this.frameInterval * 3);
    if (this.animTimer > interval) {
      this.animTimer = 0;
      if (isMoving) this.currentFrame = (this.currentFrame + 1) % 4;
      else this.currentFrame = (this.currentFrame + 1) % 2;
    }
  }
  
  // 商人动画控制器：只有两帧的动画
  _updateMerchantAnimation(dt, isMoving) {
    this.animTimer += dt;
    // 商人动画间隔：300ms（较慢的动画）
    const interval = 300;
    if (this.animTimer > interval) {
      this.animTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 2;
    }
  }
  
  // 默认动画控制器（向后兼容）
  _updateDefaultAnimation(dt, isMoving) {
    this.animTimer += dt;
    const interval = isMoving ? this.frameInterval : Math.max(300, this.frameInterval * 3);
    if (this.animTimer > interval) {
      this.animTimer = 0;
      if (isMoving) this.currentFrame = (this.currentFrame + 1) % 4;
      else this.currentFrame = (this.currentFrame + 1) % 2;
    }
  }
  
  draw(ctx, x, y) {
    const img = this.loader.getImage(this.assetKey);
    if (!img) { ctx.fillStyle = 'magenta'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); return; }
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    if (this.isStatic) {
      if (this.iconIndex != null) {
        const cols = ICON_GRID_COLS || 4;
        const rows = ICON_GRID_ROWS || 4;
        const cellW = natW / cols;
        const cellH = natH / rows;
        const col = this.iconIndex % cols;
        const row = Math.floor(this.iconIndex / cols);
        const sx = col * cellW;
        const sy = row * cellH;
        
        // FIX: Maintain aspect ratio when drawing icons
        // Calculate the aspect ratio of the source cell
        const cellAspect = cellW / cellH;
        
        // Determine destination dimensions while maintaining aspect ratio
        let destW = TILE_SIZE;
        let destH = TILE_SIZE;
        
        if (cellAspect > 1) {
          // Cell is wider than tall - constrain by height
          destH = TILE_SIZE;
          destW = TILE_SIZE * cellAspect;
        } else if (cellAspect < 1) {
          // Cell is taller than wide - constrain by width
          destW = TILE_SIZE;
          destH = TILE_SIZE / cellAspect;
        }
        
        // Center the icon within the tile
        const offsetX = (TILE_SIZE - destW) / 2;
        const offsetY = (TILE_SIZE - destH) / 2;
        
        ctx.drawImage(img, sx, sy, cellW, cellH, x + offsetX, y + offsetY, destW, destH);
      } else {
        ctx.drawImage(img, 0, 0, natW, natH, x, y, TILE_SIZE, TILE_SIZE);
      }
      return;
    }

    // 商人动画特殊处理：只有 2 帧，1 行
    if (this.animationType === 'merchant') {
      const cols = 2; // 商人只有 2 帧
      const rows = 1; // 商人只有 1 行
      const srcW = natW / cols;
      const srcH = natH / rows;
      const sx = Math.floor(this.currentFrame) * srcW;
      const sy = 0; // 只有一行

      const dh = this.destHeight;
      const aspect = srcW / srcH;
      const dw = dh * aspect;
      const drawX = x + (TILE_SIZE - dw) / 2;
      const drawY = y - (dh - TILE_SIZE);
      ctx.drawImage(img, sx, sy, srcW, srcH, drawX, drawY, dw, dh);
      return;
    }

    // 4x4 spritesheet（怪物和玩家）
    const cols = 4, rows = 4;
    const srcW = natW / cols; const srcH = natH / rows;
    const sx = Math.floor(this.currentFrame) * srcW;
    
    // 蝙蝠和冰露冰特殊处理：第四行不用，改用第三行并在向右时水平翻转；其余怪物保持原映射
    let shouldFlipHorizontal = false;
    let mappedRow;
    
    if (this.animationType === 'bat' || this.animationType === 'icemonster') {
      // 骷髅兵使用标准方向映射，不使用翻转逻辑
      if (this.animationType === 'icemonster' && this.assetKey === 'MONSTER_SKELETON') {
        // 骷髅兵素材左右方向需要修正，使用标准顺序
        const rowMap = [0, 1, 2, 3];
        mappedRow = rowMap[this.direction] ?? 0;
        shouldFlipHorizontal = false;
      } else {
        // 蝙蝠和其他icemonster类型使用原有的翻转逻辑
        if (this.direction === 2) {
          // 向左：用第三行素材并水平翻转
          mappedRow = 2;
          shouldFlipHorizontal = true;
        } else if (this.direction === 3) {
          // 向右：用第三行素材（不翻转）
          mappedRow = 2;
          shouldFlipHorizontal = false;
        } else {
          // 向下/向上：分别映射到第1/第2行
          const specialRowMap = [0, 1];
          mappedRow = specialRowMap[this.direction] ?? 0;
        }
      }
    } else {
      // 其他怪物默认按旧表：左右行互换；部分素材（如 SLIME）使用标准顺序
      let rowMap = [0, 1, 3, 2];
      if (this.assetKey === 'MONSTER_SLIME') {
        rowMap = [0, 1, 2, 3];
      } else if (this.assetKey === 'MONSTER_REAPER') {
        // 红小鬼素材左右方向正确，不需要互换
        rowMap = [0, 1, 2, 3];
      } else if (this.assetKey === 'MONSTER_SKELETON') {
        // 骷髅兵素材左右方向需要修正，使用标准顺序
        rowMap = [0, 1, 2, 3];
      }
      mappedRow = rowMap[this.direction] ?? 0;
    }
    
    const sy = mappedRow * srcH;

    const dh = this.destHeight; const aspect = srcW / srcH; const dw = dh * aspect;
    const drawX = x + (TILE_SIZE - dw) / 2;
    const drawY = y - (dh - TILE_SIZE);
    
    if (shouldFlipHorizontal) {
      // 水平翻转绘制（以目标矩形右边缘为翻转轴，避免半像素偏移）
      ctx.save();
      ctx.translate(drawX + dw, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, srcW, srcH, drawX, drawY, dw, dh);
    }
  }
}

export class Camera {
  constructor(width, height, mapWidth, mapHeight) {
    this.width = width; this.height = height;
    this.mapWidth = mapWidth; this.mapHeight = mapHeight;
    this.x = 0; this.y = 0; this.shakeTimer = 0;
  }
  follow(target) {
    if (!target) return;
    let cx = target.visualX - this.width / 2;
    let cy = target.visualY - this.height / 2;
    cx = Math.max(0, Math.min(cx, this.mapWidth - this.width));
    cy = Math.max(0, Math.min(cy, this.mapHeight - this.height));
    if (this.shakeTimer > 0) { const ox = (Math.random()*10-5), oy=(Math.random()*10-5); this.x = cx + ox; this.y = cy + oy; this.shakeTimer--; }
    else { this.x = cx; this.y = cy; }
  }
}

export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color || '#fff';
    this.life = 800; this.alpha = 1; this.velocityY = 0.05; this.scale = 1;
  }
  update(dt) { this.life -= dt; this.y -= this.velocityY * dt; this.alpha = Math.max(0, this.life/800); this.scale = 1 + (1 - this.alpha) * 0.1; }
  isDead() { return this.life <= 0; }
  draw(ctx) {
    const { x, y } = this; 
    // Assumes world-space draw call (no camera offsets inside)
    ctx.save();
    ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color; ctx.font = 'bold 16px Cinzel, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    ctx.fillText(this.text, x + TILE_SIZE/2, y);
    ctx.restore();
  }
}

export class FogParticle {
  constructor(x, y, tileX, tileY) {
    // World position (centered on tile)
    this.x = x;
    this.y = y;
    this.tileX = tileX;
    this.tileY = tileY;
    
    // Random rotation (0-360 degrees) so particles don't look identical
    this.rotation = Math.random() * Math.PI * 2;
    
    // Random scale (10.0 to 14.0) - enlarged 4x again from previous (very large coverage)
    this.scale = 10.0 + Math.random() * 4.0;
    
    // Alpha starts at 1.0 (fully opaque)
    this.alpha = 1.0;
    
    // Dispersion state
    this.isDispersing = false;
    
    // Velocity when dispersing (used for wind-blown animation)
    this.velocity = { x: 0, y: 0 };
    
    // Dispersion animation parameters
    this.disperseTime = 0;
    this.disperseDuration = 600; // Reduced from 1000ms for faster dispersal
  }
  
  update(dt) {
    if (this.isDispersing) {
      this.disperseTime += dt;
      const progress = Math.min(1, this.disperseTime / this.disperseDuration);
      
      // Move particle away (drift)
      this.x += this.velocity.x * dt;
      this.y += this.velocity.y * dt;
      
      // Fade out
      this.alpha = Math.max(0, 1.0 - progress);
      
      // Slightly increase scale as it dissipates
      this.scale += 0.2 * (dt / this.disperseDuration);
    }
  }
  
  triggerDispersal(playerX, playerY, windAngle = null) {
    this.isDispersing = true;
    
    // Calculate velocity: either away from player or in wind direction
    if (windAngle !== null) {
      // Wind direction
      const speed = 0.55; // Further increased for even faster dispersal
      this.velocity.x = Math.cos(windAngle) * speed;
      this.velocity.y = Math.sin(windAngle) * speed;
    } else {
      // Away from player
      const dx = this.x - playerX;
      const dy = this.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 0.55; // Further increased for even faster dispersal
      if (dist > 0) {
        this.velocity.x = (dx / dist) * speed;
        this.velocity.y = (dy / dist) * speed;
      } else {
        // Random direction if exactly on player
        const angle = Math.random() * Math.PI * 2;
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;
      }
    }
  }
  
  isDead() {
    return this.isDispersing && this.alpha <= 0;
  }
  
  draw(ctx, fogImage) {
    if (!fogImage) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Calculate scaled size
    const scaledSize = TILE_SIZE * this.scale;
    const offset = (scaledSize - TILE_SIZE) / 2;
    
    // Translate to particle position, apply rotation and scale
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Draw centered on the particle position
    ctx.drawImage(fogImage, -scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
    
    ctx.restore();
  }
}

