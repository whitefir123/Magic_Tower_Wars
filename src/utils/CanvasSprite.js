// CanvasSprite.js - Canvas 精灵动画类
// 使用 Canvas 切片绘制精灵动画，彻底杜绝残影

/**
 * CanvasSprite - Canvas 精灵动画类
 * 用于在 Canvas 上绘制和播放精灵动画
 */
export class CanvasSprite {
  constructor(container, imgUrl, cols, rows, fps) {
    this.container = container;
    if (!container) return;
    
    this.cols = cols;
    this.rows = rows;
    this.fps = fps;
    this.frame = 0;
    this.totalFrames = cols * rows;
    this.running = false;
    
    this.img = new Image();
    this.img.decoding = 'async';
    this.img.src = imgUrl;
    
    this.dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    
    // 创建画布
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.canvas.style.width = this.container.clientWidth + 'px';
    this.canvas.style.height = this.container.clientHeight + 'px';
    this.container.style.position = this.container.style.position || 'relative';
    
    // 覆盖背景，避免与背景叠加造成错觉
    this.container.style.backgroundImage = 'none';
    this.container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    
    this.lastTime = 0;
    this.acc = 0;
    this.frameDur = 1000 / fps;
    
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    
    this.img.onload = () => {
      this.resize();
      this.start();
    };
  }
  
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    
    // 计算源帧尺寸
    this.srcW = Math.floor(this.img.naturalWidth / this.cols);
    this.srcH = Math.floor(this.img.naturalHeight / this.rows);
    
    // 保持原始宽高比，不拉伸素材
    const srcAspect = this.srcW / this.srcH;
    const containerAspect = w / h;
    let dstW, dstH;
    
    if (srcAspect > containerAspect) {
      // 素材更宽，按宽度适配
      dstW = w;
      dstH = w / srcAspect;
    } else {
      // 素材更高，按高度适配
      dstH = h;
      dstW = h * srcAspect;
    }
    
    this.dstW = dstW;
    this.dstH = dstH;
    this.dstX = (w - dstW) / 2;
    this.dstY = (h - dstH) / 2;
  }
  
  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.tick(this.lastTime);
    }
  }
  
  stop() {
    if (this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this._onResize);
    }
  }
  
  tick(now) {
    if (!this.running) return;
    
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.acc += dt;
    
    while (this.acc >= this.frameDur) {
      this.acc -= this.frameDur;
      this.frame = (this.frame + 1) % this.totalFrames;
    }
    
    this.draw();
    this.raf = requestAnimationFrame(this.tick.bind(this));
  }
  
  draw() {
    if (!this.img.complete || !this.img.naturalWidth || !this.img.naturalHeight) return;
    
    const natW = this.img.naturalWidth;
    const natH = this.img.naturalHeight;
    const col = this.frame % this.cols;
    const row = Math.floor(this.frame / this.cols);
    
    // 使用整像素切片，杜绝列/行间"渗色"
    const sx = Math.round(col * natW / this.cols);
    const sx2 = Math.round((col + 1) * natW / this.cols);
    const sy = Math.round(row * natH / this.rows);
    const sy2 = Math.round((row + 1) * natH / this.rows);
    const sWidth = Math.max(1, sx2 - sx);
    const sHeight = Math.max(1, sy2 - sy);
    
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(this.img, sx, sy, sWidth, sHeight, this.dstX, this.dstY, this.dstW, this.dstH);
  }
}

// 暴露到全局作用域
if (typeof window !== 'undefined') {
  window.CanvasSprite = CanvasSprite;
  
  // 页面加载完成后初始化全局加载界面的小骷髅和蝴蝶
  window.addEventListener('load', () => {
    setTimeout(() => {
      const idSkel = document.getElementById('loading-skeleton');
      const idBfly = document.getElementById('loading-butterfly');
      if (idSkel && !idSkel.__sprite) {
        console.log('🦴 初始化全局加载界面小骷髅动画');
        idSkel.__sprite = new CanvasSprite(idSkel, 'https://i.postimg.cc/MGft6mWh/xiaokuloujiazai1.png', 4, 1, 5);
      }
      if (idBfly && !idBfly.__sprite) {
        console.log('🦋 初始化全局加载界面蝴蝶动画');
        idBfly.__sprite = new CanvasSprite(idBfly, 'https://i.postimg.cc/DyjfRzTx/hudie1.png', 4, 1, 16/3);
      }
    }, 100);
  });
}

