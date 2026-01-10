// VisualEffectsSystem.js - 简单"打击感 / 游戏汁"特效系统
// 职责：
// 1) 画面内粒子效果（金币爆、陷阱喷血、死亡烟雾）
// 2) 掉落物飞向 UI（例如背包图标）
// 3) 屏幕闪烁（受击等提示，使用极低透明度遮罩）

import { TILE_SIZE } from '../constants.js';

export class VisualEffectsSystem {
  /**
   * @param {Game} game - 游戏主实例
   */
  constructor(game) {
    this.game = game;

    /** @type {Array<{
     * x:number,y:number,vx:number,vy:number,
     * life:number,maxLife:number,color:string,
     * size:number,gravity:number,alpha:number,
     * drag:number, stretch:boolean
     * }>} */
    this.particles = [];

    /** @type {Array<{
     * el:HTMLElement,
     * startX:number,startY:number,
     * cpX:number,cpY:number,
     * endX:number,endY:number,
     * startTime:number,duration:number,
     * targetId:string
     * }>} */
    this.lootFlights = [];

    // 初始化 DOM 元素 (如果不存在则自动创建)
    this.initDOMElements();
  }

  /**
   * 初始化或创建必要的 DOM 层
   */
  initDOMElements() {
    // 1. Flash Overlay
    this.flashOverlay = document.getElementById('vfx-flash-overlay');
    if (!this.flashOverlay) {
      console.log('[VFX] Creating missing #vfx-flash-overlay');
      this.flashOverlay = document.createElement('div');
      this.flashOverlay.id = 'vfx-flash-overlay';
      this.flashOverlay.style.position = 'fixed';
      this.flashOverlay.style.inset = '0';
      this.flashOverlay.style.pointerEvents = 'none';
      this.flashOverlay.style.zIndex = '1000002';
      this.flashOverlay.style.mixBlendMode = 'screen';
      this.flashOverlay.style.opacity = '0';
      this.flashOverlay.style.transition = 'opacity 0.1s ease-out'; // 加快一点反应速度
      this.flashOverlay.style.setProperty('--flash-color', 'rgba(255, 255, 255, 0.9)');
      this.flashOverlay.style.boxShadow = 'inset 0 0 150px var(--flash-color)';
      document.body.appendChild(this.flashOverlay);
    }

    // 2. Fly Layer
    this.flyLayer = document.getElementById('vfx-fly-layer');
    if (!this.flyLayer) {
      console.log('[VFX] Creating missing #vfx-fly-layer');
      this.flyLayer = document.createElement('div');
      this.flyLayer.id = 'vfx-fly-layer';
      this.flyLayer.style.position = 'fixed';
      this.flyLayer.style.inset = '0';
      this.flyLayer.style.pointerEvents = 'none';
      this.flyLayer.style.zIndex = '1000002';
      this.flyLayer.style.overflow = 'visible'; 
      document.body.appendChild(this.flyLayer);
    }
  }

  /**
   * 发射粒子
   * @param {number} x - 世界坐标 X（像素）
   * @param {number} y - 世界坐标 Y（像素）
   * @param {'CHEST'|'TRAP'|'DEATH'} type
   */
  emitParticles(x, y, type) {
    const countMap = {
      CHEST: 24,
      TRAP: 24, // 12血 + 8灰 + 4高光
      DEATH: 18,
    };
    const count = countMap[type] || 16;

    for (let i = 0; i < count; i++) {
      let vx = 0;
      let vy = 0;
      let color = '#ffffff';
      let size = 3;
      let gravity = 0.0009; // 像素/ms²
      let life = 450 + Math.random() * 350; // ms
      let drag = 1.0; // 空气阻力 (1.0 = 无阻力)
      let stretch = false; // 是否根据速度拉伸

      if (type === 'CHEST') {
        // 金币 / 宝箱爆：偏向上抛，金色
        const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI / 3);
        const speed = 0.08 + Math.random() * 0.08; 
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        const goldenPalette = ['#ffd700', '#ffe066', '#ffcc33', '#fff4b0'];
        color = goldenPalette[Math.floor(Math.random() * goldenPalette.length)];
        size = 3 + Math.random() * 2;
        gravity = 0.0008;
      } else if (type === 'TRAP') {
        // === 陷阱优化逻辑：向上锥形喷射 + 物理分层 ===
        const rand = Math.random();
        
        if (rand < 0.5) {
          // A类：主喷溅血滴 (50%) - 向上猛冲，迅速减速，拉伸
          // 角度：向上稍微左右偏离 (-90度 ± 20度)
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
          // 速度：爆发力极强
          const speed = 0.18 + Math.random() * 0.15; 
          vx = Math.cos(angle) * speed * 0.6; // 横向分量收窄
          vy = Math.sin(angle) * speed;
          
          const bloodPalette = ['#8b0000', '#660000', '#4d0000']; // 深红到暗红
          color = bloodPalette[Math.floor(Math.random() * bloodPalette.length)];
          size = 2 + Math.random() * 2.5;
          gravity = 0.0016; // 重力较大，液体感
          drag = 0.94; // 强空气阻力，模拟液体粘滞感
          life = 400 + Math.random() * 300;
          stretch = true; // 启用拉伸渲染

        } else if (rand < 0.85) {
          // B类：机关灰尘 (35%) - 低空扩散
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.5; // 扇面更宽
          const speed = 0.05 + Math.random() * 0.08;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          
          const dustPalette = ['#888888', '#aaaaaa', '#6d6d6d'];
          color = dustPalette[Math.floor(Math.random() * dustPalette.length)];
          size = 1 + Math.random() * 1.5; // 细碎
          gravity = 0.0006;
          life = 300 + Math.random() * 200;
          drag = 0.96;

        } else {
          // C类：高光液滴 (15%) - 亮色，增加层次
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
          const speed = 0.12 + Math.random() * 0.12;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          
          color = '#ff9999'; // 亮粉白
          size = 1.5;
          gravity = 0.0012;
          life = 350 + Math.random() * 200;
        }

      } else if (type === 'DEATH') {
        // 死亡烟雾：缓慢上升的灰白色烟雾
        const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI / 4);
        const speed = 0.03 + Math.random() * 0.03;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        const smokePalette = ['#f5f5f5', '#c0c0c0', '#9e9e9e'];
        color = smokePalette[Math.floor(Math.random() * smokePalette.length)];
        size = 4 + Math.random() * 3;
        gravity = -0.00015; // 轻微上浮
        life = 650 + Math.random() * 500;
      }

