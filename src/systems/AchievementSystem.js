/**
 * AchievementSystem.js
 * 
 * 成就系统核心逻辑
 * 负责检测游戏事件并触发成就解锁
 */

import { ACHIEVEMENTS, ACH_CLOSE_CALL, ACH_IRON_ROOSTER, ACH_BAD_LUCK, ACH_TRAP_LOVER, ACH_ONE_SHOT, ACH_SPEED_RUN, ACH_PACIFIST_FAIL } from '../achievements/AchievementData.js';

export class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.metaSaveSystem = game.metaSaveSystem;
        this.achievementUI = null; // 将在main.js中设置
        
        // 临时状态（单次游戏会话，不跨存档）
        // 注意：连续赌博失败等需要跨存档的数据存储在 metaSaveSystem.achievementStats 中
        this.sessionStats = {
            levelPlayTime: 0,  // 当前层游戏时间（秒，排除暂停）
            trapTriggersThisFloor: 0  // 当前层陷阱触发次数
        };
        
        console.log('[AchievementSystem] 成就系统已初始化');
    }
    
    /**
     * 设置成就UI引用
     */
    setUI(achievementUI) {
        this.achievementUI = achievementUI;
    }
    
    /**
     * 检查并触发成就解锁
     * @param {string} eventType - 事件类型
     * @param {object} data - 事件数据
     */
    check(eventType, data = {}) {
        switch (eventType) {
            case 'onCombatEnd':
                this.checkCloseCall(data);
                break;
            case 'onDeath':
                this.checkIronRooster(data);
                break;
            case 'onGamble':
                this.checkBadLuck(data);
                break;
            case 'onTrap':
                this.checkTrapLover();
                break;
            case 'onDamage':
                this.checkOneShot(data);
                break;
            case 'onLevelStart':
                this.onLevelStart();
                break;
            case 'onLevelEnd':
                this.checkSpeedRun();
                break;
            case 'onKill':
                this.checkPacifistFail();
                break;
        }
    }
    
    /**
     * 解锁成就的通用方法
     * @param {string} achievementId - 成就ID
     */
    unlockAchievement(achievementId) {
        if (!this.metaSaveSystem.isAchievementUnlocked(achievementId)) {
            const unlocked = this.metaSaveSystem.unlockAchievement(achievementId);
            if (unlocked) {
                const achievement = ACHIEVEMENTS[achievementId];
                if (achievement && this.achievementUI) {
                    // 显示成就解锁弹窗
                    this.achievementUI.showNotification(achievement);
                    console.log(`[AchievementSystem] 成就解锁: ${achievement.title}`);
                }
            }
        }
    }
    
    /**
     * 检查：死神擦肩 (HP < 5% 获胜)
     */
    checkCloseCall(data) {
        if (!this.game || !this.game.player) return;
        
        const player = this.game.player;
        const hpPercent = (player.stats.hp / player.stats.maxHp) * 100;
        
        // 检查是否获胜（战斗结束且玩家存活）
        if (data.won && hpPercent < 5) {
            this.unlockAchievement(ACH_CLOSE_CALL);
        }
    }
    
    /**
     * 检查：守财奴的遗愿 (死亡时金币 > 2000)
     */
    checkIronRooster(data) {
        if (!this.game || !this.game.player) return;
        
        const gold = this.game.player.stats.gold || 0;
        if (gold > 2000) {
            this.unlockAchievement(ACH_IRON_ROOSTER);
        }
    }
    
    /**
     * 检查：非酋认证 (连续3次赌博垃圾)
     */
    checkBadLuck(data) {
        if (!data || data.type !== 'trash') return;
        
        // 增加连续垃圾次数
        const current = this.metaSaveSystem.getStat('consecutiveTrashGambles') || 0;
        this.metaSaveSystem.updateStat('consecutiveTrashGambles', current + 1);
        
        // 检查是否达到3次
        if (current + 1 >= 3) {
            this.unlockAchievement(ACH_BAD_LUCK);
            // 重置计数
            this.metaSaveSystem.updateStat('consecutiveTrashGambles', 0);
        }
    }
    
    /**
     * 检查：脚底按摩 (单层触发5次陷阱)
     */
    checkTrapLover() {
        this.sessionStats.trapTriggersThisFloor = (this.sessionStats.trapTriggersThisFloor || 0) + 1;
        
        if (this.sessionStats.trapTriggersThisFloor >= 5) {
            this.unlockAchievement(ACH_TRAP_LOVER);
        }
    }
    
    /**
     * 检查：毁灭打击 (单次伤害 > 300)
     */
    checkOneShot(data) {
        if (!data || !data.damage) return;
        
        const damage = data.damage;
        const currentMax = this.metaSaveSystem.getStat('maxDamage') || 0;
        
        if (damage > currentMax) {
            this.metaSaveSystem.updateStat('maxDamage', damage);
        }
        
        if (damage > 300) {
            this.unlockAchievement(ACH_ONE_SHOT);
        }
    }
    
    /**
     * 检查：光速逃脱 (30秒内过层)
     * 使用 sessionStats.levelPlayTime（排除暂停时间）
     */
    checkSpeedRun() {
        const elapsed = this.sessionStats.levelPlayTime || 0;
        
        // 增加最小时间检查，避免楼层初始化时的 0 秒误判
        if (elapsed > 1 && elapsed <= 30) {
            this.unlockAchievement(ACH_SPEED_RUN);
        }
    }
    
    /**
     * 更新层游戏时间（在主循环中调用，排除暂停时间）
     * @param {number} dt - 帧时间差（秒）
     */
    updateLevelPlayTime(dt) {
        if (this.game && !this.game.isPaused) {
            this.sessionStats.levelPlayTime = (this.sessionStats.levelPlayTime || 0) + dt;
        }
    }
    
    /**
     * 检查：并不是和平主义 (累计击杀500)
     */
    checkPacifistFail() {
        // 增加累计击杀（全局统计）
        this.metaSaveSystem.data.totalKills = (this.metaSaveSystem.data.totalKills || 0) + 1;
        this.metaSaveSystem.save();
        
        const totalKills = this.metaSaveSystem.data.totalKills || 0;
        if (totalKills >= 500) {
            this.unlockAchievement(ACH_PACIFIST_FAIL);
        }
    }
    
    /**
     * 层开始时调用
     * 重置单层临时数据（陷阱触发次数、层游戏时间）
     */
    onLevelStart() {
        // 重置层内临时统计数据
        this.sessionStats.trapTriggersThisFloor = 0;
        this.sessionStats.levelPlayTime = 0;
    }
    
    /**
     * 游戏开始时调用（重置所有会话数据）
     */
    onGameStart() {
        this.sessionStats = {
            levelPlayTime: 0,
            trapTriggersThisFloor: 0
        };
    }
    
    /**
     * 重置连续垃圾赌博计数（当获得非垃圾奖励时）
     */
    resetConsecutiveTrashGambles() {
        this.metaSaveSystem.updateStat('consecutiveTrashGambles', 0);
    }
}

