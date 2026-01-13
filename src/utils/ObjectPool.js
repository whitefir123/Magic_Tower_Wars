// ObjectPool.js - 对象池系统
// 用于复用频繁创建和销毁的对象，减少垃圾回收压力，提升性能

/**
 * 通用对象池
 * 用于管理可复用对象的创建、获取和回收
 */
export class ObjectPool {
  /**
   * @param {Function} factory - 对象工厂函数，用于创建新对象
   * @param {number} initialSize - 初始池大小
   * @param {number} maxSize - 最大池大小（0表示无限制）
   */
  constructor(factory, initialSize = 10, maxSize = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.pool = [];
    this.activeObjects = new Set();
    
    // 预分配初始对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
    
    console.log(`[ObjectPool] 初始化对象池，初始大小：${initialSize}，最大：${maxSize}`);
  }
  
  /**
   * 从池中获取一个对象
   * @returns {Object} 池对象
   */
  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      // 从池中取出一个对象
      obj = this.pool.pop();
    } else {
      // 池为空，创建新对象
      obj = this.factory();
    }
    
    this.activeObjects.add(obj);
    return obj;
  }
  
  /**
   * 将对象归还到池中
   * @param {Object} obj - 要归还的对象
   */
  release(obj) {
    if (!this.activeObjects.has(obj)) {
      return; // 对象不属于此池
    }
    
    this.activeObjects.delete(obj);
    
    // 检查池大小限制
    if (this.maxSize === 0 || this.pool.length < this.maxSize) {
      // 重置对象状态（如果对象有reset方法）
      if (obj.reset && typeof obj.reset === 'function') {
        obj.reset();
      }
      
      this.pool.push(obj);
    }
    // 如果池已满，则丢弃对象（让GC回收）
  }
  
  /**
   * 批量回收已死亡的对象
   * @param {Array} objects - 对象数组
   * @param {Function} isDeadFn - 判断对象是否死亡的函数
   * @returns {Array} 存活的对象数组
   */
  releaseDeadObjects(objects, isDeadFn) {
    // 从后向前遍历，原地移除死亡对象，避免创建新数组
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (isDeadFn(obj)) {
        this.release(obj);
        objects.splice(i, 1);
      }
    }
    
    return objects;
  }
  
  /**
   * 清空池并重置
   */
  clear() {
    this.pool = [];
    this.activeObjects.clear();
    console.log('[ObjectPool] 对象池已清空');
  }
  
  /**
   * 获取池的统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.activeObjects.size,
      totalCreated: this.pool.length + this.activeObjects.size
    };
  }
}

/**
 * FloatingText 对象池
 * 专门用于管理飘字对象
 */
