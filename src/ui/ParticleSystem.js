// ParticleSystem.js - 粒子系统
// 使用对象池管理粒子效果，提供高性能的视觉效果渲染

/**
 * ParticleSystem - 轻量级粒子系统
 * 使用对象池来最小化内存分配和垃圾回收
 * 支持多种粒子类型：dust（尘埃）、explosion（爆炸）、coin（金币）、sparkle（闪光）
 */
export class ParticleSystem {
  constructor(containerElement) {
    this.container = containerElement;
    this.particles = []; // 活动粒子数组
    this.pool = []; // 粒子对象池
    this.maxParticles = 100; // 最大粒子数量
    this.animationFrame = null;
    this.isRunning = false;
    this.lastUpdateTime = 0;
    
    // 粒子类型配置
    this.particleConfig = {
      dust: {
        size: 3,
        lifetime: 3000,
        gravity: 0.02,
        friction: 0.98,
        color: 'rgba(255, 215, 0, 0.6)'
      },
      explosion: {
        size: 6,
        lifetime: 1500,
        gravity: 0.1,
        friction: 0.95,
        color: 'rgba(160, 53, 238, 0.8)'
      },
      coin: {
        size: 12,
        lifetime: 2000,
        gravity: 0.3,
        friction: 0.98,
        color: 'rgba(255, 215, 0, 1)'
      },
      sparkle: {
        size: 4,
        lifetime: 1000,
        gravity: -0.05,
        friction: 0.96,
        color: 'rgba(255, 128, 0, 0.9)'
      }
    };
  }

