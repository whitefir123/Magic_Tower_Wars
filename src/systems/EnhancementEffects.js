/**
 * EnhancementEffects.js
 * 铁匠铺强化特效系统
 * 
 * 管理装备强化成功/失败的视觉特效动画
 * 特效精灵图布局：2行4列，共8帧
 */

export class EnhancementEffects {
  constructor(game) {
    this.game = game;
    this.loader = game.loader;
    this.activeEffects = [];
    
    // 特效配置
    this.config = {
      SUCCESS: {
        frames: 8,
        rows: 2,
        cols: 4,
        duration: 600, // 毫秒
        scale: 1.5,
        description: '金色闪光特效'
      },
      FAILURE: {
        frames: 8,
        rows: 2,
        cols: 4,
        duration: 400, // 毫秒
        scale: 1.2,
        description: '红色烟雾特效'
      }
    };
    
    console.log('✓ EnhancementEffects 已初始化');
  }
  
  /**
   * 播放强化成功特效
   * @param {number} x - X坐标（屏幕中心）
   * @param {number} y - Y坐标（屏幕中心）
   */
  playSuccessEffect(x, y) {
    const effectImg = this.loader.getImage('FORGE_SUCCESS_EFFECT');
    if (!effectImg || !effectImg.complete) {
      console.warn('[EnhancementEffects] 成功特效图片未加载');
      return;
    }
    
    const config = this.config.SUCCESS;
    
    // 创建特效对象
    const effect = {
      type: 'enhance_success',
      x: x,
      y: y,
      frame: 0,
      maxFrames: config.frames,
      rows: config.rows,
      cols: config.cols,
      frameWidth: Math.floor(effectImg.width / config.cols),
      frameHeight: Math.floor(effectImg.height / config.rows),
      image: effectImg,
      scale: config.scale,
      alpha: 1.0,
      duration: config.duration,
      startTime: Date.now()
    };
    
    this.activeEffects.push(effect);
    console.log('[EnhancementEffects] 播放成功特效');
  }
  
  /**
   * 播放强化失败特效
   * @param {number} x - X坐标（屏幕中心）
   * @param {number} y - Y坐标（屏幕中心）
   */
  playFailureEffect(x, y) {
    const effectImg = this.loader.getImage('FORGE_FAILURE_EFFECT');
    if (!effectImg || !effectImg.complete) {
      console.warn('[EnhancementEffects] 失败特效图片未加载');
      return;
    }
    
    const config = this.config.FAILURE;
    
    // 创建特效对象
    const effect = {
      type: 'enhance_failure',
      x: x,
      y: y,
      frame: 0,
      maxFrames: config.frames,
      rows: config.rows,
      cols: config.cols,
      frameWidth: Math.floor(effectImg.width / config.cols),
      frameHeight: Math.floor(effectImg.height / config.rows),
      image: effectImg,
      scale: config.scale,
      alpha: 1.0,
      duration: config.duration,
      startTime: Date.now()
    };
    
    this.activeEffects.push(effect);
    console.log('[EnhancementEffects] 播放失败特效');
  }
  
  /**
   * 更新和渲染所有活动特效
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  update(ctx) {
    if (!ctx || this.activeEffects.length === 0) return;
    
    const now = Date.now();
    
    // 过滤并更新特效
    this.activeEffects = this.activeEffects.filter(effect => {
      const elapsed = now - effect.startTime;
      const progress = elapsed / effect.duration;
      
      // 特效已完成
      if (progress >= 1.0) {
        return false;
      }
      
      // 计算当前帧（精灵图布局：2行4列）
      const frameIndex = Math.floor(progress * effect.maxFrames);
      const row = Math.floor(frameIndex / effect.cols);
      const col = frameIndex % effect.cols;
      
      // 计算源矩形
      const sx = col * effect.frameWidth;
      const sy = row * effect.frameHeight;
      const sw = effect.frameWidth;
      const sh = effect.frameHeight;
      
      // 计算淡出效果
      effect.alpha = 1.0 - (progress * 0.5); // 后半段开始淡出
      
      // 计算目标矩形（居中显示）
      const drawW = sw * effect.scale;
      const drawH = sh * effect.scale;
      const drawX = effect.x - drawW / 2;
      const drawY = effect.y - drawH / 2;
      
      // 渲染特效
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.imageSmoothingEnabled = false; // 保持像素艺术风格
      
      try {
        ctx.drawImage(effect.image, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      } catch (error) {
        console.error('[EnhancementEffects] 渲染特效失败:', error);
      }
      
      ctx.restore();
      
      return true; // 保留未完成的特效
    });
  }
  
  /**
   * 清除所有活动特效
   */
  clear() {
    this.activeEffects = [];
  }
  
  /**
   * 获取活动特效数量
   * @returns {number} 活动特效数量
   */
  getActiveCount() {
    return this.activeEffects.length;
  }
}

export default EnhancementEffects;
