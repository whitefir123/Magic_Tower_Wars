/**
 * MenuVisuals - 主菜单沉浸式视觉特效系统
 * 
 * 功能：
 * 1. 余烬火星粒子效果
 * 2. 动态暗角遮罩（由 CSS 处理）
 */

export class MenuVisuals {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.menuContainer = null;
    this.menuBg = null;
    this.vignette = null;
    
    // 动画循环控制
    this.animationId = null;
    this.isRunning = false;
    this.lastTime = 0;
    this.totalTime = 0; // 总时间（用于湍流效果计算）
    
    // 粒子系统
    this.embers = []; // 火星粒子
    this.emberCount = 40; // 火星数量
  }

  /**
   * 初始化菜单视觉特效
   */
  init() {
    // 获取 DOM 元素
    this.menuContainer = document.getElementById('main-menu');
    
    if (!this.menuContainer) {
      // 静默处理：主菜单元素不存在是正常情况（例如在游戏内时）
      return false;
    }
    
    this.menuBg = this.menuContainer.querySelector('.menu-bg');
    this.canvas = document.getElementById('menu-vfx-canvas');
    this.vignette = this.menuContainer.querySelector('.menu-vignette');
    
    if (!this.canvas || !this.menuBg || !this.vignette) {
      console.warn('[MenuVisuals] 缺少必要的 DOM 元素（canvas, menu-bg, vignette），视觉特效将不会启动');
      console.warn('[MenuVisuals] canvas:', !!this.canvas, 'menuBg:', !!this.menuBg, 'vignette:', !!this.vignette);
      return false;
    }
    
    // 设置 Canvas 尺寸
    this.resizeCanvas();
    
    // 初始化粒子系统
    this.initParticles();
    
    // 绑定事件
    this.bindEvents();
    
    console.log('[MenuVisuals] 初始化完成');
    return true;
  }

  /**
   * 调整 Canvas 尺寸（处理窗口大小变化）
   */
  resizeCanvas() {
    if (!this.canvas) return;
    
    const rect = this.menuContainer.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // 设置 canvas 样式尺寸（CSS 像素）
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  /**
   * 初始化粒子系统（全域分布优化版）
   */
  initParticles() {
    // 清空现有粒子
    this.embers = [];
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 初始化火星粒子（增强版 - 全屏分布，确保初始画面不空）
    for (let i = 0; i < this.emberCount; i++) {
      this.embers.push({
        x: Math.random() * width,
        y: Math.random() * height, // 全屏分布：y 坐标在 0 到 height 之间随机
        vx: (Math.random() - 0.5) * 1,
        vy: -0.5 - Math.random() * 1,
        size: 2 + Math.random() * 3,
        opacity: 0.6 + Math.random() * 0.4,
        // 生命周期系统
        life: 0,
        maxLife: 2.5 + Math.random() * 2, // 2.5 ~ 4.5 秒寿命
        // 湍流效果参数
        swayFreq: 1 + Math.random(), // 摇摆频率 1 ~ 2
        swayAmp: 15 + Math.random() * 15, // 摇摆幅度 15 ~ 30
        phase: Math.random() * Math.PI * 2 // 初始相位偏移 0 ~ PI*2
      });
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 窗口大小变化事件
    window.addEventListener('resize', () => {
      if (this.isRunning) {
        this.resizeCanvas();
        // 重新初始化粒子位置（保持数量）
        const emberCount = this.embers.length;
        this.emberCount = emberCount;
        this.initParticles();
      }
    });
  }

  /**
   * 开始渲染循环
   */
  start() {
    if (this.isRunning) {
      console.log('[MenuVisuals] 渲染循环已在运行中，跳过启动');
      return;
    }
    
    // 如果未初始化，尝试初始化
    if (!this.canvas || !this.menuContainer || !this.menuBg || !this.vignette) {
      console.log('[MenuVisuals] 检测到未初始化，尝试初始化...');
      if (!this.init()) {
        console.warn('[MenuVisuals] 初始化失败，无法启动渲染循环');
        return;
      }
    }
    
    // 确保 Canvas context 已获取
    if (!this.ctx) {
      this.ctx = this.canvas?.getContext('2d');
      if (!this.ctx) {
        console.warn('[MenuVisuals] Canvas context 获取失败');
        return;
      }
    }
    
    // 确保 Canvas 尺寸正确
    this.resizeCanvas();
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationLoop();
    
    console.log('[MenuVisuals] 渲染循环已启动');
  }

  /**
   * 停止渲染循环
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('[MenuVisuals] 渲染循环已停止');
  }

  /**
   * 主渲染循环
   */
  animationLoop() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000; // 转换为秒
    this.lastTime = currentTime;
    
    // 更新总时间（用于湍流效果）
    this.totalTime += dt;
    
    // 限制 dt 以避免大幅跳跃
    const clampedDt = Math.min(dt, 0.1);
    
    // 更新系统
    this.update(clampedDt);
    
    // 绘制
    this.draw();
    
    // 继续循环
    this.animationId = requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * 重置粒子（重生策略：80%从底部，20%从中下部）
   */
  resetParticle(particle, width, height) {
    particle.life = 0;
    particle.maxLife = 2.5 + Math.random() * 2; // 2.5 ~ 4.5 秒寿命
    particle.x = Math.random() * width;
    particle.vx = (Math.random() - 0.5) * 1;
    particle.vy = -0.5 - Math.random() * 1;
    particle.size = 2 + Math.random() * 3;
    particle.opacity = 0.6 + Math.random() * 0.4;
    particle.swayFreq = 1 + Math.random(); // 1 ~ 2
    particle.swayAmp = 15 + Math.random() * 15; // 15 ~ 30
    particle.phase = Math.random() * Math.PI * 2;
    
    // 重生策略：80%从底部，20%从中下部
    if (Math.random() < 0.8) {
      // 80% 概率：从最底部升起
      particle.y = height + particle.size;
    } else {
      // 20% 概率：从屏幕中下部出现（填补视觉空缺）
      const lowerRegionStart = height * 0.4;
      particle.y = lowerRegionStart + Math.random() * (height - lowerRegionStart);
    }
  }

  /**
   * 更新系统状态（优化的全域余烬效果）
   */
  update(dt) {
    if (!this.canvas || !this.ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 更新火星粒子
    for (let particle of this.embers) {
      // 生命周期管理
      particle.life += dt;
      
      // 如果粒子生命周期结束，重置粒子（应用重生策略）
      if (particle.life > particle.maxLife) {
        this.resetParticle(particle, width, height);
        continue;
      }
      
      // 湍流效果：计算 x 轴偏移量（模拟热气流扰动）
      const offset = Math.sin(this.totalTime * particle.swayFreq + particle.phase) * particle.swayAmp * dt;
      particle.x += offset;
      
      // 基础移动逻辑（y 轴上升）
      particle.x += particle.vx * dt * 40;
      particle.y += particle.vy * dt * 40;
      
      // 边界处理：应用重生策略
      if (particle.y < -particle.size) {
        this.resetParticle(particle, width, height);
        continue;
      }
      
      // 水平边界处理（循环）
      if (particle.x < -particle.size * 2) {
        particle.x = width + particle.size * 2;
      } else if (particle.x > width + particle.size * 2) {
        particle.x = -particle.size * 2;
      }
      
      // 随机速度变化（增加动态感）
      particle.vx += (Math.random() - 0.5) * 0.2 * dt;
      particle.vx = Math.max(-2, Math.min(2, particle.vx));
    }
  }

  /**
   * 绘制所有粒子（热力学渲染逻辑）
   */
  draw() {
    if (!this.canvas || !this.ctx) return;
    
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 清空画布（完全清空以确保清晰的粒子效果）
    ctx.clearRect(0, 0, width, height);
    
    // 绘制火星粒子
    ctx.globalCompositeOperation = 'lighter'; // 使用更亮的混合模式以获得发光感
    
    for (let particle of this.embers) {
      // 边界检查
      if (particle.x < -particle.size * 2 || particle.x > width + particle.size * 2 ||
          particle.y < -particle.size * 2 || particle.y > height + particle.size * 2) {
        continue;
      }
      
      // 计算生命周期进度（0.0 到 1.0）
      const lifeProgress = particle.life / particle.maxLife;
      
      // 根据生命周期计算颜色（热力学渐变）
      let r, g, b, alpha;
      
      if (lifeProgress <= 0.2) {
        // 0% - 20% (新生阶段): 高亮金黄 255, 240, 150
        r = 255;
        g = 240;
        b = 150;
        alpha = particle.opacity;
      } else if (lifeProgress <= 0.6) {
        // 20% - 60% (燃烧阶段): 橙红 255, 100, 50
        // 从金黄到橙红的平滑过渡
        const t = (lifeProgress - 0.2) / 0.4; // 0.0 到 1.0
        r = 255;
        g = Math.round(240 * (1 - t) + 100 * t);
        b = Math.round(150 * (1 - t) + 50 * t);
        alpha = particle.opacity;
      } else {
        // 60% - 100% (冷却阶段): 暗红/灰烬 150, 50, 50，alpha 逐渐归零
        const t = (lifeProgress - 0.6) / 0.4; // 0.0 到 1.0
        r = Math.round(255 * (1 - t) + 150 * t);
        g = Math.round(100 * (1 - t) + 50 * t);
        b = Math.round(50 * (1 - t) + 50 * t);
        alpha = particle.opacity * (1 - t); // alpha 逐渐归零
      }
      
      // 应用基础透明度
      ctx.globalAlpha = alpha;
      
      // 绘制火星（带有径向渐变效果）
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      
      // 中心最亮，边缘透明
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 重置混合模式和透明度
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
}
