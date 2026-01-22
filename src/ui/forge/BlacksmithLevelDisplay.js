/**
 * BlacksmithLevelDisplay - 铁匠等级进度显示
 * 
 * 显示铁匠当前等级、经验进度和下一等级解锁功能
 * 播放升级动画和音效
 */

export class BlacksmithLevelDisplay {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.lastLevel = 1;
  }

  /**
   * 渲染铁匠等级面板
   * @returns {string} HTML字符串
   */
  render() {
    const game = window.game;
    const blacksmithNPC = game?.blacksmithNPC;
    
    if (!blacksmithNPC) {
      return '<p class="forge-placeholder">铁匠NPC数据不可用</p>';
    }
    
    const level = blacksmithNPC.level || 1;
    const experience = blacksmithNPC.experience || 0;
    const nextLevelExp = blacksmithNPC.nextLevelExp || 100;
    const expProgress = (experience / nextLevelExp) * 100;
    
    // 获取下一等级解锁的功能
    const nextUnlocks = this.getNextLevelUnlocks(level);
    
    return `
      <div class="detail-section blacksmith-level-section">
        <h4>铁匠等级</h4>
        <div class="level-display">
          <div class="level-icon">🔨</div>
          <div class="level-info">
            <div class="level-number">等级 ${level}</div>
            <div class="level-title">${this.getLevelTitle(level)}</div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>经验进度</h4>
        <div class="exp-progress-container">
          <div class="exp-progress-bar">
            <div class="exp-progress-fill" style="width: ${expProgress}%;">
              <div class="exp-progress-shine"></div>
            </div>
          </div>
          <div class="exp-progress-text">
            ${experience} / ${nextLevelExp} EXP
            <span class="exp-percentage">(${expProgress.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>经验获取</h4>
        <div class="exp-gain-list">
          <div class="exp-gain-item">
            <span class="exp-gain-action">强化装备</span>
            <span class="exp-gain-value">+5 EXP</span>
          </div>
          <div class="exp-gain-item">
            <span class="exp-gain-action">重铸品质</span>
            <span class="exp-gain-value">+3 EXP</span>
          </div>
          <div class="exp-gain-item">
            <span class="exp-gain-action">镶嵌宝石</span>
            <span class="exp-gain-value">+2 EXP</span>
          </div>
          <div class="exp-gain-item">
            <span class="exp-gain-action">合成宝石</span>
            <span class="exp-gain-value">+4 EXP</span>
          </div>
          <div class="exp-gain-item">
            <span class="exp-gain-action">拆解装备</span>
            <span class="exp-gain-value">+1 EXP</span>
          </div>
        </div>
      </div>

      ${nextUnlocks.length > 0 ? `
        <div class="detail-section next-unlock-section">
          <h4>下一等级解锁 <small style="color: #888;">(Lv.${level + 1})</small></h4>
          <div class="next-unlock-list">
            ${nextUnlocks.map(unlock => `
              <div class="next-unlock-item">
                <span class="unlock-icon">${unlock.icon}</span>
                <span class="unlock-name">${unlock.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="detail-section">
          <h4>恭喜！</h4>
          <p style="color: #4caf50; text-align: center; padding: 20px;">
            您已解锁所有功能！<br>
            继续提升等级以获得更多奖励。
          </p>
        </div>
      `}
    `;
  }

  /**
   * 获取等级称号
   * @param {number} level - 等级
   * @returns {string} 称号
   */
  getLevelTitle(level) {
    if (level >= 20) return '传奇铁匠';
    if (level >= 15) return '大师铁匠';
    if (level >= 10) return '专家铁匠';
    if (level >= 7) return '熟练铁匠';
    if (level >= 5) return '进阶铁匠';
    if (level >= 3) return '学徒铁匠';
    return '新手铁匠';
  }

  /**
   * 获取下一等级解锁的功能
   * @param {number} currentLevel - 当前等级
   * @returns {Array} 解锁功能列表
   */
  getNextLevelUnlocks(currentLevel) {
    const nextLevel = currentLevel + 1;
    const unlocks = [];
    
    // 从FeatureUnlockManager获取功能配置
    if (this.forgeUI.featureUnlockManager) {
      const features = this.forgeUI.featureUnlockManager.features;
      Object.values(features).forEach(feature => {
        if (feature.unlockLevel === nextLevel) {
          unlocks.push({
            name: feature.name,
            icon: feature.icon,
            description: feature.description
          });
        }
      });
    }
    
    return unlocks;
  }

  /**
   * 检查是否升级
   * @returns {boolean} 是否升级
   */
  checkLevelUp() {
    const game = window.game;
    const blacksmithNPC = game?.blacksmithNPC;
    
    if (!blacksmithNPC) return false;
    
    const currentLevel = blacksmithNPC.level || 1;
    
    // 检测升级
    if (currentLevel > this.lastLevel) {
      this.playLevelUpAnimation(currentLevel);
      this.lastLevel = currentLevel;
      
      // 更新功能解锁状态
      if (this.forgeUI.featureUnlockManager) {
        this.forgeUI.featureUnlockManager.updateUnlockStatus(currentLevel);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * 播放升级动画
   * @param {number} newLevel - 新等级
   */
  playLevelUpAnimation(newLevel) {
    // 播放升级音效
    if (this.forgeUI.soundManager) {
      this.forgeUI.soundManager.playLevelUp();
    }
    
    // 创建升级通知
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = `
      <div class="level-up-content">
        <div class="level-up-icon">⭐</div>
        <div class="level-up-text">
          <div class="level-up-title">升级了！</div>
          <div class="level-up-level">铁匠等级 ${newLevel}</div>
          <div class="level-up-subtitle">${this.getLevelTitle(newLevel)}</div>
        </div>
        <div class="level-up-particles">
          ${Array.from({ length: 20 }, (_, i) => `
            <div class="particle" style="
              --angle: ${(i / 20) * 360}deg;
              --delay: ${i * 0.05}s;
            "></div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // 3秒后自动消失
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
    
    // 显示浮动文字
    const game = window.game;
    if (game && game.floatingTextPool) {
      const canvas = game.canvas;
      const text = game.floatingTextPool.create(
        canvas.width / 2,
        canvas.height / 2 - 50,
        `等级提升！Lv.${newLevel}`,
        '#ffd700',
        null,
        0
      );
      if (game.floatingTexts) {
        game.floatingTexts.push(text);
      }
    }
  }

  /**
   * 更新铁匠等级显示（在header中）
   */
  updateHeaderDisplay() {
    const game = window.game;
    const blacksmithNPC = game?.blacksmithNPC;
    
    if (!blacksmithNPC) return;
    
    const levelText = document.getElementById('blacksmith-level-text');
    if (levelText) {
      levelText.textContent = blacksmithNPC.level || 1;
    }
  }

  /**
   * 添加经验
   * @param {number} amount - 经验值
   * @param {string} source - 来源
   */
  addExperience(amount, source = '') {
    const game = window.game;
    const blacksmithNPC = game?.blacksmithNPC;
    
    if (!blacksmithNPC) return;
    
    // 添加经验
    blacksmithNPC.experience = (blacksmithNPC.experience || 0) + amount;
    
    // 检查升级
    while (blacksmithNPC.experience >= blacksmithNPC.nextLevelExp) {
      blacksmithNPC.experience -= blacksmithNPC.nextLevelExp;
      blacksmithNPC.level = (blacksmithNPC.level || 1) + 1;
      blacksmithNPC.nextLevelExp = this.calculateNextLevelExp(blacksmithNPC.level);
      
      // 触发升级检查
      this.checkLevelUp();
    }
    
    // 更新显示
    this.updateHeaderDisplay();
    
    // 显示经验获得提示
    if (amount > 0) {
      this.showExpGainNotification(amount, source);
    }
  }

  /**
   * 计算下一等级所需经验
   * @param {number} level - 当前等级
   * @returns {number} 所需经验
   */
  calculateNextLevelExp(level) {
    // 指数增长公式
    return Math.floor(100 * Math.pow(1.2, level - 1));
  }

  /**
   * 显示经验获得通知
   * @param {number} amount - 经验值
   * @param {string} source - 来源
   */
  showExpGainNotification(amount, source) {
    const game = window.game;
    if (game && game.floatingTextPool) {
      const canvas = game.canvas;
      const text = game.floatingTextPool.create(
        canvas.width / 2,
        canvas.height / 2 + 30,
        `+${amount} EXP${source ? ` (${source})` : ''}`,
        '#4caf50',
        null,
        0
      );
      if (game.floatingTexts) {
        game.floatingTexts.push(text);
      }
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理通知
    const notifications = document.querySelectorAll('.level-up-notification');
    notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
}
