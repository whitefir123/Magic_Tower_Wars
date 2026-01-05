// LeaderboardUI.js - 排行榜界面
// 显示全局排行榜，支持点击查看详细信息

import { supabaseService } from '../services/SupabaseService.js';

export class LeaderboardUI {
  constructor(game) {
    this.game = game;
    this.currentData = [];
    this.selectedDifficulty = null; // null 表示所有难度
    this.currentTab = 'global'; // 'global'、'seasonal' 或 'daily'
    this.seasonCountdownInterval = null; // 赛季倒计时定时器
    
    // 创建排行榜容器（如果不存在）
    this.ensureLeaderboardContainer();
  }

  /**
   * 确保排行榜容器存在
   */
  ensureLeaderboardContainer() {
    let container = document.getElementById('leaderboard-panel');
    if (!container) {
      container = document.createElement('div');
      container.id = 'leaderboard-panel';
      container.className = 'leaderboard-panel hidden';
      container.innerHTML = `
        <div class="leaderboard-content">
          <div class="leaderboard-header">
            <h2>排行榜</h2>
            <button class="leaderboard-close-btn" onclick="game.closeLeaderboard()" aria-label="关闭"></button>
          </div>
          
          <div class="leaderboard-tabs">
            <button class="tab-btn active" data-tab="global">全局排行榜</button>
            <button class="tab-btn" data-tab="seasonal">当前赛季</button>
            <button class="tab-btn" data-tab="daily">每日挑战</button>
          </div>
          
          <div id="season-info" class="season-info hidden">
            <div class="season-name" id="season-name">-</div>
            <div class="season-countdown" id="season-countdown">-</div>
          </div>
          
          <div id="leaderboard-global-content">
            <div class="leaderboard-filters">
              <button class="filter-btn active" data-difficulty="">全部</button>
              <button class="filter-btn" data-difficulty="normal">普通</button>
              <button class="filter-btn" data-difficulty="hard">困难</button>
              <button class="filter-btn" data-difficulty="nightmare">噩梦</button>
            </div>
            
            <div class="leaderboard-table-wrapper">
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>昵称</th>
                    <th>分数</th>
                    <th>层数</th>
                    <th>击杀</th>
                    <th>伤害</th>
                    <th>时间</th>
                    <th>难度</th>
                    <th>角色</th>
                  </tr>
                </thead>
                <tbody id="leaderboard-tbody">
                  <tr>
                    <td colspan="9" class="loading-row">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div id="leaderboard-seasonal-content" class="hidden">
            <div class="leaderboard-filters">
              <button class="filter-btn active" data-difficulty="">全部</button>
              <button class="filter-btn" data-difficulty="normal">普通</button>
              <button class="filter-btn" data-difficulty="hard">困难</button>
              <button class="filter-btn" data-difficulty="nightmare">噩梦</button>
            </div>
            
            <div class="leaderboard-table-wrapper">
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>昵称</th>
                    <th>分数</th>
                    <th>层数</th>
                    <th>击杀</th>
                    <th>伤害</th>
                    <th>时间</th>
                    <th>难度</th>
                    <th>角色</th>
                  </tr>
                </thead>
                <tbody id="seasonal-leaderboard-tbody">
                  <tr>
                    <td colspan="9" class="loading-row">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div id="leaderboard-daily-content" class="hidden">
            <div class="daily-leaderboard-header">
              <h3 id="daily-leaderboard-title">每日挑战排行榜</h3>
            </div>
            
            <div class="leaderboard-table-wrapper">
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>昵称</th>
                    <th>分数</th>
                    <th>层数</th>
                    <th>击杀</th>
                    <th>伤害</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody id="daily-leaderboard-tbody">
                  <tr>
                    <td colspan="7" class="loading-row">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      // 绑定标签页切换按钮事件
      const tabBtns = container.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          this.switchTab(tab);
          
          // 更新按钮状态
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // 绑定难度筛选按钮事件（全局和赛季共用）
      const filterBtns = container.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const difficulty = btn.getAttribute('data-difficulty');
          
          // 根据当前Tab决定调用哪个筛选方法
          if (this.currentTab === 'seasonal') {
            this.filterSeasonalByDifficulty(difficulty);
          } else {
            this.filterByDifficulty(difficulty);
          }
          
          // 更新按钮状态（只更新当前Tab的筛选按钮）
          const currentTabContent = this.currentTab === 'seasonal' 
            ? document.getElementById('leaderboard-seasonal-content')
            : document.getElementById('leaderboard-global-content');
          if (currentTabContent) {
            const currentFilterBtns = currentTabContent.querySelectorAll('.filter-btn');
            currentFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        });
      });
    }
  }

  /**
   * 切换标签页
   * @param {string} tab - 'global'、'seasonal' 或 'daily'
   */
  switchTab(tab) {
    this.currentTab = tab;
    
    const globalContent = document.getElementById('leaderboard-global-content');
    const seasonalContent = document.getElementById('leaderboard-seasonal-content');
    const dailyContent = document.getElementById('leaderboard-daily-content');
    const seasonInfo = document.getElementById('season-info');
    
    // 隐藏所有内容
    if (globalContent) globalContent.classList.add('hidden');
    if (seasonalContent) seasonalContent.classList.add('hidden');
    if (dailyContent) dailyContent.classList.add('hidden');
    if (seasonInfo) seasonInfo.classList.add('hidden');
    
    if (tab === 'daily') {
      // 显示每日挑战内容
      if (dailyContent) dailyContent.classList.remove('hidden');
      
      // 停止赛季倒计时
      this.stopSeasonCountdown();
      
      // 加载每日排行榜
      this.loadDailyLeaderboard();
    } else if (tab === 'seasonal') {
      // 显示赛季排行榜内容
      if (seasonalContent) seasonalContent.classList.remove('hidden');
      if (seasonInfo) seasonInfo.classList.remove('hidden');
      
      // 加载赛季排行榜
      this.loadSeasonalLeaderboard();
      
      // 启动赛季倒计时
      this.startSeasonCountdown();
    } else {
      // 显示全局排行榜内容
      if (globalContent) globalContent.classList.remove('hidden');
      
      // 停止赛季倒计时
      this.stopSeasonCountdown();
      
      // 加载全局排行榜
      this.loadLeaderboard(this.selectedDifficulty);
    }
  }

  /**
   * 打开排行榜面板
   */
  async open() {
    let container = document.getElementById('leaderboard-panel');
    if (!container) {
      this.ensureLeaderboardContainer();
    }
    // 重新获取（确保不为null）
    const el = document.getElementById('leaderboard-panel');
    if (!el) return;
    
    // 🔴 关键修复：清除 hidden 类并强制设置 display，覆盖 close() 留下的样式
    el.classList.remove('hidden');
    el.style.display = 'flex';
    el.style.opacity = '1'; // 确保可见
    
    // 暂停游戏（如果游戏已开始）
    if (this.game.gameStarted) {
      this.game.isPaused = true;
      this.game.inputStack = [];
    }

    // 动画处理
    const content = el.querySelector('.leaderboard-content');
    if (content) {
      content.classList.remove('modal-animate-exit'); // 移除离场类
      content.classList.remove('leaderboard-animate-enter'); // 移除旧类
      void content.offsetWidth; // 强制重排
      content.classList.add('modal-animate-enter'); // 添加新进场类
    }

    // 根据当前标签页加载相应的排行榜数据
    if (this.currentTab === 'daily') {
      await this.loadDailyLeaderboard();
    } else if (this.currentTab === 'seasonal') {
      await this.loadSeasonalLeaderboard();
      this.startSeasonCountdown();
    } else {
      await this.loadLeaderboard();
    }
  }

  /**
   * 关闭排行榜面板
   */
  close() {
    const container = document.getElementById('leaderboard-panel');
    if (container) {
      // 1. 移除入场动画，添加离场动画
      const content = container.querySelector('.leaderboard-content');
      if (content) {
        content.classList.remove('leaderboard-animate-enter');
        content.classList.add('modal-animate-exit');
      }

      // 2. 背景淡出 (利用 CSS transition)
      container.style.opacity = '0';

      // 3. 等待动画结束后隐藏
      setTimeout(() => {
        container.classList.add('hidden');
        container.style.display = 'none'; // 确保完全隐藏
        
        // 重置状态供下次使用
        container.style.opacity = '1'; 
        if (content) {
          content.classList.remove('modal-animate-exit');
        }
      }, 250);
    }

    // 恢复游戏（如果游戏已开始）
    if (this.game.gameStarted) {
      this.game.isPaused = false;
    }
  }

  /**
   * 加载排行榜数据
   */
  async loadLeaderboard(difficulty = null) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    // 显示加载状态
    tbody.innerHTML = '<tr><td colspan="9" class="loading-row">⏳ 加载中...</td></tr>';

    try {
      // 获取排行榜数据
      const result = await supabaseService.getTopRuns(50, difficulty);
      
      // 处理新的返回格式（包含 success, data, error）
      if (!result.success) {
        console.error('[LeaderboardUI] 排行榜加载失败:', result.error);
        this.renderErrorState(result.error, difficulty);
        return;
      }

      const data = result.data || [];
      this.currentData = data;

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">暂无记录</td></tr>';
        return;
      }

      // 渲染表格
      this.renderTable(data);
    } catch (error) {
      console.error('[LeaderboardUI] 加载排行榜异常:', JSON.stringify(error, null, 2));
      
      // 检测是否为超时错误
      const isTimeout = error.name === 'AbortError' || 
                        error.message?.includes('timeout') || 
                        error.message?.includes('Timeout') ||
                        error.message?.includes('timed out');
      
      this.renderErrorState(error.message || '未知错误', difficulty, isTimeout);
    }
  }

  /**
   * 渲染错误状态（包含重试按钮）
   * @param {string} errorMessage - 错误消息
   * @param {string|null} difficulty - 当前难度筛选
   * @param {boolean} isTimeout - 是否为超时错误
   */
  renderErrorState(errorMessage, difficulty = null, isTimeout = false) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    // 生成唯一的重试按钮 ID
    const retryBtnId = 'leaderboard-retry-btn-' + Date.now();

    // 根据错误类型显示不同的消息
    let errorIcon = '';
    let errorTitle = '排行榜加载失败';
    let errorDesc = this.escapeHtml(errorMessage);

    if (isTimeout) {
      errorIcon = '';
      errorTitle = '连接超时或服务器休眠中';
      errorDesc = 'Connection Timeout - 服务器可能正在休眠，请点击重试唤醒';
    } else if (errorMessage?.includes('network') || errorMessage?.includes('网络')) {
      errorIcon = '';
      errorTitle = '网络连接失败';
      errorDesc = '请检查您的网络连接';
    } else if (errorMessage?.includes('column') || errorMessage?.includes('列')) {
      errorIcon = '';
      errorTitle = '数据库架构不匹配';
      errorDesc = this.escapeHtml(errorMessage);
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="error-state-cell">
          <div class="error-state-container">
            <div class="error-icon">${errorIcon}</div>
            <div class="error-title">${errorTitle}</div>
            <div class="error-message">${errorDesc}</div>
            <button id="${retryBtnId}" class="btn-retry">
              重试 (Retry)
            </button>
          </div>
        </td>
      </tr>
    `;

    // 绑定重试按钮事件
    setTimeout(() => {
      const retryBtn = document.getElementById(retryBtnId);
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          console.log('[LeaderboardUI] 用户点击重试按钮');
          this.loadLeaderboard(difficulty);
        });
      }
    }, 100);

    // 显示 Toast 提示
    this.showErrorToast(`${errorIcon} ${errorTitle}`);
  }

  /**
   * 渲染排行榜表格
   */
  renderTable(data) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'leaderboard-row';
      row.setAttribute('data-entry', JSON.stringify(entry));
      
      // 根据排名添加特殊样式
      if (entry.rank === 1) row.classList.add('rank-1');
      else if (entry.rank === 2) row.classList.add('rank-2');
      else if (entry.rank === 3) row.classList.add('rank-3');

      // 格式化难度显示
      const difficultyMap = {
        'normal': '普通',
        'hard': '困难',
        'nightmare': '噩梦'
      };
      const difficultyText = difficultyMap[entry.difficulty] || entry.difficulty;

      // 格式化角色显示
      const characterMap = {
        'WARRIOR': '战士',
        'MAGE': '法师',
        'ROGUE': '盗贼'
      };
      const characterText = characterMap[entry.character] || entry.character;

      // 格式化时间显示 (MM:SS)
      const timeStr = this.formatTime(entry.timeSeconds || 0);

      row.innerHTML = `
        <td class="rank-cell">${this.getRankIcon(entry.rank)}</td>
        <td class="nickname-cell">${this.escapeHtml(entry.nickname)}</td>
        <td class="score-cell">${this.formatNumber(entry.score)}</td>
        <td class="floor-cell">${entry.floor}</td>
        <td class="kills-cell">${entry.kills || 0}</td>
        <td class="damage-cell">${this.formatNumber(entry.damage || 0)}</td>
        <td class="time-cell">${timeStr}</td>
        <td class="difficulty-cell">${difficultyText}</td>
        <td class="character-cell">${characterText}</td>
      `;

      // 点击行显示详情
      row.addEventListener('click', () => {
        this.showDetailModal(entry);
      });

      tbody.appendChild(row);
    });
  }

  /**
   * 获取排名图标
   * 移除 Emoji 占位符，统一使用纯数字显示
   */
  getRankIcon(rank) {
    return rank;
  }

  /**
   * 格式化数字（添加千位分隔符）
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * 格式化时间为 MM:SS 格式
   * @param {number} seconds - 总秒数
   * @returns {string} 格式化的时间字符串
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 转义 HTML，防止 XSS 攻击
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 按难度筛选（全局排行榜）
   */
  async filterByDifficulty(difficulty) {
    this.selectedDifficulty = difficulty || null;
    await this.loadLeaderboard(this.selectedDifficulty);
  }

  /**
   * 按难度筛选（赛季排行榜）
   */
  async filterSeasonalByDifficulty(difficulty) {
    this.selectedDifficulty = difficulty || null;
    await this.loadSeasonalLeaderboard();
  }

  /**
   * 显示详细信息模态框
   */
  showDetailModal(entry) {
    // 创建模态框
    let modal = document.getElementById('leaderboard-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'leaderboard-detail-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    // 格式化时间
    const minutes = Math.floor(entry.timeSeconds / 60);
    const seconds = entry.timeSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // 格式化难度
    const difficultyMap = {
      'normal': '普通',
      'hard': '困难',
      'nightmare': '噩梦'
    };
    const difficultyText = difficultyMap[entry.difficulty] || entry.difficulty;

    // 格式化角色
    const characterMap = {
      'WARRIOR': '战士',
      'MAGE': '法师',
      'ROGUE': '盗贼'
    };
    const characterText = characterMap[entry.character] || entry.character;

    // 构建装备列表
    let equipmentHTML = '';
    if (entry.details && entry.details.equipment) {
      const equipment = entry.details.equipment;
      const slots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
      const slotNames = {
        'WEAPON': '武器',
        'ARMOR': '护甲',
        'HELM': '头盔',
        'BOOTS': '靴子',
        'RING': '戒指',
        'AMULET': '项链',
        'ACCESSORY': '饰品'
      };

      equipmentHTML = '<div class="equipment-grid">';
      slots.forEach(slot => {
        const item = equipment[slot];
        if (item) {
          equipmentHTML += `
            <div class="equipment-item">
              <span class="equipment-slot">${slotNames[slot]}</span>
              <span class="equipment-name">${this.escapeHtml(item)}</span>
            </div>
          `;
        }
      });
      equipmentHTML += '</div>';
    } else {
      equipmentHTML = '<p class="no-equipment">无装备信息</p>';
    }

    // 构建最终属性
    let statsHTML = '';
    if (entry.details && entry.details.stats) {
      const stats = entry.details.stats;
      statsHTML = `
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">生命值</span>
            <span class="stat-value">${stats.hp || 0} / ${stats.maxHp || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">物理攻击</span>
            <span class="stat-value">${stats.p_atk || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">魔法攻击</span>
            <span class="stat-value">${stats.m_atk || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">物理防御</span>
            <span class="stat-value">${stats.p_def || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">魔法防御</span>
            <span class="stat-value">${stats.m_def || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">金币</span>
            <span class="stat-value">${stats.gold || 0}</span>
          </div>
        </div>
      `;
    } else {
      statsHTML = '<p class="no-stats">无属性信息</p>';
    }

    modal.innerHTML = `
      <div class="modal-content leaderboard-detail-content">
        <div class="modal-header">
          <h3>挑战详情</h3>
          <button class="close-btn" onclick="document.getElementById('leaderboard-detail-modal').remove()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">玩家</span>
                <span class="info-value">${this.escapeHtml(entry.nickname)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">角色</span>
                <span class="info-value">${characterText}</span>
              </div>
              <div class="info-item">
                <span class="info-label">难度</span>
                <span class="info-value">${difficultyText}</span>
              </div>
              <div class="info-item">
                <span class="info-label">总分</span>
                <span class="info-value highlight">${this.formatNumber(entry.score)}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>战斗统计</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">到达层数</span>
                <span class="info-value">${entry.floor}</span>
              </div>
              <div class="info-item">
                <span class="info-label">击杀数</span>
                <span class="info-value">${entry.kills}</span>
              </div>
              <div class="info-item">
                <span class="info-label">总伤害</span>
                <span class="info-value">${this.formatNumber(entry.damage)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">游戏时长</span>
                <span class="info-value">${timeStr}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>装备信息</h4>
            ${equipmentHTML}
          </div>

          <div class="detail-section">
            <h4>最终属性</h4>
            ${statsHTML}
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * 显示错误提示（Toast）
   * @param {string} message - 错误消息
   */
  showErrorToast(message) {
    // 创建 Toast 元素
    let toast = document.getElementById('leaderboard-error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'leaderboard-error-toast';
      toast.className = 'error-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    // 3秒后自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  /**
   * 加载每日挑战排行榜
   */
  async loadDailyLeaderboard() {
    const tbody = document.getElementById('daily-leaderboard-tbody');
    const titleElement = document.getElementById('daily-leaderboard-title');
    
    if (!tbody) return;

    // 显示加载状态
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">⏳ 加载中...</td></tr>';

    // 获取当前日期 (YYYY-MM-DD 格式)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 更新标题显示当前日期
    if (titleElement) {
      titleElement.textContent = `${dateStr} 挑战`;
    }

    try {
      // 获取每日排行榜数据
      const result = await supabaseService.getDailyLeaderboard(dateStr);
      
      if (!result.success) {
        console.error('[LeaderboardUI] 每日排行榜加载失败:', result.error);
        this.renderDailyErrorState(result.error);
        return;
      }

      const data = result.data || [];
      this.currentData = data;

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">今日暂无记录</td></tr>';
        return;
      }

      // 渲染表格
      this.renderDailyTable(data);
    } catch (error) {
      console.error('[LeaderboardUI] 加载每日排行榜异常:', JSON.stringify(error, null, 2));
      
      // 检测是否为超时错误
      const isTimeout = error.name === 'AbortError' || 
                        error.message?.includes('timeout') || 
                        error.message?.includes('Timeout') ||
                        error.message?.includes('timed out');
      
      this.renderDailyErrorState(error.message || '未知错误', isTimeout);
    }
  }

  /**
   * 渲染每日排行榜表格
   */
  renderDailyTable(data) {
    const tbody = document.getElementById('daily-leaderboard-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'leaderboard-row';
      row.setAttribute('data-entry', JSON.stringify(entry));
      
      // 根据排名添加特殊样式
      if (entry.rank === 1) row.classList.add('rank-1');
      else if (entry.rank === 2) row.classList.add('rank-2');
      else if (entry.rank === 3) row.classList.add('rank-3');

      // 从 details 中提取信息
      const details = entry.details || {};
      const floor = details.floor || 0;
      const kills = details.kills || 0;
      const damage = details.damage || 0;
      const timeSeconds = details.timeSeconds || 0;

      // 格式化时间显示 (MM:SS)
      const timeStr = this.formatTime(timeSeconds);

      row.innerHTML = `
        <td class="rank-cell">${this.getRankIcon(entry.rank)}</td>
        <td class="nickname-cell">${this.escapeHtml(entry.nickname)}</td>
        <td class="score-cell">${this.formatNumber(entry.score)}</td>
        <td class="floor-cell">${floor}</td>
        <td class="kills-cell">${kills}</td>
        <td class="damage-cell">${this.formatNumber(damage)}</td>
        <td class="time-cell">${timeStr}</td>
      `;

      // 点击行显示详情
      row.addEventListener('click', () => {
        this.showDailyDetailModal(entry);
      });

      tbody.appendChild(row);
    });
  }

  /**
   * 渲染每日排行榜错误状态
   */
  renderDailyErrorState(errorMessage, isTimeout = false) {
    const tbody = document.getElementById('daily-leaderboard-tbody');
    if (!tbody) return;

    // 生成唯一的重试按钮 ID
    const retryBtnId = 'daily-leaderboard-retry-btn-' + Date.now();

    // 根据错误类型显示不同的消息
    let errorIcon = '';
    let errorTitle = '每日排行榜加载失败';
    let errorDesc = this.escapeHtml(errorMessage);

    if (isTimeout) {
      errorIcon = '';
      errorTitle = '连接超时或服务器休眠中';
      errorDesc = 'Connection Timeout - 服务器可能正在休眠，请点击重试唤醒';
    } else if (errorMessage?.includes('network') || errorMessage?.includes('网络')) {
      errorIcon = '';
      errorTitle = '网络连接失败';
      errorDesc = '请检查您的网络连接';
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="error-state-cell">
          <div class="error-state-container">
            <div class="error-icon">${errorIcon}</div>
            <div class="error-title">${errorTitle}</div>
            <div class="error-message">${errorDesc}</div>
            <button id="${retryBtnId}" class="btn-retry">
              重试 (Retry)
            </button>
          </div>
        </td>
      </tr>
    `;

    // 绑定重试按钮事件
    setTimeout(() => {
      const retryBtn = document.getElementById(retryBtnId);
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          console.log('[LeaderboardUI] 用户点击每日排行榜重试按钮');
          this.loadDailyLeaderboard();
        });
      }
    }, 100);

    // 显示 Toast 提示
    this.showErrorToast(`${errorIcon} ${errorTitle}`);
  }

  /**
   * 显示每日挑战详细信息模态框
   */
  showDailyDetailModal(entry) {
    // 创建模态框
    let modal = document.getElementById('daily-leaderboard-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'daily-leaderboard-detail-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const details = entry.details || {};
    const floor = details.floor || 0;
    const kills = details.kills || 0;
    const damage = details.damage || 0;
    const timeSeconds = details.timeSeconds || 0;
    const timeStr = this.formatTime(timeSeconds);

    modal.innerHTML = `
      <div class="modal-content leaderboard-detail-content">
        <div class="modal-header">
          <h3>每日挑战详情</h3>
          <button class="close-btn" onclick="document.getElementById('daily-leaderboard-detail-modal').remove()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">玩家</span>
                <span class="info-value">${this.escapeHtml(entry.nickname)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">日期</span>
                <span class="info-value">${entry.dateStr}</span>
              </div>
              <div class="info-item">
                <span class="info-label">排名</span>
                <span class="info-value">第 ${entry.rank} 名</span>
              </div>
              <div class="info-item">
                <span class="info-label">总分</span>
                <span class="info-value highlight">${this.formatNumber(entry.score)}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>战斗统计</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">到达层数</span>
                <span class="info-value">${floor}</span>
              </div>
              <div class="info-item">
                <span class="info-label">击杀数</span>
                <span class="info-value">${kills}</span>
              </div>
              <div class="info-item">
                <span class="info-label">总伤害</span>
                <span class="info-value">${this.formatNumber(damage)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">游戏时长</span>
                <span class="info-value">${timeStr}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * 加载赛季排行榜
   */
  async loadSeasonalLeaderboard() {
    const tbody = document.getElementById('seasonal-leaderboard-tbody');
    if (!tbody) return;

    // 显示加载状态
    tbody.innerHTML = '<tr><td colspan="9" class="loading-row">⏳ 加载中...</td></tr>';

    try {
      // 获取当前赛季
      const currentSeason = supabaseService.currentSeason;
      
      if (!currentSeason) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">当前处于休赛期</td></tr>';
        
        // 更新赛季信息显示
        const seasonNameEl = document.getElementById('season-name');
        const seasonCountdownEl = document.getElementById('season-countdown');
        if (seasonNameEl) seasonNameEl.textContent = '当前处于休赛期';
        if (seasonCountdownEl) seasonCountdownEl.textContent = '-';
        
        return;
      }

      // 更新赛季信息显示
      const seasonNameEl = document.getElementById('season-name');
      if (seasonNameEl) {
        seasonNameEl.textContent = `${currentSeason.code} ${currentSeason.name}`;
      }

      // 获取赛季排行榜数据（支持难度筛选）
      const result = await supabaseService.getSeasonalLeaderboard(currentSeason.id, 50, this.selectedDifficulty);
      
      if (!result.success) {
        console.error('[LeaderboardUI] 赛季排行榜加载失败:', result.error);
        this.renderSeasonalErrorState(result.error);
        return;
      }

      const data = result.data || [];
      this.currentData = data;

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">暂无记录</td></tr>';
        return;
      }

      // 渲染表格
      this.renderSeasonalTable(data);
    } catch (error) {
      console.error('[LeaderboardUI] 加载赛季排行榜异常:', JSON.stringify(error, null, 2));
      
      // 检测是否为超时错误
      const isTimeout = error.name === 'AbortError' || 
                        error.message?.includes('timeout') || 
                        error.message?.includes('Timeout') ||
                        error.message?.includes('timed out');
      
      this.renderSeasonalErrorState(error.message || '未知错误', isTimeout);
    }
  }

  /**
   * 渲染赛季排行榜表格
   */
  renderSeasonalTable(data) {
    const tbody = document.getElementById('seasonal-leaderboard-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'leaderboard-row';
      row.setAttribute('data-entry', JSON.stringify(entry));
      
      // 根据排名添加特殊样式
      if (entry.rank === 1) row.classList.add('rank-1');
      else if (entry.rank === 2) row.classList.add('rank-2');
      else if (entry.rank === 3) row.classList.add('rank-3');

      // 格式化难度显示
      const difficultyMap = {
        'normal': '普通',
        'hard': '困难',
        'nightmare': '噩梦'
      };
      const difficultyText = difficultyMap[entry.difficulty] || entry.difficulty;

      // 格式化角色显示
      const characterMap = {
        'WARRIOR': '战士',
        'MAGE': '法师',
        'ROGUE': '盗贼'
      };
      const characterText = characterMap[entry.character] || entry.character;

      // 格式化时间显示 (MM:SS)
      const timeStr = this.formatTime(entry.timeSeconds || 0);

      row.innerHTML = `
        <td class="rank-cell">${this.getRankIcon(entry.rank)}</td>
        <td class="nickname-cell">${this.escapeHtml(entry.nickname)}</td>
        <td class="score-cell">${this.formatNumber(entry.score)}</td>
        <td class="floor-cell">${entry.floor}</td>
        <td class="kills-cell">${entry.kills || 0}</td>
        <td class="damage-cell">${this.formatNumber(entry.damage || 0)}</td>
        <td class="time-cell">${timeStr}</td>
        <td class="difficulty-cell">${difficultyText}</td>
        <td class="character-cell">${characterText}</td>
      `;

      // 点击行显示详情
      row.addEventListener('click', () => {
        this.showDetailModal(entry);
      });

      tbody.appendChild(row);
    });
  }

  /**
   * 渲染赛季排行榜错误状态
   */
  renderSeasonalErrorState(errorMessage, isTimeout = false) {
    const tbody = document.getElementById('seasonal-leaderboard-tbody');
    if (!tbody) return;

    // 生成唯一的重试按钮 ID
    const retryBtnId = 'seasonal-leaderboard-retry-btn-' + Date.now();

    // 根据错误类型显示不同的消息
    let errorIcon = '';
    let errorTitle = '赛季排行榜加载失败';
    let errorDesc = this.escapeHtml(errorMessage);

    if (isTimeout) {
      errorIcon = '';
      errorTitle = '连接超时或服务器休眠中';
      errorDesc = 'Connection Timeout - 服务器可能正在休眠，请点击重试唤醒';
    } else if (errorMessage?.includes('network') || errorMessage?.includes('网络')) {
      errorIcon = '';
      errorTitle = '网络连接失败';
      errorDesc = '请检查您的网络连接';
    } else if (errorMessage?.includes('NO_CURRENT_SEASON') || errorMessage?.includes('休赛期')) {
      errorIcon = '';
      errorTitle = '当前处于休赛期';
      errorDesc = '没有进行中的赛季，请等待新赛季开始';
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="error-state-cell">
          <div class="error-state-container">
            <div class="error-icon">${errorIcon}</div>
            <div class="error-title">${errorTitle}</div>
            <div class="error-message">${errorDesc}</div>
            <button id="${retryBtnId}" class="btn-retry">
              重试 (Retry)
            </button>
          </div>
        </td>
      </tr>
    `;

    // 绑定重试按钮事件
    setTimeout(() => {
      const retryBtn = document.getElementById(retryBtnId);
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          console.log('[LeaderboardUI] 用户点击赛季排行榜重试按钮');
          this.loadSeasonalLeaderboard();
        });
      }
    }, 100);

    // 显示 Toast 提示
    this.showErrorToast(`${errorIcon} ${errorTitle}`);
  }

  /**
   * 启动赛季倒计时
   */
  startSeasonCountdown() {
    // 清除之前的定时器
    this.stopSeasonCountdown();

    const updateCountdown = () => {
      const currentSeason = supabaseService.currentSeason;
      const countdownEl = document.getElementById('season-countdown');
      
      if (!currentSeason || !countdownEl) {
        return;
      }

      const now = new Date();
      const endDate = new Date(currentSeason.end_at);
      const diff = endDate - now;

      if (diff <= 0) {
        countdownEl.textContent = '赛季已结束';
        this.stopSeasonCountdown();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        countdownEl.textContent = `剩余 ${days}天 ${hours}小时`;
      } else if (hours > 0) {
        countdownEl.textContent = `剩余 ${hours}小时 ${minutes}分钟`;
      } else if (minutes > 0) {
        countdownEl.textContent = `剩余 ${minutes}分钟 ${seconds}秒`;
      } else {
        countdownEl.textContent = `剩余 ${seconds}秒`;
      }
    };

    // 立即更新一次
    updateCountdown();

    // 每秒更新一次
    this.seasonCountdownInterval = setInterval(updateCountdown, 1000);
  }

  /**
   * 停止赛季倒计时
   */
  stopSeasonCountdown() {
    if (this.seasonCountdownInterval) {
      clearInterval(this.seasonCountdownInterval);
      this.seasonCountdownInterval = null;
    }
  }

  /**
   * 显示赛季奖励弹窗
   * @param {Object} rewardData - 奖励数据 { rank, reward, season }
   */
  showSeasonRewardModal(rewardData) {
    const { rank, reward, season } = rewardData;

    // 创建模态框
    let modal = document.getElementById('season-reward-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'season-reward-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const seasonName = season ? `${season.code} ${season.name}` : '上赛季';

    modal.innerHTML = `
      <div class="modal-content season-reward-content">
        <div class="modal-header">
          <h3>🎉 赛季奖励结算</h3>
          <button class="close-btn" onclick="document.getElementById('season-reward-modal').remove()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="reward-section">
            <div class="reward-season">${seasonName}</div>
            <div class="reward-rank">第 ${rank} 名</div>
            <div class="reward-amount">
              <span class="reward-label">获得奖励：</span>
              <span class="reward-value">${this.formatNumber(reward)} 灵魂水晶</span>
            </div>
            <div class="reward-note">奖励已自动发放到您的账户</div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-primary" onclick="document.getElementById('season-reward-modal').remove()">确定</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

