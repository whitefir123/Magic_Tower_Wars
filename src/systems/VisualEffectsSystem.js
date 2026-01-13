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
     * drag:number, stretch:boolean, blendMode:string,
     * width:number, stretchFactor:number, shape:string,
     * initialAlpha:number
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

    /** @type {Array<{
     * type:string,
     * x:number,y:number,rotation:number,
     * scale:number,
     * totalFrames:number,currentFrame:number,
     * frameTimer:number,frameDuration:number,
     * textureKey:string,isCrit:boolean
     * }>} */
    this.animations = [];

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
      let blendMode = 'source-over'; // 混合模式，默认正常遮盖
      let width = 3; // 线条宽度（像素）
      let stretchFactor = 0; // 拉伸系数（速度乘以此系数得到额外长度）
      let shape = 'rect'; // 形状：'rect' 矩形/线条，'circle' 圆形
      let initialAlpha = 1.0; // 初始透明度

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
        blendMode = 'lighter'; // 金币发光效果
        width = size; // 金币使用方块渲染
        stretch = false; // 金币不拉伸
        stretchFactor = 0; // 拉伸系数为0
        shape = 'rect'; // 方块形状

      } else if (type === 'TRAP') {
        // === 高压液体喷射：三类粒子混合 ===
        const rand = Math.random();
        
        if (rand < 0.6) {
          // Type A: 喷射血线 (60%) - 极细线条，高速向上喷
          // 角度：向上锥形喷射 (-90度 ±15度)
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 6); // ±15度 = π/6
          // 速度：高压喷射，非常快
          const speed = 0.20 + Math.random() * 0.18; // 0.20 ~ 0.38 px/ms
          vx = Math.cos(angle) * speed * 0.5; // 横向分量收窄，更集中向上
          vy = Math.sin(angle) * speed;
          
          // 鲜红色调色板
          const bloodPalette = ['#e00000', '#ff1a1a', '#ff3333', '#cc0000'];
          color = bloodPalette[Math.floor(Math.random() * bloodPalette.length)];
          
          size = 4 + Math.random() * 6; // 基础长度，会被速度拉伸
          width = 1; // 极细，1px宽度
          gravity = 0.0012; // 适中重力
          drag = 0.92; // 强空气阻力，模拟液体粘滞感
          life = 350 + Math.random() * 250;
          stretch = true; // 启用拉伸
          stretchFactor = 12; // 拉伸系数大，高速时拉得很长
          blendMode = 'source-over'; // 正常遮盖，不发光
          shape = 'rect'; // 长条形状

        } else if (rand < 0.9) {
          // Type B: 重力血滴 (30%) - 小短线，快速下坠
          // 角度：向四周扩散
          const angle = Math.random() * Math.PI * 2; // 360度全方向
          const speed = 0.06 + Math.random() * 0.08; // 较慢的初速度
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          
          // 深暗红色调色板
          const darkBloodPalette = ['#8a0000', '#6b0000', '#5c0000', '#4a0000'];
          color = darkBloodPalette[Math.floor(Math.random() * darkBloodPalette.length)];
          
          size = 2 + Math.random() * 2; // 基础长度
          width = 2; // 稍粗，2px宽度
          gravity = 0.0020; // 重力很大，模拟重液快速下坠
          drag = 0.96; // 中等阻力
          life = 400 + Math.random() * 300;
          stretch = true; // 启用拉伸
          stretchFactor = 2; // 拉伸系数小
          blendMode = 'source-over'; // 正常遮盖
          shape = 'rect'; // 矩形/线条形状

        } else {
          // Type C: 浑浊血雾 (10%) - 暗红色圆形气团，不发光
          const angle = Math.random() * Math.PI * 2; // 全方向
          const speed = 0.02 + Math.random() * 0.04; // 很慢，飘散感
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          
          // 暗褐红色调色板（不再是淡粉色）
          const mistPalette = ['#660000', '#7a0a0a', '#8a1c1c', '#751515'];
          color = mistPalette[Math.floor(Math.random() * mistPalette.length)];
          
          size = 3 + Math.random() * 2; // 3~5，中等大小
          width = size; // 圆形直径
          gravity = -0.0001; // 轻微上浮
          drag = 0.98; // 很轻的阻力
          life = 500 + Math.random() * 400; // 存活时间长
          stretch = false; // 不拉伸
          stretchFactor = 0;
          blendMode = 'source-over'; // 正常遮盖，不发光（不再是 lighter）
          shape = 'circle'; // 圆形形状
          initialAlpha = 0.6; // 初始透明度 0.6，随时间淡出
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
        blendMode = 'lighter'; // 烟雾发光效果
        width = size; // 使用圆形渲染
        stretch = false; // 烟雾不拉伸
        stretchFactor = 0; // 拉伸系数为0
        drag = 0.98; // 很轻的阻力
        shape = 'circle'; // 圆形形状，获得更好的烟雾效果
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
        blendMode,
        width,
        stretchFactor,
        shape,
        initialAlpha, // 保存初始透明度
        alpha: initialAlpha, // 当前透明度（从初始值开始）
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
   * 触发刀光特效
   * @param {number} x - 世界坐标 X（像素）
   * @param {number} y - 世界坐标 Y（像素）
   * @param {number} rotation - 旋转角度（弧度）
   * @param {boolean} isCrit - 是否暴击
   */
  triggerSlash(x, y, rotation, isCrit = false) {
    this.animations.push({
      type: 'SLASH',
      x,
      y,
      rotation,
      scale: isCrit ? 1.5 : 1.0,
      totalFrames: 5,
      currentFrame: 0,
      frameTimer: 0,
      frameDuration: 30, // 每帧持续30ms，总时长约150ms
      textureKey: 'TEX_VFX_SLASH',
      isCrit
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

    // 更新动画
    if (this.animations.length) {
      for (let i = this.animations.length - 1; i >= 0; i--) {
        const anim = this.animations[i];
        anim.frameTimer += dtMs;
        
        if (anim.frameTimer >= anim.frameDuration) {
          anim.currentFrame++;
          anim.frameTimer = 0;
          
          if (anim.currentFrame >= anim.totalFrames) {
            // 动画播放结束，移除
            this.animations.splice(i, 1);
          }
        }
      }
    }

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
        // 从初始透明度淡出到0
        const initialAlpha = p.initialAlpha !== undefined ? p.initialAlpha : 1.0;
        p.alpha = initialAlpha * (1 - t);

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
    // 绘制动画（在粒子之前绘制，确保刀光在粒子之上）
    if (this.animations.length) {
      for (const anim of this.animations) {
        if (anim.type === 'SLASH') {
          try {
            const img = this.game.loader?.getImage(anim.textureKey);
            if (!img || !img.complete || img.width === 0) {
              // 图片未加载完成，跳过
              continue;
            }
            
            const frameWidth = img.width / anim.totalFrames;
            
            ctx.save();
            
            // 移动到目标位置
            ctx.translate(anim.x, anim.y);
            
            // 旋转到攻击方向
            ctx.rotate(anim.rotation);
            
            // 应用缩放（暴击变大）
            ctx.scale(anim.scale, anim.scale);
            
            // 如果是暴击，使用更亮的混合模式
            if (anim.isCrit) {
              ctx.globalCompositeOperation = 'lighter';
            }
            
            // 居中绘制当前帧
            ctx.drawImage(
              img,
              frameWidth * anim.currentFrame, // 源X
              0, // 源Y
              frameWidth, // 源宽度
              img.height, // 源高度
              -frameWidth / 2, // 目标X（居中）
              -img.height / 2, // 目标Y（居中）
              frameWidth, // 目标宽度
              img.height // 目标高度
            );
            
            ctx.restore();
          } catch (e) {
            // 静默处理错误，避免影响游戏运行
            console.warn('[VFX] Failed to draw slash animation:', e);
          }
        }
      }
    }

    // 绘制粒子
    if (!this.particles.length) return;

    ctx.save();

    for (const p of this.particles) {
      // 根据粒子的混合模式动态设置
      ctx.globalCompositeOperation = p.blendMode || 'source-over';
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      
      // 判断形状类型
      if (p.shape === 'circle') {
        // === 圆形渲染：用于血雾和死亡烟雾 ===
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
      } else if (p.stretch) {
        // === 拉伸线条渲染：细长液体喷射效果 ===
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const speedSq = speed * speed;
        
        // 只有速度足够快时才拉伸
        if (speedSq > 0.0001 && p.width < p.size) {
          ctx.save();
          
          // 移动到粒子位置
          ctx.translate(p.x, p.y);
          
          // 根据速度方向旋转画布
          const angle = Math.atan2(p.vy, p.vx);
          ctx.rotate(angle);
          
          // 计算线条长度：基础长度 + 速度拉伸
          const length = p.size + speed * (p.stretchFactor || 8);
          
          // 绘制细长线条（从原点向右延伸）
          // 线条宽度由 p.width 控制（1px 或 2px），这是产生"液体感"的关键
          const halfWidth = (p.width || 1) / 2;
          ctx.fillRect(0, -halfWidth, length, p.width || 1);
          
          ctx.restore();
        } else {
          // 速度太慢，不拉伸，绘制小方块或圆形
          if (p.width < p.size) {
            // 细线不拉伸时画小点
            const half = p.width / 2;
            ctx.fillRect(p.x - half, p.y - half, p.width, p.width);
          } else {
            // 使用 size 画方块
            const half = p.size / 2;
            ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
          }
        }
        
      } else {
        // === 兜底：普通方块渲染（用于金币等）===
        const half = (p.width || p.size) / 2;
        ctx.fillRect(p.x - half, p.y - half, p.width || p.size, p.width || p.size);
      }
    }

    ctx.restore();
  }
}
