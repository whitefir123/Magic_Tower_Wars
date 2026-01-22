/**
 * AffinityManager - 好感度管理器
 * 
 * 管理铁匠NPC的好感度显示和动画
 */

export class AffinityManager {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.affinityElement = null;
    this.previousAffinity = 0;
    this.previousTitle = '陌生';
  }

  /**
   * 初始化好感度管理器
   * @param {HTMLElement} containerElement - 容器元素
   */
  initialize(containerElement) {
    this.affinityElement = this.createAffinityElement();
    containerElement.appendChild(this.affinityElement);
    
    // 初始化数据
    this.update();
  }

  /**
   * 创建好感度元素
   * @returns {HTMLElement} 好感度元素
   */
  createAffinityElement() {
    const affinityEl = document.createElement('div');
    affinityEl.className = 'affinity-panel';
    affinityEl.innerHTML = `
      <div class="affinity-header">
        <h4>好感度</h4>
        <span class="affinity-title" id="affinity-title-text">陌生</span>
      </div>
      <div class="affinity-progress-container">
        <div class="affinity-progress-bar">
          <div class="affinity-progress-fill" id="affinity-progress-fill" style="width: 0%"></div>
        </div>
        <div class="affinity-progress-text" id="affinity-progress-text">0 / 100</div>
      </div>
      <div class="affinity-next-reward" id="affinity-next-reward">
        <span class="reward-label">下一等级奖励：</span>
        <span class="reward-text">折扣 5%</span>
      </div>
    `;
    return affinityEl;
  }

  /**
   * 更新好感度显示
   */
  update() {
    const blacksmithNPC = this.getBlacksmithNPC();
    if (!blacksmithNPC) {
      console.warn('BlacksmithNPC未初始化');
      return;
    }
    
    const currentAffinity = blacksmithNPC.affinity;
    const currentTitle = blacksmithNPC.getAffinityTitle();
    
    // 检查是否有变化
    const hasChanged = currentAffinity !== this.previousAffinity;
    const titleChanged = currentTitle !== this.previousTitle;
    
    // 更新称号
    this.updateTitle(currentTitle);
    
    // 更新进度条
    this.updateProgressBar(currentAffinity);
    
    // 更新下一等级奖励
    this.updateNextReward(blacksmithNPC);
    
    // 如果有变化，播放动画
    if (hasChanged) {
      this.playIncreaseAnimation(currentAffinity - this.previousAffinity);
    }
    
    // 如果称号改变，显示通知
    if (titleChanged) {
      this.showTitleChangeNotification(currentTitle);
    }
    
    // 更新记录
    this.previousAffinity = currentAffinity;
    this.previousTitle = currentTitle;
  }

  /**
   * 更新称号显示
   * @param {string} title - 好感度称号
   */
  updateTitle(title) {
    if (!this.affinityElement) return;
    
    const titleEl = this.affinityElement.querySelector('#affinity-title-text');
    if (titleEl) {
      titleEl.textContent = title;
      
      // 根据称号设置颜色
      titleEl.className = 'affinity-title';
      if (title === '挚友') {
        titleEl.classList.add('affinity-max');
      } else if (title === '信赖') {
        titleEl.classList.add('affinity-high');
      } else if (title === '友好') {
        titleEl.classList.add('affinity-medium');
      }
    }
  }

  /**
   * 更新进度条
   * @param {number} currentAffinity - 当前好感度
   */
  updateProgressBar(currentAffinity) {
    if (!this.affinityElement) return;
    
    const blacksmithNPC = this.getBlacksmithNPC();
    if (!blacksmithNPC) return;
    
    // 获取当前和下一个阈值
    const thresholds = blacksmithNPC.AFFINITY_THRESHOLDS;
    let currentThreshold = thresholds[0];
    let nextThreshold = thresholds[1];
    
    for (let i = 0; i < thresholds.length; i++) {
      if (currentAffinity >= thresholds[i].affinity) {
        currentThreshold = thresholds[i];
        nextThreshold = thresholds[i + 1] || thresholds[i];
      } else {
        break;
      }
    }
    
    // 计算进度百分比
    const progress = nextThreshold === currentThreshold 
      ? 100 
      : ((currentAffinity - currentThreshold.affinity) / (nextThreshold.affinity - currentThreshold.affinity)) * 100;
    
    // 更新进度条
    const progressFill = this.affinityElement.querySelector('#affinity-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${Math.min(progress, 100)}%`;
    }
    
    // 更新进度文本
    const progressText = this.affinityElement.querySelector('#affinity-progress-text');
    if (progressText) {
      if (nextThreshold === currentThreshold) {
        progressText.textContent = `${currentAffinity} (最大)`;
      } else {
        progressText.textContent = `${currentAffinity} / ${nextThreshold.affinity}`;
      }
    }
  }

  /**
   * 更新下一等级奖励
   * @param {Object} blacksmithNPC - BlacksmithNPC实例
   */
  updateNextReward(blacksmithNPC) {
    if (!this.affinityElement) return;
    
    const thresholds = blacksmithNPC.AFFINITY_THRESHOLDS;
    const currentAffinity = blacksmithNPC.affinity;
    
    // 找到下一个阈值
    let nextThreshold = null;
    for (let i = 0; i < thresholds.length; i++) {
      if (currentAffinity < thresholds[i].affinity) {
        nextThreshold = thresholds[i];
        break;
      }
    }
    
    const rewardEl = this.affinityElement.querySelector('#affinity-next-reward');
    if (!rewardEl) return;
    
    if (nextThreshold) {
      const discount = (nextThreshold.discount * 100).toFixed(0);
      rewardEl.innerHTML = `
        <span class="reward-label">下一等级奖励：</span>
        <span class="reward-text">${nextThreshold.title} - 折扣 ${discount}%</span>
      `;
      rewardEl.style.display = 'block';
    } else {
      rewardEl.innerHTML = `
        <span class="reward-label">已达到最高好感度！</span>
      `;
    }
  }

  /**
   * 播放好感度增加动画
   * @param {number} increase - 增加值
   */
  playIncreaseAnimation(increase) {
    if (!this.affinityElement || increase <= 0) return;
    
    // 创建浮动数字动画
    const floatingText = document.createElement('div');
    floatingText.className = 'affinity-floating-text';
    floatingText.textContent = `+${increase}`;
    
    this.affinityElement.appendChild(floatingText);
    
    // 添加动画类
    setTimeout(() => {
      floatingText.classList.add('floating-animate');
    }, 10);
    
    // 动画结束后移除
    setTimeout(() => {
      if (floatingText.parentElement) {
        floatingText.parentElement.removeChild(floatingText);
      }
    }, 1000);
    
    // 进度条闪烁效果
    const progressFill = this.affinityElement.querySelector('#affinity-progress-fill');
    if (progressFill) {
      progressFill.classList.add('affinity-pulse');
      setTimeout(() => {
        progressFill.classList.remove('affinity-pulse');
      }, 500);
    }
  }

  /**
   * 显示称号改变通知
   * @param {string} newTitle - 新称号
   */
  showTitleChangeNotification(newTitle) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'affinity-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">🎉</div>
        <div class="notification-text">
          <div class="notification-title">好感度提升！</div>
          <div class="notification-subtitle">与铁匠的关系变为：${newTitle}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 添加动画
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);
    
    // 3秒后自动移除
    setTimeout(() => {
      notification.classList.remove('notification-show');
      notification.classList.add('notification-hide');
      
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }, 3000);
    
    // 播放音效
    if (window.AudioManager && typeof window.AudioManager.playLevelUp === 'function') {
      window.AudioManager.playLevelUp();
    }
  }

  /**
   * 获取BlacksmithNPC实例
   * @returns {Object|null} BlacksmithNPC实例
   */
  getBlacksmithNPC() {
    if (!this.forgeUI || !this.forgeUI.blacksmithSystem) {
      return null;
    }
    
    return this.forgeUI.blacksmithSystem.blacksmithNPC;
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.affinityElement && this.affinityElement.parentElement) {
      this.affinityElement.parentElement.removeChild(this.affinityElement);
    }
    
    this.affinityElement = null;
    this.previousAffinity = 0;
    this.previousTitle = '陌生';
  }
}
