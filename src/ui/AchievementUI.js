/**
 * AchievementUI.js
 * 
 * 成就系统UI管理器
 * 负责成就界面的显示和成就解锁弹窗
 */

import { ACHIEVEMENTS, getAllAchievementIds } from '../achievements/AchievementData.js';

export class AchievementUI {
    constructor(game) {
        this.game = game;
        this.metaSaveSystem = game.metaSaveSystem;
        this.isOpen = false;
        
        // DOM 元素引用
        this.elements = {
            overlay: null,
            grid: null,
            notification: null
        };
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化组件
     */
    init() {
        this.createDOMElements();
        this.setupEventListeners();
        this.injectStyles();
        console.log('[AchievementUI] 成就UI已初始化');
    }
    
    /**
     * 创建DOM元素
     */
    createDOMElements() {
        // 创建主菜单成就面板
        const overlay = document.createElement('div');
        overlay.id = 'achievement-overlay';
        overlay.className = 'achievement-overlay hidden';
        
        overlay.innerHTML = `
            <div class="achievement-modal">
                <div class="achievement-header">
                    <button class="achievement-close-btn" aria-label="关闭"></button>
                </div>
                <div class="achievement-grid" id="achievement-grid"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.elements.overlay = overlay;
        this.elements.grid = document.getElementById('achievement-grid');
        
        // 创建局内弹窗（动态创建，不常驻DOM）
        this.createNotificationElement();
    }
    
    /**
     * 创建通知弹窗元素
     */
    createNotificationElement() {
        // 将通知添加到canvas-wrapper容器中，使其相对于地图界面定位
        const canvasWrapper = document.getElementById('canvas-wrapper');
        if (!canvasWrapper) {
            console.warn('[AchievementUI] canvas-wrapper 未找到，使用body作为后备');
            const notification = document.createElement('div');
            notification.id = 'achievement-notification';
            notification.className = 'achievement-notification hidden';
            document.body.appendChild(notification);
            this.elements.notification = notification;
            return;
        }
        
        const notification = document.createElement('div');
        notification.id = 'achievement-notification';
        notification.className = 'achievement-notification hidden';
        canvasWrapper.appendChild(notification);
        this.elements.notification = notification;
    }
    
    /**
     * 注入样式
     */
    injectStyles() {
        // 检查是否已存在样式
        if (document.getElementById('achievement-ui-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'achievement-ui-styles';
        style.textContent = `
            /* 成就解锁通知样式（优化版，参考 QuestUI 的 quest-toast） */
            .achievement-notification {
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                min-width: 380px;
                max-width: 80%;
                min-height: 90px;
                padding: 16px 60px;
                background-image: url('https://i.postimg.cc/263YdzcK/achievementkuang1.png');
                background-size: 100% 100%;
                background-repeat: no-repeat;
                background-position: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                box-sizing: border-box;
                color: #fff;
                text-shadow: 1px 1px 2px #000;
                z-index: 10000;
                pointer-events: none;
                border: none;
                border-radius: 0;
            }

            .achievement-notification.hidden {
                display: none;
            }

            .achievement-notification-header {
                font-size: 0.9rem;
                color: #ffe066;
                letter-spacing: 2px;
                margin-bottom: 8px;
                text-transform: uppercase;
                opacity: 0.9;
                text-shadow: 0 0 4px #000, 0 0 10px #000;
            }

            .achievement-notification-title {
                font-size: 1.8rem;
                color: #ffe066;
                font-weight: bold;
                margin-bottom: 8px;
                text-shadow: 0 0 4px #000, 0 0 10px #000;
                letter-spacing: 1px;
            }

            .achievement-notification-description {
                font-size: 1rem;
                color: #ffffff;
                line-height: 1.4;
                text-shadow: 0 0 4px #000, 0 0 10px #000;
            }
        `;

        document.head.appendChild(style);
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (!this.elements.overlay) return;
        
        // 关闭按钮
        const closeBtn = this.elements.overlay.querySelector('.achievement-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // 点击外部关闭
        this.elements.overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) {
                this.close();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    /**
     * 打开成就界面
     */
    open() {
        if (!this.elements.overlay || !this.elements.grid) {
            console.warn('[AchievementUI] 元素未找到');
            return;
        }

        // 暂停游戏
        if (this.game) {
            this.game.isPaused = true;
            this.game.inputStack = []; // 清空输入防止穿透
        }

        this.isOpen = true;
        this.elements.overlay.classList.remove('hidden');
        this.elements.overlay.style.display = 'flex'; // 确保显示
        this.render();
        
        // Apply smooth transition animation
        const modal = this.elements.overlay.querySelector('.achievement-modal');
        if (modal) {
            modal.classList.remove('modal-animate-exit');
            void modal.offsetWidth;
            modal.classList.add('modal-animate-enter');
        }
    }
    
    /**
     * 关闭成就界面
     */
    close() {
        if (this.elements.overlay) {
            // 1. 内容离场动画
            const modal = this.elements.overlay.querySelector('.achievement-modal');
            if (modal) {
                modal.classList.remove('modal-animate-enter');
                modal.classList.add('modal-animate-exit');
            }

            // 2. 背景淡出
            this.elements.overlay.classList.add('overlay-fade-out');

            // 3. 延时隐藏
            setTimeout(() => {
                this.elements.overlay.classList.add('hidden');
                this.elements.overlay.style.display = 'none';
                
                // 重置状态
                this.elements.overlay.classList.remove('overlay-fade-out');
                if (modal) {
                    modal.classList.remove('modal-animate-exit');
                }
            }, 250);
        }
        this.isOpen = false;

        // 恢复游戏
        if (this.game) {
            this.game.isPaused = false;
        }
    }
    
    /**
     * 渲染成就列表
     */
    render() {
        if (!this.elements.grid) return;
        
        const achievementIds = getAllAchievementIds();
        this.elements.grid.innerHTML = '';
        
        achievementIds.forEach(id => {
            const achievement = ACHIEVEMENTS[id];
            if (!achievement) return;
            
            const isUnlocked = this.metaSaveSystem.isAchievementUnlocked(id);
            const card = this.createAchievementCard(achievement, isUnlocked);
            this.elements.grid.appendChild(card);
        });
    }
    
    /**
     * 创建成就卡片
     * @param {object} achievement - 成就数据
     * @param {boolean} isUnlocked - 是否已解锁
     */
    createAchievementCard(achievement, isUnlocked) {
        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        if (isUnlocked) {
            // 已解锁：显示标题和描述
            card.innerHTML = `
                <div class="achievement-card-title">${achievement.title}</div>
                <div class="achievement-card-description">${achievement.description}</div>
            `;
        } else {
            // 未解锁：显示"???"和线索
            card.innerHTML = `
                <div class="achievement-card-title">???</div>
                <div class="achievement-card-hint">${achievement.hint}</div>
            `;
        }
        
        return card;
    }
    
    /**
     * 显示成就解锁通知（局内弹窗）
     * @param {object} achievement - 成就数据
     */
    showNotification(achievement) {
        if (!this.elements.notification) {
            this.createNotificationElement();
        }
        
        const notification = this.elements.notification;
        
        // 设置内容
        notification.innerHTML = `
            <div class="achievement-notification-header">成就解锁</div>
            <div class="achievement-notification-title">${achievement.title}</div>
            <div class="achievement-notification-description">${achievement.description}</div>
        `;
        
        // 显示动画
        notification.classList.remove('hidden');
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(20px)';
        
        // Fade In
        requestAnimationFrame(() => {
            notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // 3秒后 Fade Out
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 500);
        }, 3000);
    }
}

