// VisualEffectsSystem.js - 简单“打击感 / 游戏汁”特效系统
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
     *  x:number,y:number,vx:number,vy:number,
     *  life:number,maxLife:number,color:string,
     *  size:number,gravity:number,alpha:number
     * }>} */
    this.particles = [];

    /** @type {Array<{
     *  el:HTMLElement,
     *  startX:number,startY:number,
     *  cpX:number,cpY:number,
     *  endX:number,endY:number,
     *  startTime:number,duration:number,
     *  targetId:string
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
      // 设置基础样式（CSS 中已有完整样式，这里只设置关键属性）
      this.flashOverlay.style.position = 'fixed';
      this.flashOverlay.style.inset = '0';
      this.flashOverlay.style.pointerEvents = 'none';
      this.flashOverlay.style.zIndex = '1000002';
      this.flashOverlay.style.mixBlendMode = 'screen';
      this.flashOverlay.style.opacity = '0';
      this.flashOverlay.style.transition = 'opacity 0.22s ease-out';
      // 设置 CSS 变量和阴影（暗角效果）
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
      this.flyLayer.style.overflow = 'visible'; // 允许动画飞出边界
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
      TRAP: 22,
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

      if (type === 'CHEST') {
        // 金币 / 宝箱爆：偏向上抛，金色
        const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI / 3);
        const speed = 0.08 + Math.random() * 0.08; // 像素/ms
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        const goldenPalette = ['#ffd700', '#ffe066', '#ffcc33', '#fff4b0'];
        color = goldenPalette[Math.floor(Math.random() * goldenPalette.length)];
        size = 3 + Math.random() * 2;
        gravity = 0.0008;
      } else if (type === 'TRAP') {
        // 陷阱爆：径向红色喷溅
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.09 + Math.random() * 0.12;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        const bloodPalette = ['#ff4b4b', '#b00020', '#7f0000'];
        color = bloodPalette[Math.floor(Math.random() * bloodPalette.length)];
        size = 2 + Math.random() * 2;
        gravity = 0.0006;
        life = 380 + Math.random() * 300;
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
        alpha: 1,
      });
    }
  }

  /**
   * 掉落物从世界坐标飞向 UI
   * @param {number} startX - 世界坐标 X（像素）
   * @param {number} startY - 世界坐标 Y（像素）
   * @param {string} assetKey - 资源键（用于从 ResourceManager 获取图片）
   * @param {string} targetElementId - 目标 DOM 元素 ID（例如 backpack-icon）
   * @param {number|null} iconIndex - 精灵表中的图标索引（4x4网格），null表示单张图片
   */
  flyLoot(startX, startY, assetKey, targetElementId, iconIndex = null) {
    if (!this.flyLayer) {
      // 尝试重新初始化
      this.initDOMElements();
      if (!this.flyLayer) {
        console.warn('[VFX] flyLayer missing even after init attempt');
        return;
      }
    }

    const targetEl = document.getElementById(targetElementId);
    if (!targetEl) {
      // 目标不存在（可能在不同页面），静默失败
      return;
    }

    const canvas = this.game.canvas;
    const camera = this.game.camera;
    if (!canvas || !camera) return;

    // 获取画布在屏幕上的位置和尺寸
    const rect = canvas.getBoundingClientRect();
    const zoom = this.game.cameraZoom || 1.0;
    
    // 计算缩放比例（画布CSS尺寸 / 画布实际分辨率）
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    // 世界坐标 -> 屏幕绝对坐标
    // 修正：直接映射渲染逻辑 (World - Cam) * Zoom
    const worldToScreen = (wx, wy) => {
      // 1. 计算相对于相机的世界偏移
      const viewX = (wx - camera.x);
      const viewY = (wy - camera.y);
      
      // 2. 应用相机缩放 (得到画布内部像素坐标)
      const canvasX = viewX * zoom;
      const canvasY = viewY * zoom;
      
      // 3. 应用画布缩放 (CSS scale) 并加上画布屏幕偏移
      const screenX = rect.left + canvasX * scaleX;
      const screenY = rect.top + canvasY * scaleY;
      
      return { x: screenX, y: screenY };
    };

    const startScreen = worldToScreen(startX, startY);
    const targetRect = targetEl.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // 生成飞行轨迹控制点
    const midX = (startScreen.x + endX) / 2;
    // 控制点更高一点，形成更明显的抛物线
    const midY = Math.min(startScreen.y, endY) - 150 - Math.random() * 50; 
    const cpX = midX + (Math.random() - 0.5) * 60;
    const cpY = midY;

    // 创建飞行元素
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
    // 初始位置设置，防止第一帧闪烁
    el.style.transform = `translate(${startScreen.x - 16}px, ${startScreen.y - 16}px) scale(0.5)`;

    // 获取图片资源
    let imgSrc = '';
    try {
      if (this.game.loader && assetKey) {
        const img = this.game.loader.getImage(assetKey);
        if (img && img.src) {
          imgSrc = img.src;
        }
      }
    } catch (e) {
      console.warn('[VFX] Failed to get image:', e);
    }

    // 兜底图片
    if (!imgSrc) {
      const backpack = document.getElementById('backpack-icon');
      if (backpack && backpack.src) imgSrc = backpack.src;
    }

    if (imgSrc) {
      el.style.backgroundImage = `url("${imgSrc}")`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.imageRendering = 'pixelated'; // 保持像素风格
      
      // 设置图标切片
      if (iconIndex !== null) {
        const cols = 4; 
        const rows = 4;
        const col = iconIndex % cols;
        const row = Math.floor(iconIndex / cols);
        
        // 使用百分比定位精灵图
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

    // 添加到动画队列
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
    let maxOpacity = 0.18; // 避免刺眼，最高 0.2

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

    // 轻微停留后淡出
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
      const gravityScale = 1; // 可统一缩放重力
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dtMs;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        const t = 1 - p.life / p.maxLife;
        p.alpha = 1 - t;

        p.vy += p.gravity * gravityScale * dtMs;
        p.x += p.vx * dtMs;
        p.y += p.vy * dtMs;
      }
    }

    // 更新飞行掉落物
    if (this.lootFlights.length) {
      const now = performance.now();
      for (let i = this.lootFlights.length - 1; i >= 0; i--) {
        const f = this.lootFlights[i];
        const tRaw = (now - f.startTime) / f.duration;
        const t = Math.min(1, Math.max(0, tRaw));

        // 二次贝塞尔插值
        const oneMinusT = 1 - t;
        const bx = oneMinusT * oneMinusT * f.startX +
          2 * oneMinusT * t * f.cpX +
          t * t * f.endX;
        const by = oneMinusT * oneMinusT * f.startY +
          2 * oneMinusT * t * f.cpY +
          t * t * f.endY;

        // 轻微缩放 + 旋转
        const scale = 0.9 + 0.3 * (1 - oneMinusT);
        const rotate = (t * 360) * (Math.random() > 0.5 ? 1 : -1);

        f.el.style.transform = `translate(${bx - 16}px, ${by - 16}px) scale(${scale}) rotate(${rotate}deg)`;

        if (t >= 1) {
          const target = document.getElementById(f.targetId);
          if (target) {
            // 触发背包图标弹跳
            target.classList.remove('backpack-bounce');
            // 强制重排以重触发动画
            // eslint-disable-next-line no-unused-expressions
            target.offsetWidth;
            target.classList.add('backpack-bounce');

            // 在动画结束后移除 class，防止长期占用
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
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      const half = p.size / 2;
      ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
    }

    ctx.restore();
  }
}