      this.particles.push({
        x,
        y,
        vx,
        vy,
        life,
        maxLife: life,
        color,
        size,
        gravity,
        drag, 
        stretch,
        alpha: 1,
      });
    }
  }

  /**
   * 掉落物从世界坐标飞向 UI
   * @param {number} startX
   * @param {number} startY
   * @param {string} assetKey
   * @param {string} targetElementId
   * @param {number|null} iconIndex
   */
  flyLoot(startX, startY, assetKey, targetElementId, iconIndex = null) {
    if (!this.flyLayer) this.initDOMElements();
    if (!this.flyLayer) return;

    const targetEl = document.getElementById(targetElementId);
    if (!targetEl) return;

    const canvas = this.game.canvas;
    const camera = this.game.camera;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const zoom = this.game.cameraZoom || 1.0;
    
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const worldToScreen = (wx, wy) => {
      const viewX = (wx - camera.x);
      const viewY = (wy - camera.y);
      const canvasX = viewX * zoom;
      const canvasY = viewY * zoom;
      const screenX = rect.left + canvasX * scaleX;
      const screenY = rect.top + canvasY * scaleY;
      return { x: screenX, y: screenY };
    };

    const startScreen = worldToScreen(startX, startY);
    const targetRect = targetEl.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const midX = (startScreen.x + endX) / 2;
    const midY = Math.min(startScreen.y, endY) - 150 - Math.random() * 50; 
    const cpX = midX + (Math.random() - 0.5) * 60;
    const cpY = midY;

    const el = document.createElement('div');
    el.className = 'vfx-fly-item';
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.left = '0px'; 
    el.style.top = '0px';
    el.style.transformOrigin = 'center center';
    el.style.zIndex = '1000005'; 
    el.style.transform = `translate(${startScreen.x - 16}px, ${startScreen.y - 16}px) scale(0.5)`;

    let imgSrc = '';
    try {
      if (this.game.loader && assetKey) {
        const img = this.game.loader.getImage(assetKey);
        if (img && img.src) imgSrc = img.src;
      }
    } catch (e) {
      console.warn('[VFX] Failed to get image:', e);
    }

    if (!imgSrc) {
      const backpack = document.getElementById('backpack-icon');
      if (backpack && backpack.src) imgSrc = backpack.src;
    }

    if (imgSrc) {
      el.style.backgroundImage = `url("${imgSrc}")`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.imageRendering = 'pixelated';
      
      if (iconIndex !== null) {
        const cols = 4; 
        const rows = 4;
        const col = iconIndex % cols;
        const row = Math.floor(iconIndex / cols);
        const posX = (col / (cols - 1)) * 100;
        const posY = (row / (rows - 1)) * 100;
        el.style.backgroundSize = '400% 400%';
        el.style.backgroundPosition = `${posX}% ${posY}%`;
      } else {
        el.style.backgroundSize = 'contain';
        el.style.backgroundPosition = 'center';
      }
    } else {
      el.style.backgroundColor = '#ffd700'; 
    }

    this.flyLayer.appendChild(el);

    this.lootFlights.push({
      el,
      startX: startScreen.x,
      startY: startScreen.y,
      cpX, cpY, endX, endY,
      startTime: performance.now(),
      duration: 600 + Math.random() * 200,
      targetId: targetElementId
    });
  }

  /**
   * 触发屏幕闪烁
   * @param {'DAMAGE'|'LOOT'|'ULT'|string} type
   */
  triggerFlash(type = 'GENERIC') {
    if (!this.flashOverlay) return;

    let color = 'rgba(255,255,255,0.9)';
    let maxOpacity = 0.18; 

    switch (type) {
      case 'DAMAGE':
        color = 'rgba(255,64,64,0.9)';
        maxOpacity = 0.18;
        break;
      case 'LOOT':
        color = 'rgba(255,215,128,0.9)';
        maxOpacity = 0.12;
        break;
      case 'ULT':
        color = 'rgba(128,200,255,0.9)';
        maxOpacity = 0.16;
        break;
    }

    this.flashOverlay.style.setProperty('--flash-color', color);
    this.flashOverlay.style.opacity = String(maxOpacity);

    clearTimeout(this._flashTimeout);
    this._flashTimeout = setTimeout(() => {
      if (!this.flashOverlay) return;
      this.flashOverlay.style.opacity = '0';
    }, 120);
  }

  /**
   * 每帧更新
   * @param {number} dt - 帧间隔（毫秒）
   */
  update(dt) {
    const dtMs = dt || 16;

    // 更新粒子
    if (this.particles.length) {
      const gravityScale = 1;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dtMs;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        const t = 1 - p.life / p.maxLife;
        p.alpha = 1 - t;

        // 应用空气阻力 (模拟液体的粘滞感)
        if (p.drag) {
          // 这里的 drag 是每帧衰减系数
          // 简化处理：假设 drag 是基于 16ms 的衰减
          const timeScaledDrag = Math.pow(p.drag, dtMs / 16);
          p.vx *= timeScaledDrag;
          p.vy *= timeScaledDrag;
        }

        p.vy += p.gravity * gravityScale * dtMs;
        p.x += p.vx * dtMs;
        p.y += p.vy * dtMs;
      }
    }

    // 更新飞行掉落物 (保持原样)
    if (this.lootFlights.length) {
      const now = performance.now();
      for (let i = this.lootFlights.length - 1; i >= 0; i--) {
        const f = this.lootFlights[i];
        const tRaw = (now - f.startTime) / f.duration;
        const t = Math.min(1, Math.max(0, tRaw));

        const oneMinusT = 1 - t;
        const bx = oneMinusT * oneMinusT * f.startX +
          2 * oneMinusT * t * f.cpX +
          t * t * f.endX;
        const by = oneMinusT * oneMinusT * f.startY +
          2 * oneMinusT * t * f.cpY +
          t * t * f.endY;

        const scale = 0.9 + 0.3 * (1 - oneMinusT);
        const rotate = (t * 360) * (Math.random() > 0.5 ? 1 : -1);

        f.el.style.transform = `translate(${bx - 16}px, ${by - 16}px) scale(${scale}) rotate(${rotate}deg)`;

        if (t >= 1) {
          const target = document.getElementById(f.targetId);
          if (target) {
            target.classList.remove('backpack-bounce');
            // eslint-disable-next-line no-unused-expressions
            target.offsetWidth;
            target.classList.add('backpack-bounce');

            const onAnimEnd = () => {
              target.classList.remove('backpack-bounce');
              target.removeEventListener('animationend', onAnimEnd);
            };
            target.addEventListener('animationend', onAnimEnd);
          }

          if (f.el.parentNode === this.flyLayer) {
            this.flyLayer.removeChild(f.el);
          }
          this.lootFlights.splice(i, 1);
        }
      }
    }
  }

  /**
   * 在游戏渲染中绘制粒子
   * 注意：此方法假定 ctx 已经应用了摄像机和平移变换
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera} _camera
   */
  draw(ctx, _camera) {
    if (!this.particles.length) return;

    ctx.save();
    // 使用 lighter 可以让叠加的粒子更亮，更有能量感
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      
      // 判断是否需要进行速度拉伸渲染
      // 条件：标记为 stretch 且速度足够快
      const speedSq = p.vx * p.vx + p.vy * p.vy;
      // 0.0025 约等于 0.05 px/ms 的速度，低于这个速度就看不出拉伸了，回归方块
      if (p.stretch && speedSq > 0.0025) {
        ctx.save();
        
        // 移动到粒子中心
        ctx.translate(p.x, p.y);
        
        // 计算旋转角度
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);
        
        // 拉伸因子：速度越快越长
        // 基础长度 + 速度加成
        const speed = Math.sqrt(speedSq);
        const stretchFactor = 1 + speed * 8; // 系数可调，越大拖尾越长
        
        // 绘制旋转后的长条矩形
        // 宽度稍微变窄一点点，模拟拉伸变细
        const halfSize = p.size / 2;
        ctx.fillRect(-halfSize * stretchFactor, -halfSize * 0.8, p.size * stretchFactor, p.size * 0.8);
        
        ctx.restore();
      } else {
        // 普通绘制（灰尘、低速血滴、金币等）
        const half = p.size / 2;
        ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
      }
    }

    ctx.restore();
  }
}