  /**
   * 发射粒子
   * @param {Object} config - 粒子配置
   * @param {number} config.x - 发射位置 X
   * @param {number} config.y - 发射位置 Y
   * @param {number} config.count - 粒子数量
   * @param {string} config.type - 粒子类型 ('dust', 'explosion', 'coin', 'sparkle')
   * @param {Object} config.velocity - 初始速度 {x, y}
   * @param {number} config.velocityVariance - 速度随机方差
   * @param {number} config.lifetime - 生命周期（毫秒）
   * @param {string} config.color - CSS 颜色
   * @param {number} config.size - 粒子大小（像素）
   * @param {number} config.gravity - 重力加速度
   */
  emit(config) {
    const {
      x = 0,
      y = 0,
      count = 10,
      type = 'dust',
      velocity = { x: 0, y: -1 },
      velocityVariance = 2,
      lifetime,
      color,
      size,
      gravity
    } = config;

    // 获取类型默认配置
    const typeConfig = this.particleConfig[type] || this.particleConfig.dust;

    // 限制粒子数量（内存压力处理）
    let maxAllowed = this.maxParticles - this.particles.length;
    
    // 如果已经有很多粒子，进一步限制
    if (this.particles.length > this.maxParticles * 0.8) {
      maxAllowed = Math.floor(maxAllowed * 0.5);
      console.warn('High particle count, reducing emission');
    }
    
    const actualCount = Math.min(count, maxAllowed);
    
    if (actualCount <= 0) {
      console.warn('Particle limit reached, skipping emission');
      return;
    }

    for (let i = 0; i < actualCount; i++) {
      // 从池中获取或创建新粒子
      let particle = this.pool.length > 0 ? this.pool.pop() : this.createParticle(type);

      // 初始化粒子属性
      particle.x = x;
      particle.y = y;
      particle.vx = velocity.x + (Math.random() - 0.5) * velocityVariance;
      particle.vy = velocity.y + (Math.random() - 0.5) * velocityVariance;
      particle.lifetime = lifetime || typeConfig.lifetime;
      particle.age = 0;
      particle.type = type;
      particle.gravity = gravity !== undefined ? gravity : typeConfig.gravity;
      particle.friction = typeConfig.friction;
      particle.size = size || typeConfig.size;
      particle.color = color || typeConfig.color;
      particle.rotation = Math.random() * 360;
      particle.rotationSpeed = (Math.random() - 0.5) * 5;

      // 设置样式
      particle.element.style.width = `${particle.size}px`;
      particle.element.style.height = `${particle.size}px`;
      particle.element.style.backgroundColor = particle.color;
      particle.element.style.display = 'block';
      particle.element.style.opacity = '1';

      // 添加到活动粒子列表
      this.particles.push(particle);
    }

    // 启动更新循环
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * 创建粒子 DOM 元素
   * @param {string} type - 粒子类型
   * @returns {Object} 粒子对象
   */
  createParticle(type) {
    const element = document.createElement('div');
    element.className = `particle particle-${type}`;
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    element.style.borderRadius = type === 'coin' ? '50%' : '2px';
    element.style.willChange = 'transform, opacity';
    element.style.zIndex = '1000';
    element.style.top = '0';  // 明确设置初始位置
    element.style.left = '0'; // 明确设置初始位置
    
    // 金币特殊样式
    if (type === 'coin') {
      element.textContent = '💰';
      element.style.fontSize = '12px';
      element.style.backgroundColor = 'transparent';
    }
    
    // 闪光特殊样式
    if (type === 'sparkle') {
      element.style.boxShadow = '0 0 4px currentColor';
    }

    this.container.appendChild(element);

    return {
      element,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifetime: 1000,
      age: 0,
      type,
      gravity: 0,
      friction: 1,
      size: 4,
      color: '#fff',
      rotation: 0,
      rotationSpeed: 0
    };
  }

  /**
   * 启动更新循环
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.update();
  }

  /**
   * 更新所有粒子
   */
  update() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // 更新每个粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // 更新年龄
      particle.age += deltaTime;

      // 检查是否死亡
      if (particle.age >= particle.lifetime) {
        this.returnToPool(particle);
        this.particles.splice(i, 1);
        continue;
      }

      // 应用物理
      particle.vy += particle.gravity;
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      // 计算不透明度（生命周期结束时淡出）
      const lifeProgress = particle.age / particle.lifetime;
      const opacity = lifeProgress < 0.7 ? 1 : (1 - (lifeProgress - 0.7) / 0.3);

      // 更新 DOM
      particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`;
      particle.element.style.opacity = opacity.toString();
    }

    // 如果还有活动粒子，继续更新
    if (this.particles.length > 0) {
      this.animationFrame = requestAnimationFrame(() => this.update());
    } else {
      this.stop();
    }
  }

  /**
   * 停止更新循环
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * 将粒子返回到对象池
   * @param {Object} particle - 粒子对象
   */
  returnToPool(particle) {
    particle.element.style.display = 'none';
    if (this.pool.length < this.maxParticles) {
      this.pool.push(particle);
    } else {
      // 池已满，移除 DOM 元素
      if (particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    }
  }

  /**
   * 清除所有粒子
   */
  clear() {
    this.stop();
    
    // 将所有活动粒子返回池
    for (const particle of this.particles) {
      this.returnToPool(particle);
    }
    this.particles = [];
  }

  /**
   * 销毁粒子系统
   */
  destroy() {
    this.clear();
    
    // 清理池中的所有粒子
    for (const particle of this.pool) {
      if (particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    }
    this.pool = [];
  }

  /**
   * 预设效果：尘埃漂浮
   * @param {number} x - X 位置
   * @param {number} y - Y 位置
   */
  emitDust(x, y) {
    this.emit({
      x,
      y,
      count: 5,
      type: 'dust',
      velocity: { x: 0, y: -0.5 },
      velocityVariance: 1
    });
  }

  /**
   * 预设效果：爆炸
   * @param {number} x - X 位置
   * @param {number} y - Y 位置
   * @param {string} color - 颜色
   * @param {number} count - 粒子数量
   */
  emitExplosion(x, y, color = 'rgba(160, 53, 238, 0.8)', count = 30) {
    // 径向爆发
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3;
      this.emit({
        x,
        y,
        count: 1,
        type: 'explosion',
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        velocityVariance: 0.5,
        color
      });
    }
  }

  /**
   * 预设效果：金币雨
   * @param {number} x - X 位置
   * @param {number} y - Y 位置
   * @param {number} width - 宽度
   * @param {number} count - 金币数量
   */
  emitCoinRain(x, y, width, count = 50) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const randomX = x + Math.random() * width;
        this.emit({
          x: randomX,
          y,
          count: 1,
          type: 'coin',
          velocity: { x: (Math.random() - 0.5) * 2, y: 0 },
          velocityVariance: 0.5
        });
      }, i * 50); // 错开发射时间
    }
  }

  /**
   * 预设效果：闪光
   * @param {number} x - X 位置
   * @param {number} y - Y 位置
   * @param {number} count - 闪光数量
   */
  emitSparkles(x, y, count = 50) {
    this.emit({
      x,
      y,
      count,
      type: 'sparkle',
      velocity: { x: 0, y: -2 },
      velocityVariance: 3
    });
  }
}
