/**
 * TalentTreeUI.js
 * 
 * POE风格天赋树UI系统
 * 支持拖拽平移、滚轮缩放、节点交互
 */

import { 
    TALENT_TREE_DATA, 
    TALENT_NODE_TYPES,
    getTalentTreeConnections, 
    isNodeReachable,
    calculateTotalStats,
    getActiveKeystones,
    KEYSTONE_EFFECTS
} from './TalentData.js';
import { TALENT_ASSETS, TALENT_VISUALS } from './constants.js';

export class TalentTreeUI {
    constructor(gameInstance) {
        this.game = gameInstance;
        
        // UI元素
        this.container = null;
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.nodeContainer = null;
        this.tooltip = null;
        this.statsPanel = null;
        
        // ✅ FIX: 保存事件监听器引用，用于后续移除（防止内存泄漏）
        this.boundMouseMove = null;
        this.boundMouseUp = null;
        this.boundResize = null;
        
        // 视口状态
        this.viewport = {
            x: 0,
            y: 0,
            scale: 1.0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            lastX: 0,
            lastY: 0
        };
        
        // 节点DOM元素缓存
        this.nodeElements = new Map();
        
        // 连接线数据
        this.connections = getTalentTreeConnections();
        
        this.isVisible = false;
    }
    
    /**
     * 创建并显示天赋树UI
     */
    show() {
        if (this.isVisible) return;
        
        // ✅ FIX: 暂停游戏，防止输入穿透
        if (this.game) {
            this.game.isPaused = true;
            this.game.inputStack = [];
        }
        
        this.createUI();
        this.renderConnections();
        this.renderNodes();
        this.updateStatsPanel();
        this.centerView();
        
        this.isVisible = true;
        
        // 播放打开动画
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
        });
    }
    
    /**
     * 隐藏天赋树UI
     */
    hide() {
        if (!this.isVisible) return;
        
        // ✅ FIX: 恢复游戏，允许输入
        if (this.game) {
            this.game.isPaused = false;
        }
        
        this.overlay.style.opacity = '0';
        
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.cleanup();
            this.isVisible = false;
        }, 300);
    }
    
    /**
     * 创建UI结构
     */
    createUI() {
        // 创建全屏遮罩 - 使用 flex 布局，统一容器结构
        this.overlay = document.createElement('div');
        this.overlay.className = 'talent-tree-overlay';
        
        // 背景图片现在完全由 CSS 类控制，只设置必要的内联样式
        // CSS 中的 .talent-tree-overlay 已经设置了背景图片
        this.overlay.style.cssText = `opacity: 0; transition: opacity 0.3s ease;`;
        
        // ========== Header 区域：标题 + 灵魂结晶 + 关闭按钮 ==========
        const header = document.createElement('div');
        header.className = 'talent-tree-header';
        
        // 标题区域（左侧）
        const title = document.createElement('div');
        title.innerHTML = ``;
        header.appendChild(title);
        
        // 中间区域：灵魂水晶显示（位于标题右侧，关闭按钮左侧）
        const headerCenter = document.createElement('div');
        headerCenter.style.cssText = 'flex: 1; display: flex; justify-content: center;';
        
        const crystalDisplay = document.createElement('div');
        crystalDisplay.className = 'talent-sc-display';
        const currentSC = this.game.metaSaveSystem ? this.game.metaSaveSystem.data.soulCrystals || 0 : 0;
        crystalDisplay.innerHTML = `
            <img src="https://i.postimg.cc/CKS2nRQG/linghunjiejing1.png" 
                 alt="灵魂结晶" 
                 style="width: 28px; height: 28px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));" />
            <span>${currentSC} 灵魂水晶</span>
        `;
        headerCenter.appendChild(crystalDisplay);
        header.appendChild(headerCenter);
        this.scDisplay = crystalDisplay;
        
        this.overlay.appendChild(header);
        
        // 关闭按钮（右侧）- 从 header 中脱离，直接添加到 overlay，使用绝对定位保持位置
        const closeBtn = document.createElement('button');
        closeBtn.className = 'talent-close-btn';
        closeBtn.setAttribute('aria-label', '关闭');
        closeBtn.onclick = () => {
            this.hide();
            if (this.game && this.game.closeTalentTree) {
                this.game.closeTalentTree();
            }
        };
        this.overlay.appendChild(closeBtn);
        
        // ========== 主容器：Canvas（底层） + DOM节点（上层） ==========
        this.container = document.createElement('div');
        this.container.className = 'talent-tree-container';
        // 使用 flex: 1 占据除 header 外的剩余空间，不再使用 absolute 定位
        this.container.style.cssText = 'flex: 1; position: relative; overflow: hidden; cursor: grab;';
        
        // 创建Canvas（用于绘制连接线）- 位于最底层 (z-index: 0)
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        `;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // 创建节点容器 - 位于 DOM 层 (z-index: 10)
        this.nodeContainer = document.createElement('div');
        this.nodeContainer.className = 'talent-node-container';
        this.nodeContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center center;
            pointer-events: none;
            z-index: 10;
        `;
        this.container.appendChild(this.nodeContainer);
        
        // 创建工具提示 - 位于最上层 (z-index: 10000)
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'talent-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            display: none;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #ffd700;
            border-radius: 8px;
            padding: 15px;
            color: #fff;
            max-width: 300px;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        `;
        this.overlay.appendChild(this.tooltip);
        
        // 将主容器添加到 overlay
        this.overlay.appendChild(this.container);
        
        // 创建统计面板 - 位于 UI 层 (z-index: 20)
        this.createStatsPanel();
        
        // 添加到body
        document.body.appendChild(this.overlay);
        
        // 设置Canvas尺寸
        this.resizeCanvas();
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 创建统计面板
     */
    createStatsPanel() {
        this.statsPanel = document.createElement('div');
        this.statsPanel.className = 'talent-stats-panel';
        // 统计面板位于 overlay 层，使用绝对定位，z-index: 20（在 Canvas 和节点之上）
        // 背景使用图片，删除默认背景和边框，文字颜色为白色
        this.statsPanel.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            background-image: url('https://i.postimg.cc/DwtjkRfk/xingtukuang1.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            border: none;
            border-radius: 0;
            padding: 23px 20px;
            color: #fff;
            min-width: 250px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 20;
            height: 146px;
            width: 219px;
            margin-top: 0px;
            margin-bottom: 0px;
        `;
        this.overlay.appendChild(this.statsPanel);
    }
    
    /**
     * 更新统计面板内容
     */
    updateStatsPanel() {
        const unlockedIds = this.game.metaSaveSystem.data.unlockedTalentIds || ['root'];
        const totalStats = calculateTotalStats(unlockedIds);
        const keystones = getActiveKeystones(unlockedIds);
        
        let html = '<h3 style="margin: 10px 0 0 6px; color: #fff; border-bottom: 1px solid #fff; padding-bottom: 0px; height: 27px;">已获得加成</h3>';
        
        // 显示关键石
        if (keystones.length > 0) {
            html += '<h3 style="margin: 15px 0 10px 0; color: #fff; border-bottom: 1px solid #fff; padding-bottom: 8px;">激活的关键石</h3>';
            keystones.forEach(ks => {
                const name = this.getKeystoneName(ks);
                html += `<div style="color: #fff; margin: 5px 0;">★ ${name}</div>`;
            });
        }
        
        // 统计信息
        html += `<div style="margin-top: 15px; padding-top: 6px; border-top: 1px solid #fff; color: #fff; font-size: 13px;">
            已解锁节点: ${unlockedIds.length - 1} / ${Object.keys(TALENT_TREE_DATA).length - 1}
        </div>`;
        
        this.statsPanel.innerHTML = html;
    }
    
    /**
     * 获取关键石名称
     */
    getKeystoneName(keystoneId) {
        const names = {
            [KEYSTONE_EFFECTS.BLOOD_MAGIC]: '血魔法',
            [KEYSTONE_EFFECTS.IRON_WILL]: '钢铁意志',
            [KEYSTONE_EFFECTS.SOUL_REAPER]: '灵魂收割者',
            [KEYSTONE_EFFECTS.CRITICAL_MASTER]: '暴击大师',
            [KEYSTONE_EFFECTS.BERSERKER]: '狂战士'
        };
        return names[keystoneId] || keystoneId;
    }
    
    /**
     * 绘制连接线
     */
    renderConnections() {
        if (!this.ctx) return;
        
        const unlockedIds = this.game.metaSaveSystem.data.unlockedTalentIds || ['root'];
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.connections.forEach(conn => {
            const fromNode = TALENT_TREE_DATA[conn.from];
            const toNode = TALENT_TREE_DATA[conn.to];
            
            if (!fromNode || !toNode) return;
            
            const isUnlocked = unlockedIds.includes(conn.from) && unlockedIds.includes(conn.to);
            
            // 转换世界坐标到屏幕坐标
            const fromScreen = this.worldToScreen(fromNode.x, fromNode.y);
            const toScreen = this.worldToScreen(toNode.x, toNode.y);
            
            // 绘制连接线
            this.ctx.save();
            
            if (isUnlocked) {
                // 已解锁：金色发光
                if (TALENT_ASSETS.CONNECTIONS.glowEnabled) {
                    this.ctx.shadowColor = TALENT_ASSETS.CONNECTIONS.glowColor;
                    this.ctx.shadowBlur = TALENT_ASSETS.CONNECTIONS.glowBlur;
                }
                this.ctx.strokeStyle = TALENT_ASSETS.CONNECTIONS.unlockedColor;
                this.ctx.lineWidth = TALENT_ASSETS.CONNECTIONS.unlockedWidth;
            } else {
                // 锁定：灰色
                this.ctx.strokeStyle = TALENT_ASSETS.CONNECTIONS.lockedColor;
                this.ctx.lineWidth = TALENT_ASSETS.CONNECTIONS.lockedWidth;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(fromScreen.x, fromScreen.y);
            this.ctx.lineTo(toScreen.x, toScreen.y);
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    /**
     * 渲染节点
     */
    renderNodes() {
        const unlockedIds = this.game.metaSaveSystem.data.unlockedTalentIds || ['root'];
        
        Object.values(TALENT_TREE_DATA).forEach(node => {
            const nodeEl = this.createNodeElement(node, unlockedIds);
            this.nodeElements.set(node.id, nodeEl);
            this.nodeContainer.appendChild(nodeEl);
        });
    }
    
    /**
     * 创建节点DOM元素（使用精灵图）
     */
    createNodeElement(node, unlockedIds) {
        const isUnlocked = unlockedIds.includes(node.id);
        const isReachable = isNodeReachable(node.id, unlockedIds);
        const canAfford = (this.game.metaSaveSystem.data.soulCrystals || 0) >= node.cost;
        
        // 获取节点配置
        let nodeConfig = TALENT_ASSETS.NODES.SMALL;
        let spriteType = 'SMALL'; // 默认类型
        
        if (node.type === TALENT_NODE_TYPES.ROOT) {
            nodeConfig = TALENT_ASSETS.NODES.ROOT;
            // ROOT节点暂时使用KEYSTONE精灵（或可以单独处理）
            spriteType = 'KEYSTONE';
        } else if (node.type === TALENT_NODE_TYPES.MEDIUM) {
            nodeConfig = TALENT_ASSETS.NODES.MEDIUM;
            spriteType = 'MEDIUM';
        } else if (node.type === TALENT_NODE_TYPES.KEYSTONE) {
            nodeConfig = TALENT_ASSETS.NODES.KEYSTONE;
            spriteType = 'KEYSTONE';
        }
        
        // 确定节点状态：LOCKED（锁定）、AVAILABLE（可解锁）、ALLOCATED（已解锁）
        let nodeState = 'LOCKED';
        if (isUnlocked) {
            nodeState = 'ALLOCATED';
        } else if (isReachable && canAfford) {
            nodeState = 'AVAILABLE';
        }
        
        // 获取精灵图坐标
        const spriteMapping = TALENT_VISUALS.MAPPING[spriteType];
        const spriteCoord = spriteMapping ? spriteMapping[nodeState] : { col: 0, row: 0 };
        
        // ✅ Issue 3 Fix: 计算缩放比例以适配不同尺寸的节点
        const size = nodeConfig.size;
        const scale = size / TALENT_VISUALS.GRID_SIZE;
        
        // 精灵图总共有3列，计算缩放后的总宽度
        // 将 128px x 3 = 384px 的精灵图缩放到 size * 3
        const scaledSheetWidth = 3 * size;
        
        // 计算 background-position（基于缩放后的尺寸）
        const col = spriteCoord.col;
        const row = spriteCoord.row;
        const bgPosX = -col * size;
        const bgPosY = -row * size;
        
        const el = document.createElement('div');
        el.className = `talent-node talent-node-${node.type.toLowerCase()} talent-node-${nodeState.toLowerCase()}`;
        
        // ✅ Issue 3 Fix: 检查精灵图URL是否为占位符
        let backgroundStyle = '';
        const spriteUrl = TALENT_VISUALS.SPRITE_SHEET_URL;
        if (spriteUrl && !spriteUrl.includes('(placeholder)') && spriteUrl.trim() !== '') {
            // 有效的精灵图URL，使用缩放后的背景尺寸
            // 明确移除边框和背景色，只使用精灵图
            backgroundStyle = `
                background-image: url('${spriteUrl}');
                background-size: ${scaledSheetWidth}px auto;
                background-position: ${bgPosX}px ${bgPosY}px;
                background-repeat: no-repeat;
                background-color: transparent !important;
                border: none !important;
            `;
        } else {
            // 占位符或空URL，使用备用颜色背景（但也要移除边框，改为圆形背景）
            let fallbackColor = '#444'; // 默认灰色
            if (nodeState === 'ALLOCATED') {
                fallbackColor = '#ffd700'; // 金色（已解锁）
            } else if (nodeState === 'AVAILABLE') {
                fallbackColor = '#4a9eff'; // 蓝色（可解锁）
            }
            // 移除边框，只使用圆形背景色
            backgroundStyle = `
                background-color: ${fallbackColor};
                border: none !important;
                border-radius: 50%;
            `;
        }
        
        // 使用精灵图作为背景
        el.style.cssText = `
            position: absolute; /* 元素本身需要绝对定位 */
            width: ${size}px;
            height: ${size}px;
            left: ${node.x - size / 2}px;
            top: ${node.y - size / 2}px;
            ${backgroundStyle}
            cursor: ${isUnlocked ? 'default' : (isReachable && canAfford ? 'pointer' : 'not-allowed')};
            transition: all 0.2s;
            pointer-events: auto;
            opacity: ${isUnlocked || isReachable ? 1 : 0.5};
            box-shadow: none; /* 发光效果由 CSS ::before 伪元素实现，位于素材图片下方 */
            filter: ${isUnlocked || isReachable ? 'none' : 'grayscale(0.5) brightness(0.7)'};
        `;
        
        // 如果节点已解锁，通过 CSS 变量设置发光颜色（让伪元素能获取颜色）
        if (isUnlocked) {
            el.style.setProperty('--glow-color', nodeConfig.glowColor);
        }
        
        // 鼠标悬停事件
        el.addEventListener('mouseenter', (e) => {
            if (isUnlocked || isReachable) {
                el.style.transform = `scale(${TALENT_ASSETS.INTERACTION.hoverScale})`;
                // hover 时增强发光（通过 CSS 类控制）
                el.classList.add('talent-node-hover');
                this.showTooltip(node, isUnlocked, isReachable, canAfford, e);
            }
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
            el.classList.remove('talent-node-hover');
            this.hideTooltip();
        });
        
        // 点击事件
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isUnlocked && isReachable && canAfford) {
                this.unlockNode(node.id);
            }
        });
        
        return el;
    }
    
    /**
     * 显示工具提示
     */
    showTooltip(node, isUnlocked, isReachable, canAfford, event) {
        let html = `
            <div style="margin-bottom: 8px;">
                <div style="font-size: 18px; color: ${this.getNodeTypeColor(node.type)}; font-weight: bold;">
                    ${node.name}
                </div>
                <div style="font-size: 12px; color: #aaa; margin-top: 4px;">
                    ${node.type}
                </div>
            </div>
            <div style="margin: 10px 0; padding: 8px 0; border-top: 1px solid #555; border-bottom: 1px solid #555; color: #ddd;">
                ${node.description}
            </div>
        `;
        
        // 属性加成
        if (node.stats && Object.keys(node.stats).length > 0) {
            html += '<div style="margin: 8px 0;">';
            Object.entries(node.stats).forEach(([key, value]) => {
                const statName = this.getStatName(key);
                const color = value > 0 ? '#0f0' : '#f00';
                html += `<div style="color: ${color}; font-size: 14px;">${statName}: ${value > 0 ? '+' : ''}${value}</div>`;
            });
            html += '</div>';
        }
        
        // 关键石效果
        if (node.keystoneEffect) {
            html += `<div style="margin: 8px 0; padding: 8px; background: rgba(255, 170, 0, 0.2); border-left: 3px solid #ffaa00; color: #ffaa00;">
                <strong>关键石效果</strong>
            </div>`;
        }
        
        // 状态信息
        html += '<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #555; font-size: 13px;">';
        if (isUnlocked) {
            html += '<div style="color: #0f0;">✓ 已解锁</div>';
        } else {
            html += `<div style="color: ${canAfford ? '#ffd700' : '#f00'};">消耗: ${node.cost} 灵魂水晶</div>`;
            if (!isReachable) {
                html += '<div style="color: #f00; margin-top: 4px;">⚠️ 需要先解锁前置节点</div>';
            } else if (!canAfford) {
                html += '<div style="color: #f00; margin-top: 4px;">⚠️ 灵魂水晶不足</div>';
            } else {
                html += '<div style="color: #0f0; margin-top: 4px;">✓ 点击解锁</div>';
            }
        }
        html += '</div>';
        
        this.tooltip.innerHTML = html;
        this.tooltip.style.display = 'block';
        
        // 定位工具提示
        const rect = this.overlay.getBoundingClientRect();
        let left = event.clientX + 20;
        let top = event.clientY - 20;
        
        // 防止溢出屏幕
        if (left + 300 > rect.right) left = event.clientX - 320;
        if (top + this.tooltip.offsetHeight > rect.bottom) top = rect.bottom - this.tooltip.offsetHeight - 20;
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }
    
    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
    
    /**
     * 获取节点类型颜色
     */
    getNodeTypeColor(type) {
        const colors = {
            [TALENT_NODE_TYPES.ROOT]: '#ffd700',
            [TALENT_NODE_TYPES.SMALL]: '#5a8fd5',
            [TALENT_NODE_TYPES.MEDIUM]: '#7a5fd5',
            [TALENT_NODE_TYPES.KEYSTONE]: '#ffaa00'
        };
        return colors[type] || '#fff';
    }
    
    /**
     * 获取属性名称
     */
    getStatName(key) {
        const names = {
            p_atk: '物理攻击',
            m_atk: '魔法攻击',
            p_def: '物理防御',
            m_def: '魔法防御',
            max_hp: '最大生命',
            max_mp: '最大魔力',
            crit_rate: '暴击率%',
            crit_dmg: '暴击伤害%',
            dodge: '闪避%'
        };
        return names[key] || key;
    }
    
    /**
     * 解锁节点
     */
    unlockNode(nodeId) {
        const node = TALENT_TREE_DATA[nodeId];
        if (!node) return;
        
        const saveData = this.game.metaSaveSystem.data;
        const unlockedIds = saveData.unlockedTalentIds || ['root'];
        
        // 双重检查
        if (unlockedIds.includes(nodeId)) return;
        if (!isNodeReachable(nodeId, unlockedIds)) return;
        if (saveData.soulCrystals < node.cost) return;
        
        // 扣除水晶
        saveData.soulCrystals -= node.cost;
        
        // 解锁节点
        unlockedIds.push(nodeId);
        saveData.unlockedTalentIds = unlockedIds;
        
        // 保存
        this.game.metaSaveSystem.save();
        
        // 播放音效（如果有）
        // this.game.playSound('talent_unlock');
        
        // 刷新UI
        this.refresh();
        
        // 显示通知
        this.showUnlockNotification(node);
    }
    
    /**
     * 显示解锁通知
     */
    showUnlockNotification(node) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: rgba(0, 0, 0, 0.95);
            border: 3px solid #ffd700;
            border-radius: 15px;
            padding: 30px;
            color: #fff;
            text-align: center;
            z-index: 10001;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
            animation: talentUnlock 1.5s ease-out forwards;
        `;
        
        notif.innerHTML = `
            <div style="font-size: 24px; color: #ffd700; margin-bottom: 10px;">✦ 天赋已解锁 ✦</div>
            <div style="font-size: 20px; margin-bottom: 5px;">${node.name}</div>
            <div style="font-size: 14px; color: #aaa;">${node.description}</div>
        `;
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            if (notif.parentNode) {
                notif.parentNode.removeChild(notif);
            }
        }, 1500);
    }
    
    /**
     * 刷新UI
     */
    refresh() {
        // 清除现有节点
        this.nodeElements.clear();
        this.nodeContainer.innerHTML = '';
        
        // 重新渲染
        this.renderConnections();
        this.renderNodes();
        this.updateStatsPanel();
        
        // 更新水晶显示 - 使用金色主题
        const currentSC = this.game.metaSaveSystem.data.soulCrystals || 0;
        this.scDisplay.innerHTML = `
            <img src="https://i.postimg.cc/CKS2nRQG/linghunjiejing1.png" 
                 alt="灵魂结晶" 
                 style="width: 28px; height: 28px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));" />
            <span>${currentSC} 灵魂水晶</span>
        `;
    }
    
    /**
     * 世界坐标转屏幕坐标
     */
    worldToScreen(worldX, worldY) {
        return {
            x: this.canvas.width / 2 + (worldX + this.viewport.x) * this.viewport.scale,
            y: this.canvas.height / 2 + (worldY + this.viewport.y) * this.viewport.scale
        };
    }
    
    /**
     * 屏幕坐标转世界坐标
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.canvas.width / 2) / this.viewport.scale - this.viewport.x,
            y: (screenY - this.canvas.height / 2) / this.viewport.scale - this.viewport.y
        };
    }
    
    /**
     * 居中视图到根节点
     */
    centerView() {
        this.viewport.x = 0;
        this.viewport.y = 0;
        this.viewport.scale = 1.0;
        this.updateTransform();
    }
    
    /**
     * 更新变换
     */
    updateTransform() {
        this.nodeContainer.style.transform = `
            translate(-50%, -50%)
            translate(${this.viewport.x * this.viewport.scale}px, ${this.viewport.y * this.viewport.scale}px)
            scale(${this.viewport.scale})
        `;
        this.renderConnections();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // ✅ FIX: 保存所有监听器引用（防止内存泄漏）
        // 鼠标拖拽
        this.boundMouseDown = (e) => {
            // ✅ FIX: 阻止事件传播到游戏canvas，防止触发地图点击
            e.stopPropagation();
            if (e.button === 0) { // 左键
                this.viewport.isDragging = true;
                this.viewport.dragStartX = e.clientX;
                this.viewport.dragStartY = e.clientY;
                this.viewport.lastX = this.viewport.x;
                this.viewport.lastY = this.viewport.y;
                this.container.style.cursor = 'grabbing';
            }
        };
        this.container.addEventListener('mousedown', this.boundMouseDown);
        
        this.boundMouseMove = (e) => {
            if (this.viewport.isDragging) {
                const dx = e.clientX - this.viewport.dragStartX;
                const dy = e.clientY - this.viewport.dragStartY;
                
                this.viewport.x = this.viewport.lastX + dx / this.viewport.scale;
                this.viewport.y = this.viewport.lastY + dy / this.viewport.scale;
                
                this.updateTransform();
            }
        };
        window.addEventListener('mousemove', this.boundMouseMove);
        
        this.boundMouseUp = (e) => {
            if (e.button === 0) {
                this.viewport.isDragging = false;
                if (this.container) this.container.style.cursor = 'grab';
            }
        };
        window.addEventListener('mouseup', this.boundMouseUp);
        
        // 滚轮缩放
        this.boundWheel = (e) => {
            // ✅ FIX: 阻止事件传播到游戏canvas
            e.stopPropagation();
            e.preventDefault();
            
            const delta = -Math.sign(e.deltaY) * TALENT_ASSETS.INTERACTION.zoomSpeed;
            const newScale = Math.max(
                TALENT_ASSETS.INTERACTION.zoomMin,
                Math.min(TALENT_ASSETS.INTERACTION.zoomMax, this.viewport.scale + delta)
            );
            
            // 以鼠标位置为中心缩放
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const worldBefore = this.screenToWorld(mouseX, mouseY);
            this.viewport.scale = newScale;
            const worldAfter = this.screenToWorld(mouseX, mouseY);
            
            this.viewport.x += worldAfter.x - worldBefore.x;
            this.viewport.y += worldAfter.y - worldBefore.y;
            
            this.updateTransform();
        };
        this.container.addEventListener('wheel', this.boundWheel, { passive: false });
        
        // 窗口大小改变
        // ✅ FIX: 保存监听器引用（防止内存泄漏）
        this.boundResize = () => {
            if (this.isVisible) {
                this.resizeCanvas();
                this.renderConnections();
            }
        };
        window.addEventListener('resize', this.boundResize);
    }
    
    /**
     * 调整Canvas大小
     */
    resizeCanvas() {
        // 使用 container 的实际尺寸，确保 Canvas 填满容器
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        // 重新渲染连接线以适应新尺寸
        if (this.isVisible) {
            this.renderConnections();
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        // ✅ FIX: 移除所有事件监听器（防止内存泄漏）
        // 移除 window 上的监听器
        if (this.boundMouseMove) {
            window.removeEventListener('mousemove', this.boundMouseMove);
            this.boundMouseMove = null;
        }
        if (this.boundMouseUp) {
            window.removeEventListener('mouseup', this.boundMouseUp);
            this.boundMouseUp = null;
        }
        if (this.boundResize) {
            window.removeEventListener('resize', this.boundResize);
            this.boundResize = null;
        }
        
        // 移除 container 上的监听器
        if (this.container) {
            if (this.boundMouseDown) {
                this.container.removeEventListener('mousedown', this.boundMouseDown);
                this.boundMouseDown = null;
            }
            if (this.boundWheel) {
                this.container.removeEventListener('wheel', this.boundWheel);
                this.boundWheel = null;
            }
        }
        
        this.nodeElements.clear();
        this.container = null;
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.nodeContainer = null;
        this.tooltip = null;
        this.statsPanel = null;
    }
}

// 添加CSS动画
if (!document.getElementById('talent-tree-styles')) {
    const style = document.createElement('style');
    style.id = 'talent-tree-styles';
    style.textContent = `
        @keyframes talentUnlock {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 1;
            }
            70% {
                transform: translate(-50%, -50%) scale(0.9);
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0;
            }
        }
        
        .talent-node:active {
            transform: scale(0.95) !important;
        }
    `;
    document.head.appendChild(style);
}

