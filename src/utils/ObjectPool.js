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
    const alive = [];
    
    for (const obj of objects) {
      if (isDeadFn(obj)) {
        this.release(obj);
      } else {
        alive.push(obj);
      }
    }
    
    return alive;
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
      },
      
      // 初始化方法
      init(x, y, text, color, icon = null, iconSize = 16) {
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
        
        // 如果有图标URL，预加载图片
        if (icon && !this.iconImage) {
          this.iconImage = new Image();
          this.iconImage.src = icon;
        } else if (!icon) {
          this.iconImage = null;
        }
      },
      
      // 更新方法
      update(dt) {
        this.life -= dt;
        this.y -= this.velocityY * dt;
        this.alpha = Math.max(0, this.life / 800);
        this.scale = 1 + (1 - this.alpha) * 0.1;
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
        let textY = this.y;
        
        // 如果有图标，先绘制图标
        if (this.icon && this.iconImage && this.iconImage.complete) {
          const iconSize = this.iconSize * this.scale;
          const iconX = centerX - iconSize / 2;
          const iconY = textY - iconSize / 2;
          
          // 绘制图标阴影
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.drawImage(this.iconImage, iconX, iconY, iconSize, iconSize);
          
          // 文本位置下移，显示在图标下方
          textY += iconSize / 2 + 10;
        }
        
        // 绘制文本
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText(this.text, centerX, textY);
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
   * @returns {Object} 飘字对象
   */
  create(x, y, text, color, icon = null, iconSize = 16) {
    const floatingText = this.acquire();
    floatingText.init(x, y, text, color, icon, iconSize);
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
          const speed = 0.55;
          this.velocity.x = Math.cos(windAngle) * speed;
          this.velocity.y = Math.sin(windAngle) * speed;
        } else {
          const dx = this.x - playerX;
          const dy = this.y - playerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 0.55;
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

