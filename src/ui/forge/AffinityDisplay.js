/**
 * AffinityDisplay - 好感度显示组件
 * 
 * 使用爱心素材显示NPC好感度
 */

export class AffinityDisplay {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.displayElement = null;
    this.heartImage = null;
    this.maxHearts = 5; // 最大爱心数量
    this.isLoaded = false;
    this.lastAffinity = 0; // 记录上次的好感度值
    this.lastAffinityTitle = '陌生'; // 记录上次的关系称号
    
    // 加载爱心素材
    this.loadHeartImage();
    
    // 启动好感度监听
    this.startAffinityWatcher();
  }

  /**
   * 加载爱心素材
   */
  loadHeartImage() {
    this.heartImage = new Image();
    this.heartImage.onload = () => {
      this.isLoaded = true;
      console.log('✓ 爱心素材已加载');
      
      // 初始化好感度记录
      const blacksmithNPC = this.getBlacksmithNPC();
      if (blacksmithNPC) {
        this.lastAffinity = blacksmithNPC.affinity;
        this.lastAffinityTitle = blacksmithNPC.getAffinityTitle();
      }
      
      // 延迟渲染，确保NPC元素已经定位
      setTimeout(() => {
        console.log('[AffinityDisplay] 第1次渲染尝试');
        this.render();
        
        // 再次延迟渲染，确保位置正确
        setTimeout(() => {
          console.log('[AffinityDisplay] 第2次渲染尝试');
          this.render();
          
          // 第三次渲染，最终确保
          setTimeout(() => {
            console.log('[AffinityDisplay] 第3次渲染尝试（最终）');
            this.render();
          }, 300);
        }, 200);
      }, 100);
    };
    this.heartImage.onerror = () => {
      console.error('✗ 爱心素材加载失败');
    };
    this.heartImage.src = 'https://i.postimg.cc/BQ49XRNf/haogandu1.png';
  }

  /**
   * 渲染好感度显示
   */
  render() {
    console.log('[AffinityDisplay] render() 被调用, isLoaded:', this.isLoaded);
    
    if (!this.isLoaded) {
      console.log('[AffinityDisplay] 爱心素材未加载，跳过渲染');
      return;
    }

    // 创建显示元素（如果还没创建）
    if (!this.displayElement) {
      console.log('[AffinityDisplay] 创建显示元素');
      this.createDisplayElement();
    }

    const blacksmithNPC = this.getBlacksmithNPC();
    if (!blacksmithNPC) {
      console.log('[AffinityDisplay] BlacksmithNPC 未初始化，显示默认状态');
      // 即使NPC未初始化，也显示默认状态
      const titleEl = this.displayElement.querySelector('.affinity-title');
      if (titleEl) {
        titleEl.textContent = '陌生';
      }
      this.renderHearts(0);
      this.positionDisplay();
      return;
    }

    const info = blacksmithNPC.getInfo();
    console.log('[AffinityDisplay] 渲染好感度:', info.affinity, '关系:', info.affinityTitle);

    // 更新关系标题
    const titleEl = this.displayElement.querySelector('.affinity-title');
    if (titleEl) {
      titleEl.textContent = info.affinityTitle || '陌生';
    }

    // 渲染爱心
    this.renderHearts(info.affinity);

    // 定位显示元素
    this.positionDisplay();
  }

  /**
   * 创建显示元素
   */
  createDisplayElement() {
    this.displayElement = document.createElement('div');
    this.displayElement.className = 'affinity-display';
    this.displayElement.innerHTML = `
      <div class="affinity-title">陌生</div>
      <div class="affinity-hearts" id="affinity-hearts"></div>
    `;
    
    // 设置初始样式，确保可见
    this.displayElement.style.opacity = '1';
    this.displayElement.style.visibility = 'visible';
    this.displayElement.style.display = 'flex';

    // 添加到铁匠铺overlay中
    const forgeOverlay = document.getElementById('forge-overlay');
    if (forgeOverlay) {
      forgeOverlay.appendChild(this.displayElement);
      console.log('[AffinityDisplay] ✓ 显示元素已添加到 forge-overlay');
    } else {
      document.body.appendChild(this.displayElement);
      console.log('[AffinityDisplay] ⚠ 显示元素已添加到 body（forge-overlay不存在）');
    }
  }

  /**
   * 渲染爱心
   * @param {number} affinity - 好感度值 (0-100)
   */
  renderHearts(affinity) {
    const heartsContainer = document.getElementById('affinity-hearts');
    if (!heartsContainer || !this.heartImage) {
      return;
    }

    heartsContainer.innerHTML = '';

    // 计算每颗心代表的好感度值
    const affinityPerHeart = 100 / this.maxHearts; // 20点好感度 = 1颗心

    // 渲染每颗爱心
    for (let i = 0; i < this.maxHearts; i++) {
      const heartCanvas = document.createElement('canvas');
      heartCanvas.width = 24;
      heartCanvas.height = 24;
      heartCanvas.className = 'affinity-heart';

      const ctx = heartCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 计算这颗心的填充百分比
      const heartStartAffinity = i * affinityPerHeart;
      const heartEndAffinity = (i + 1) * affinityPerHeart;
      
      let fillPercentage = 0;
      if (affinity >= heartEndAffinity) {
        fillPercentage = 1; // 完全填充
      } else if (affinity > heartStartAffinity) {
        fillPercentage = (affinity - heartStartAffinity) / affinityPerHeart;
      }

      // 绘制爱心（从下往上填充）
      this.drawHeart(ctx, fillPercentage);

      heartsContainer.appendChild(heartCanvas);
    }
  }

  /**
   * 绘制单个爱心
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} fillPercentage - 填充百分比 (0-1)
   */
  drawHeart(ctx, fillPercentage) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    if (fillPercentage <= 0) {
      // 空心：只绘制轮廓（灰色）
      ctx.globalAlpha = 0.3;
      ctx.drawImage(this.heartImage, 0, 0, width, height);
      ctx.globalAlpha = 1;
    } else if (fillPercentage >= 1) {
      // 完全填充：绘制完整爱心
      ctx.drawImage(this.heartImage, 0, 0, width, height);
    } else {
      // 部分填充：从下往上裁剪
      const fillHeight = height * fillPercentage;
      const startY = height - fillHeight;

      // 先绘制灰色轮廓
      ctx.globalAlpha = 0.3;
      ctx.drawImage(this.heartImage, 0, 0, width, height);
      ctx.globalAlpha = 1;

      // 使用裁剪绘制填充部分
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, startY, width, fillHeight);
      ctx.clip();
      ctx.drawImage(this.heartImage, 0, 0, width, height);
      ctx.restore();
    }
  }

  /**
   * 定位显示元素
   */
  positionDisplay() {
    if (!this.displayElement) {
      console.warn('[AffinityDisplay] displayElement 不存在');
      return;
    }
    
    if (!this.npcRenderer) {
      console.warn('[AffinityDisplay] npcRenderer 不存在');
      return;
    }
    
    if (!this.npcRenderer.npcElement) {
      console.warn('[AffinityDisplay] npcElement 不存在');
      return;
    }

    const npcElement = this.npcRenderer.npcElement;
    const npcRect = npcElement.getBoundingClientRect();
    
    console.log('[AffinityDisplay] NPC位置:', npcRect);
    
    // 检查NPC位置是否有效（避免定位到屏幕外）
    if (npcRect.left === 0 && npcRect.top === 0 && npcRect.width === 0 && npcRect.height === 0) {
      console.warn('[AffinityDisplay] NPC位置无效，延迟重试');
      // NPC还未正确定位，延迟重试
      setTimeout(() => this.positionDisplay(), 100);
      return;
    }

    // 检查是否有对话框显示
    const dialogueSystem = this.npcRenderer.dialogueSystem;
    const hasDialogue = dialogueSystem && dialogueSystem.isShowing && dialogueSystem.dialogueElement;

    if (hasDialogue) {
      // 如果有对话框，定位到对话框上方
      const dialogueRect = dialogueSystem.dialogueElement.getBoundingClientRect();
      const left = dialogueRect.left + (dialogueRect.width / 2);
      const top = dialogueRect.top - 60; // 对话框上方60px

      this.displayElement.style.left = `${left}px`;
      this.displayElement.style.top = `${top}px`;
      this.displayElement.classList.add('affinity-above-dialogue');
      console.log('[AffinityDisplay] 定位到对话框上方:', { left, top });
    } else {
      // 否则定位到NPC头顶
      const left = npcRect.left + (npcRect.width / 2);
      const top = npcRect.top - 30; // NPC上方30px

      this.displayElement.style.left = `${left}px`;
      this.displayElement.style.top = `${top}px`;
      this.displayElement.classList.remove('affinity-above-dialogue');
      console.log('[AffinityDisplay] 定位到NPC头顶:', { left, top });
    }
  }

  /**
   * 启动好感度监听器
   */
  startAffinityWatcher() {
    // 每500ms检查一次好感度变化
    this.affinityWatcherInterval = setInterval(() => {
      this.checkAffinityChange();
    }, 500);
  }

  /**
   * 检查好感度变化
   */
  checkAffinityChange() {
    const blacksmithNPC = this.getBlacksmithNPC();
    if (!blacksmithNPC) {
      return;
    }

    const currentAffinity = blacksmithNPC.affinity;
    const currentTitle = blacksmithNPC.getAffinityTitle();

    // 首次初始化记录值
    if (this.lastAffinity === 0 && this.lastAffinityTitle === '陌生' && currentAffinity === 0) {
      // 初始状态，不显示飘字
      this.lastAffinity = currentAffinity;
      this.lastAffinityTitle = currentTitle;
      return;
    }

    // 检查好感度是否变化
    if (currentAffinity !== this.lastAffinity) {
      const affinityChange = currentAffinity - this.lastAffinity;
      
      // 只在好感度增加时显示飘字
      if (affinityChange > 0) {
        // 检查关系称号是否变化
        if (currentTitle !== this.lastAffinityTitle) {
          this.showFloatingText(`关系变为：${currentTitle}`, 'title-change');
        } else {
          this.showFloatingText(`好感度 +${affinityChange}`, 'affinity-gain');
        }
      }

      // 更新记录
      this.lastAffinity = currentAffinity;
      this.lastAffinityTitle = currentTitle;

      // 更新显示
      this.render();
    }
  }

  /**
   * 显示浮动文字（飘字效果）
   * @param {string} text - 文字内容
   * @param {string} type - 类型 ('affinity-gain' | 'title-change')
   */
  showFloatingText(text, type = 'affinity-gain') {
    if (!this.displayElement) {
      return;
    }

    const floatingText = document.createElement('div');
    floatingText.className = `floating-text floating-text-${type}`;
    floatingText.textContent = text;

    // 定位到爱心显示位置
    const displayRect = this.displayElement.getBoundingClientRect();
    floatingText.style.left = `${displayRect.left + displayRect.width / 2}px`;
    floatingText.style.top = `${displayRect.top}px`;

    // 添加到forge-overlay
    const forgeOverlay = document.getElementById('forge-overlay');
    if (forgeOverlay) {
      forgeOverlay.appendChild(floatingText);
    } else {
      document.body.appendChild(floatingText);
    }

    // 添加动画
    setTimeout(() => floatingText.classList.add('show'), 10);

    // 1.5秒后移除
    setTimeout(() => {
      floatingText.classList.remove('show');
      setTimeout(() => {
        if (floatingText.parentElement) {
          floatingText.parentElement.removeChild(floatingText);
        }
      }, 500);
    }, 1500);
  }

  /**
   * 更新显示（外部调用）
   */
  update() {
    this.render();
  }

  /**
   * 获取BlacksmithNPC实例
   * @returns {Object|null} BlacksmithNPC实例
   */
  getBlacksmithNPC() {
    if (!this.npcRenderer || !this.npcRenderer.forgeUI) {
      return null;
    }

    const blacksmithSystem = this.npcRenderer.forgeUI.blacksmithSystem;
    if (!blacksmithSystem || !blacksmithSystem.blacksmithNPC) {
      return null;
    }

    return blacksmithSystem.blacksmithNPC;
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 停止好感度监听
    if (this.affinityWatcherInterval) {
      clearInterval(this.affinityWatcherInterval);
      this.affinityWatcherInterval = null;
    }

    if (this.displayElement && this.displayElement.parentElement) {
      this.displayElement.parentElement.removeChild(this.displayElement);
    }
    this.displayElement = null;
    this.heartImage = null;
  }
}
