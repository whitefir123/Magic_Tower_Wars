/**
 * NPCAnimator - NPC精灵图动画管理器
 * 
 * 管理铁匠NPC的精灵图动画播放
 */

// 动画帧配置（2行3列精灵图）
const BLACKSMITH_ANIMATION_FRAMES = {
  IDLE_1: [0, 1, 0, 1],         // 第1行待机动画：前2帧循环
  IDLE_2: [3, 4, 3, 4]          // 第2行待机动画：前2帧循环
};

export class NPCAnimator {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.canvas = npcRenderer.npcElement.querySelector('.npc-sprite');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.spriteImage = null;
    this.currentFrame = 0;
    this.animationInterval = null;
    this.currentAnimation = 'IDLE_1';
    this.isLoaded = false;
    this._debugLogged = false;
    this.loopCount = 0; // 记录循环次数
    
    // 不在构造函数中加载精灵图，由外部调用 loadSprite()
  }

  /**
   * 加载精灵图
   */
  async loadSprite() {
    const spriteManager = this.npcRenderer.forgeUI.spriteManager;
    
    if (!spriteManager) {
      console.warn('SpriteManager未初始化');
      this.renderFallback();
      return;
    }
    
    try {
      // 等待精灵图加载完成
      this.spriteImage = await spriteManager.loadSpriteSheet('blacksmith');
      
      if (this.spriteImage && this.spriteImage.complete) {
        this.isLoaded = true;
        console.log('✓ 铁匠NPC精灵图已加载');
        this.renderFrame(); // 加载完成后立即渲染
      } else {
        console.warn('铁匠NPC精灵图加载失败');
        this.renderFallback();
      }
    } catch (error) {
      console.error('✗ 铁匠NPC精灵图加载失败:', error);
      this.renderFallback();
    }
  }

  /**
   * 开始动画
   * @param {string} animationType - 动画类型 ('IDLE_1', 'IDLE_2')
   */
  startAnimation(animationType) {
    // 停止当前动画
    this.stopAnimation();
    
    // 验证动画类型
    if (!BLACKSMITH_ANIMATION_FRAMES[animationType]) {
      console.warn(`未知的动画类型: ${animationType}`);
      animationType = 'IDLE_1';
    }
    
    this.currentAnimation = animationType;
    this.currentFrame = 0;
    this.loopCount = 0;
    
    const frames = BLACKSMITH_ANIMATION_FRAMES[animationType];
    if (!frames || frames.length === 0) {
      console.warn(`动画 ${animationType} 没有帧数据`);
      return;
    }
    
    // 帧延迟
    const frameDelay = 500;
    
    // 立即渲染第一帧
    this.renderFrame();
    
    // 启动动画循环
    this.animationInterval = setInterval(() => {
      this.currentFrame++;
      
      // 检查是否完成一次循环
      if (this.currentFrame >= frames.length) {
        this.currentFrame = 0;
        this.loopCount++;
        
        // 根据当前动画决定切换逻辑
        if (this.currentAnimation === 'IDLE_1') {
          // 第一行动画：10%概率切换到第二行
          if (Math.random() < 0.1) {
            console.log(`[NPC] 切换动画: IDLE_1 -> IDLE_2`);
            this.stopAnimation();
            this.startAnimation('IDLE_2');
            return;
          }
        } else if (this.currentAnimation === 'IDLE_2') {
          // 第二行动画：100%返回第一行
          console.log(`[NPC] 切换动画: IDLE_2 -> IDLE_1`);
          this.stopAnimation();
          this.startAnimation('IDLE_1');
          return;
        }
      }
      
      this.renderFrame();
    }, frameDelay);
  }

  /**
   * 停止动画
   */
  stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  /**
   * 渲染当前帧
   */
  renderFrame() {
    if (!this.ctx) {
      console.warn('Canvas上下文未初始化');
      return;
    }
    
    // 如果精灵图未加载，使用回退方案
    if (!this.isLoaded || !this.spriteImage || !this.spriteImage.complete) {
      this.renderFallback();
      return;
    }
    
    const frames = BLACKSMITH_ANIMATION_FRAMES[this.currentAnimation];
    const frameIndex = frames[this.currentFrame];
    
    // 计算精灵图位置（2行3列）
    const row = Math.floor(frameIndex / 3);
    const col = frameIndex % 3;
    
    const cellW = this.spriteImage.width / 3;
    const cellH = this.spriteImage.height / 2;
    
    const sx = col * cellW;
    const sy = row * cellH;
    
    // 调试日志（首次渲染时输出）
    if (this.currentFrame === 0 && !this._debugLogged) {
      console.log('NPC精灵图信息:', {
        imageSize: `${this.spriteImage.width}x${this.spriteImage.height}`,
        cellSize: `${cellW}x${cellH}`,
        canvasSize: `${this.canvas.width}x${this.canvas.height}`,
        animation: this.currentAnimation,
        frameIndex: frameIndex,
        position: `row=${row}, col=${col}`,
        sourceRect: `(${sx}, ${sy}, ${cellW}, ${cellH})`
      });
      this._debugLogged = true;
    }
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 禁用图像平滑以保持像素风格
    this.ctx.imageSmoothingEnabled = false;
    
    // 绘制当前帧
    try {
      this.ctx.drawImage(
        this.spriteImage,
        sx, sy, cellW, cellH,
        0, 0, this.canvas.width, this.canvas.height
      );
    } catch (error) {
      console.error('渲染NPC帧失败:', error);
      this.renderFallback();
    }
  }

  /**
   * 渲染回退图标（当精灵图不可用时）
   */
  renderFallback() {
    if (!this.ctx) return;
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制简单的占位符
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#d4af37';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('NPC', this.canvas.width / 2, this.canvas.height / 2);
  }

  /**
   * 获取当前动画类型
   * @returns {string} 当前动画类型
   */
  getCurrentAnimation() {
    return this.currentAnimation;
  }

  /**
   * 检查动画是否正在播放
   * @returns {boolean} 是否正在播放
   */
  isPlaying() {
    return this.animationInterval !== null;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stopAnimation();
    this.spriteImage = null;
    this.ctx = null;
    this.canvas = null;
  }
}
