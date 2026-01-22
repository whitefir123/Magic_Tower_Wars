/**
 * FeatureUnlockManager - 功能解锁管理器
 * 
 * 管理铁匠铺功能的解锁状态和提示
 * 根据铁匠等级显示可用和未解锁的功能
 */

export class FeatureUnlockManager {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    
    // 功能解锁配置
    this.features = {
      enhance: {
        name: '装备强化',
        icon: '⚒️',
        description: '提升装备等级，增加属性',
        unlockLevel: 1,
        unlocked: true
      },
      reforge: {
        name: '品质重铸',
        icon: '🔄',
        description: '重新随机装备品质',
        unlockLevel: 3,
        unlocked: false
      },
      socket: {
        name: '宝石镶嵌',
        icon: '💎',
        description: '在装备上镶嵌宝石',
        unlockLevel: 5,
        unlocked: false
      },
      synthesis: {
        name: '宝石合成',
        icon: '🔮',
        description: '合成高级宝石',
        unlockLevel: 7,
        unlocked: false
      },
      dismantle: {
        name: '装备拆解',
        icon: '🔨',
        description: '拆解装备获取材料',
        unlockLevel: 2,
        unlocked: false
      },
      batch: {
        name: '批量操作',
        icon: '📦',
        description: '批量强化或拆解装备',
        unlockLevel: 10,
        unlocked: false
      },
      luckyStone: {
        name: '幸运石系统',
        icon: '🪨',
        description: '使用幸运石提升成功率',
        unlockLevel: 4,
        unlocked: false
      },
      drill: {
        name: '钻头打孔',
        icon: '⚙️',
        description: '使用钻头增加宝石槽位',
        unlockLevel: 6,
        unlocked: false
      }
    };
  }

  /**
   * 更新解锁状态
   * @param {number} blacksmithLevel - 铁匠等级
   */
  updateUnlockStatus(blacksmithLevel) {
    let hasNewUnlock = false;
    
    Object.keys(this.features).forEach(featureId => {
      const feature = this.features[featureId];
      const wasUnlocked = feature.unlocked;
      feature.unlocked = blacksmithLevel >= feature.unlockLevel;
      
      // 检测新解锁
      if (!wasUnlocked && feature.unlocked) {
        hasNewUnlock = true;
        this.showUnlockNotification(feature);
      }
    });
    
    return hasNewUnlock;
  }

  /**
   * 显示解锁通知
   * @param {Object} feature - 功能对象
   */
  showUnlockNotification(feature) {
    // 播放解锁音效
    if (this.forgeUI.soundManager) {
      this.forgeUI.soundManager.playUnlock();
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'feature-unlock-notification';
    notification.innerHTML = `
      <div class="unlock-notification-content">
        <div class="unlock-icon">${feature.icon}</div>
        <div class="unlock-text">
          <div class="unlock-title">功能解锁！</div>
          <div class="unlock-feature-name">${feature.name}</div>
          <div class="unlock-description">${feature.description}</div>
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
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }

  /**
   * 检查功能是否解锁
   * @param {string} featureId - 功能ID
   * @returns {boolean} 是否解锁
   */
  isFeatureUnlocked(featureId) {
    const feature = this.features[featureId];
    return feature ? feature.unlocked : false;
  }

  /**
   * 获取功能信息
   * @param {string} featureId - 功能ID
   * @returns {Object|null} 功能信息
   */
  getFeatureInfo(featureId) {
    return this.features[featureId] || null;
  }

  /**
   * 获取所有未解锁功能
   * @returns {Array} 未解锁功能列表
   */
  getLockedFeatures() {
    return Object.entries(this.features)
      .filter(([id, feature]) => !feature.unlocked)
      .map(([id, feature]) => ({ id, ...feature }))
      .sort((a, b) => a.unlockLevel - b.unlockLevel);
  }

  /**
   * 获取所有已解锁功能
   * @returns {Array} 已解锁功能列表
   */
  getUnlockedFeatures() {
    return Object.entries(this.features)
      .filter(([id, feature]) => feature.unlocked)
      .map(([id, feature]) => ({ id, ...feature }))
      .sort((a, b) => a.unlockLevel - b.unlockLevel);
  }

  /**
   * 渲染功能解锁面板
   * @returns {string} HTML字符串
   */
  renderUnlockPanel() {
    const game = window.game;
    const blacksmithLevel = game?.blacksmithNPC?.level || 1;
    
    const unlockedFeatures = this.getUnlockedFeatures();
    const lockedFeatures = this.getLockedFeatures();
    
    return `
      <div class="detail-section">
        <h4>已解锁功能 <small style="color: #888;">(${unlockedFeatures.length})</small></h4>
        <div class="feature-list">
          ${unlockedFeatures.map(feature => this.renderFeatureCard(feature, true)).join('')}
        </div>
      </div>
      
      ${lockedFeatures.length > 0 ? `
        <div class="detail-section">
          <h4>未解锁功能 <small style="color: #888;">(${lockedFeatures.length})</small></h4>
          <div class="feature-list">
            ${lockedFeatures.map(feature => this.renderFeatureCard(feature, false)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * 渲染功能卡片
   * @param {Object} feature - 功能对象
   * @param {boolean} unlocked - 是否解锁
   * @returns {string} HTML字符串
   */
  renderFeatureCard(feature, unlocked) {
    return `
      <div class="feature-card ${unlocked ? 'unlocked' : 'locked'}" 
           data-feature-id="${feature.id}"
           title="${unlocked ? '已解锁' : `等级 ${feature.unlockLevel} 解锁`}">
        <div class="feature-icon">${feature.icon}</div>
        <div class="feature-info">
          <div class="feature-name">${feature.name}</div>
          <div class="feature-description">${feature.description}</div>
          ${!unlocked ? `
            <div class="feature-unlock-level">
              <span class="unlock-level-badge">Lv.${feature.unlockLevel}</span>
            </div>
          ` : ''}
        </div>
        ${unlocked ? `
          <div class="feature-status">
            <span class="status-badge unlocked-badge">✓ 已解锁</span>
          </div>
        ` : `
          <div class="feature-status">
            <span class="status-badge locked-badge">🔒 未解锁</span>
          </div>
        `}
      </div>
    `;
  }

  /**
   * 显示功能解锁条件
   * @param {string} featureId - 功能ID
   */
  showUnlockCondition(featureId) {
    const feature = this.features[featureId];
    if (!feature) return;
    
    const game = window.game;
    const currentLevel = game?.blacksmithNPC?.level || 1;
    const requiredLevel = feature.unlockLevel;
    
    if (feature.unlocked) {
      this.forgeUI.showMessage(`${feature.name} 已解锁`, 'info');
    } else {
      const levelDiff = requiredLevel - currentLevel;
      this.forgeUI.showMessage(
        `${feature.name} 需要铁匠等级 ${requiredLevel}（还需 ${levelDiff} 级）`,
        'info'
      );
    }
  }

  /**
   * 绑定功能卡片点击事件
   */
  bindFeatureCardEvents() {
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
      card.addEventListener('click', () => {
        const featureId = card.dataset.featureId;
        this.showUnlockCondition(featureId);
      });
    });
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理通知
    const notifications = document.querySelectorAll('.feature-unlock-notification');
    notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
}