export class FloatingTextPool extends ObjectPool {
  constructor(initialSize = 20, maxSize = 100) {
    // FloatingText 工厂函数
    const factory = () => ({
      x: 0,
      y: 0,
      text: '',
      color: '#fff',
      life: 800,
      alpha: 1,
      velocityY: 0.05,
      scale: 1,
      icon: null,          // 图标URL（可选）
      iconSize: 16,        // 图标尺寸
      iconImage: null,     // 缓存的图像对象
      type: 'NORMAL',      // 飘字类型：'NORMAL' 或 'CRIT'
      age: 0,              // 已存活时间（毫秒）
      startX: 0,           // 初始X坐标（用于计算震动偏移）
      
      // 重置方法
      reset() {
        this.x = 0;
        this.y = 0;
        this.text = '';
        this.color = '#fff';
        this.life = 800;
        this.alpha = 1;
        this.velocityY = 0.05;
        this.scale = 1;
        this.icon = null;
        this.iconSize = 16;
        this.iconImage = null;
        this.type = 'NORMAL';
        this.age = 0;
        this.startX = 0;
      },
      
      // 初始化方法
      init(x, y, text, color, icon = null, iconSize = 16, type = 'NORMAL') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color || '#fff';
        this.life = 800;
        this.alpha = 1;
        this.velocityY = 0.05;
        this.scale = 1;
        this.icon = icon;
        this.iconSize = iconSize;
        this.type = type;
        this.age = 0;
        this.startX = x;
        
        // 如果有图标URL（字符串），预加载图片
        // 如果是数字索引，不需要预加载，draw方法中会从精灵图获取
        if (icon && typeof icon === 'string' && !this.iconImage) {
          this.iconImage = new Image();
          this.iconImage.src = icon;
        } else if (!icon || typeof icon === 'number') {
          // 数字索引或没有图标时，清空缓存的图像对象
          this.iconImage = null;
        }
      },
      
      // 更新方法
      update(dt) {
        this.life -= dt;
        this.age += dt;
        
        // 先计算 alpha（普通飘字需要用到）
        this.alpha = Math.max(0, this.life / 800);
        
        if (this.type === 'CRIT') {
          // 暴击飘字的特殊动画逻辑：弹性放大 + 平滑上浮
          
          // 缩放逻辑
          if (this.age < 150) {
            // 阶段1 (爆发)：0-150ms，从 1.0x 快速增长到 2.2x
            const progress = this.age / 150;
            this.scale = 1.0 + (2.2 - 1.0) * progress;
          } else if (this.age < 300) {
            // 阶段2 (回弹)：150-300ms，从 2.2x 平滑回缩到 1.5x
            const progress = (this.age - 150) / 150;
            this.scale = 2.2 + (1.5 - 2.2) * progress;
          } else {
            // 阶段3 (悬停与消散)：300ms 后，锁定在 1.5x
            this.scale = 1.5;
          }
          
          // 位移逻辑
          if (this.age < 150) {
            // 阶段1：快速上浮
            this.y -= this.velocityY * 3 * dt;
          } else if (this.age < 300) {
            // 阶段2：上浮速度减缓
            const progress = (this.age - 150) / 150;
            const velocity = 3 + (1 - 3) * progress; // 从3倍速度过渡到1倍速度
            this.y -= this.velocityY * velocity * dt;
          } else {
            // 阶段3：缓慢上浮
            this.y -= this.velocityY * dt;
          }
          
          // X轴：始终保持初始位置，不添加任何偏移
          this.x = this.startX;
        } else {
          // 普通飘字的原有逻辑
          this.y -= this.velocityY * dt;
          this.scale = 1 + (1 - this.alpha) * 0.1;
        }
      },
      
      // 判断是否死亡
      isDead() {
        return this.life <= 0;
      },
      
      // 绘制方法
      draw(ctx, TILE_SIZE) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        const centerX = this.x + TILE_SIZE / 2;
        const textY = this.y;
        
        // 检查是否有图标（数字索引或URL）
        let iconImage = null;
        let iconIndex = null;
        let iconSpacing = 4; // 图标和文本之间的间距
        
        if (typeof this.icon === 'number') {
          // 数字索引：从 SPRITE_STATUS_ICONS 精灵图中获取
          iconIndex = this.icon;
          const game = window.game;
          const loader = (game && game.loader) || window.ResourceManager;
          if (loader && loader.getImage) {
            iconImage = loader.getImage('SPRITE_STATUS_ICONS');
          }
        } else if (this.icon && typeof this.icon === 'string') {
          // URL字符串：使用缓存的图像对象
          iconImage = this.iconImage;
        }
        
        // 测量文本宽度（用于居中计算）
        ctx.fillStyle = this.color;
        ctx.textAlign = 'left'; // 临时设置为left以测量文本宽度
        ctx.textBaseline = 'middle';
        
        if (this.type === 'CRIT') {
          // 暴击飘字样式：深红色，基于scale动态调整字体大小，暗红色硬阴影
          const baseFontSize = 12; // 基础字体大小（调小）
          const fontSize = baseFontSize * this.scale;
          ctx.font = `bold ${fontSize}px Cinzel, serif`;
        } else {
          // 普通飘字样式
          ctx.font = 'bold 16px Cinzel, serif';
        }
        
        const textMetrics = ctx.measureText(this.text);
        const textWidth = textMetrics.width;
        
        // 计算图标尺寸和位置
        let iconWidth = 0;
        let iconHeight = 0;
        let iconX = 0;
        let iconY = 0;
        
        if (iconImage && iconImage.complete && iconImage.naturalWidth > 0) {
          if (typeof iconIndex === 'number') {
            // 从精灵图中切片
            const gridCols = 3; // 3x3网格
            const gridRows = 3;
            const cellW = iconImage.naturalWidth / gridCols;
            const cellH = iconImage.naturalHeight / gridRows;
            const col = iconIndex % 3;
            const row = Math.floor(iconIndex / 3);
            const sx = col * cellW;
            const sy = row * cellH;
            
            // 图标绘制尺寸
            iconWidth = this.iconSize;
            iconHeight = this.iconSize;
            
            // 计算整体宽度（图标 + 间距 + 文本）
            const totalWidth = iconWidth + iconSpacing + textWidth;
            
            // 计算起始位置（使整体居中）
            const startX = centerX - totalWidth / 2;
            iconX = startX;
            iconY = textY - iconHeight / 2;
            
            // 绘制图标切片
            ctx.drawImage(
              iconImage,
              sx, sy, cellW, cellH,
              iconX, iconY, iconWidth, iconHeight
            );
          } else if (iconImage) {
            // URL图像：直接绘制
            iconWidth = this.iconSize;
            iconHeight = this.iconSize;
            
            // 计算整体宽度（图标 + 间距 + 文本）
            const totalWidth = iconWidth + iconSpacing + textWidth;
            
            // 计算起始位置（使整体居中）
            const startX = centerX - totalWidth / 2;
            iconX = startX;
            iconY = textY - iconHeight / 2;
            
            ctx.drawImage(iconImage, iconX, iconY, iconWidth, iconHeight);
          }
        }
        
        // 绘制文本
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        if (this.type === 'CRIT') {
          // 暴击飘字样式：深红色，基于scale动态调整字体大小，暗红色硬阴影
          const baseFontSize = 12; // 基础字体大小（调小）
          const fontSize = baseFontSize * this.scale;
          ctx.font = `bold ${fontSize}px Cinzel, serif`;
          ctx.shadowColor = '#8B0000'; // 暗红色阴影
          ctx.shadowBlur = 0; // 硬阴影，不带模糊
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        } else {
          // 普通飘字样式
          ctx.font = 'bold 16px Cinzel, serif';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
        
        // 计算文本X位置（如果有图标，文本在图标右侧）
        const textX = iconWidth > 0 ? iconX + iconWidth + iconSpacing : centerX;
        
        ctx.fillText(this.text, textX, textY);
        ctx.restore();
      }
    });
    
    super(factory, initialSize, maxSize);
  }
  
  /**
   * 创建一个飘字对象
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} text - 文本内容
   * @param {string} color - 颜色
   * @param {string} icon - 图标URL（可选）
   * @param {number} iconSize - 图标尺寸（可选）
   * @param {string} type - 飘字类型：'NORMAL' 或 'CRIT'（可选，默认为 'NORMAL'）
   * @returns {Object} 飘字对象
   */
  create(x, y, text, color, icon = null, iconSize = 16, type = 'NORMAL') {
    const floatingText = this.acquire();
    floatingText.init(x, y, text, color, icon, iconSize, type);
    return floatingText;
  }
}

/**
 * FogParticle 对象池
 * 专门用于管理迷雾粒子对象
 */
export class FogParticlePool extends ObjectPool {
  constructor(initialSize = 50, maxSize = 500) {
    // FogParticle 工厂函数
    const factory = () => ({
      x: 0,
      y: 0,
      tileX: 0,
      tileY: 0,
      rotation: 0,
      scale: 10.0,
      alpha: 1.0,
      isDispersing: false,
      velocity: { x: 0, y: 0 },
      disperseTime: 0,
      disperseDuration: 600,
      
      // 重置方法
      reset() {
        this.x = 0;
        this.y = 0;
        this.tileX = 0;
        this.tileY = 0;
        this.rotation = 0;
        this.scale = 10.0;
        this.alpha = 1.0;
        this.isDispersing = false;
        this.velocity = { x: 0, y: 0 };
        this.disperseTime = 0;
        this.disperseDuration = 600;
      },
      
      // 初始化方法
      init(x, y, tileX, tileY) {
        this.x = x;
        this.y = y;
        this.tileX = tileX;
        this.tileY = tileY;
        this.rotation = Math.random() * Math.PI * 2;
        this.scale = 10.0 + Math.random() * 4.0;
        this.alpha = 1.0;
        this.isDispersing = false;
        this.velocity = { x: 0, y: 0 };
        this.disperseTime = 0;
        this.disperseDuration = 600;
      },
      
      // 更新方法
      update(dt) {
        if (this.isDispersing) {
          this.disperseTime += dt;
          const progress = Math.min(1, this.disperseTime / this.disperseDuration);
          
          this.x += this.velocity.x * dt;
          this.y += this.velocity.y * dt;
          this.alpha = Math.max(0, 1.0 - progress);
          this.scale += 0.2 * (dt / this.disperseDuration);
        }
      },
      
      // 触发消散
      triggerDispersal(playerX, playerY, windAngle = null) {
        this.isDispersing = true;
        
        if (windAngle !== null) {
          const speed = 0.8;
          this.velocity.x = Math.cos(windAngle) * speed;
          this.velocity.y = Math.sin(windAngle) * speed;
        } else {
          const dx = this.x - playerX;
          const dy = this.y - playerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 0.8;
          if (dist > 0) {
            this.velocity.x = (dx / dist) * speed;
            this.velocity.y = (dy / dist) * speed;
          } else {
            const angle = Math.random() * Math.PI * 2;
            this.velocity.x = Math.cos(angle) * speed;
            this.velocity.y = Math.sin(angle) * speed;
          }
        }
      },
      
      // 判断是否死亡
      isDead() {
        return this.isDispersing && this.alpha <= 0;
      },
      
      // 绘制方法
      draw(ctx, fogImage, TILE_SIZE) {
        if (!fogImage) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        const scaledSize = TILE_SIZE * this.scale;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(fogImage, -scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
        
        ctx.restore();
      }
    });
    
    super(factory, initialSize, maxSize);
  }
  
  /**
   * 创建一个迷雾粒子对象
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} tileX - 瓦片X坐标
   * @param {number} tileY - 瓦片Y坐标
   * @returns {Object} 迷雾粒子对象
   */
  create(x, y, tileX, tileY) {
    const particle = this.acquire();
    particle.init(x, y, tileX, tileY);
    return particle;
  }
}

