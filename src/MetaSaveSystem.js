/**
 * MetaSaveSystem.js
 * 
 * 元进度存档系统（Meta-Progression Save System）
 * 管理跨游戏会话的持久化数据：灵魂水晶、天赋解锁等
 * 这些数据不会在游戏结束时重置
 */

export class MetaSaveSystem {
    static META_SAVE_KEY = 'mota_meta_save';
    
    constructor() {
        this.data = this.loadMetaData();
    }
    
    /**
     * 初始化默认的元进度数据
     */
    getDefaultData() {
        return {
            soulCrystals: 0,                    // 灵魂水晶总数
            unlockedTalentIds: ['root'],        // 已解锁的天赋ID列表（包含根节点）
            totalSoulCrystalsEarned: 0,         // 累计获得的灵魂水晶
            totalGamesPlayed: 0,                // 总游戏次数
            totalKills: 0,                      // 总击杀数
            highestFloor: 0,                    // 达到的最高楼层
            achievements: [],                   // 已解锁的成就ID列表
            achievementStats: {                 // 成就统计数据
                totalKills: 0,                  // 累计击杀数
                maxDamage: 0,                   // 最大单次伤害
                consecutiveTrashGambles: 0,     // 连续垃圾赌博次数
                trapTriggersThisFloor: 0,       // 当前层陷阱触发次数
                floorStartTime: null,            // 当前层开始时间
                lastFloorClearTime: null         // 上次清层时间
            },
            maxUnlockedAscension: 1,            // 已解锁的最高噩梦层级（1-25）
            lastPlayed: Date.now()              // 最后游玩时间
        };
    }
    
    /**
     * 加载元进度数据
     */
    loadMetaData() {
        try {
            const saved = localStorage.getItem(MetaSaveSystem.META_SAVE_KEY);
            if (!saved) {
                console.log('MetaSaveSystem: 初始化新的元进度数据');
                return this.getDefaultData();
            }
            
            const data = JSON.parse(saved);
            
            // 确保所有必需字段存在（向后兼容）
            const defaultData = this.getDefaultData();
            Object.keys(defaultData).forEach(key => {
                if (data[key] === undefined) {
                    data[key] = defaultData[key];
                }
            });
            
            console.log('MetaSaveSystem: 已加载元进度数据', data);
            return data;
        } catch (e) {
            console.error('MetaSaveSystem: 加载失败，使用默认数据', e);
            return this.getDefaultData();
        }
    }
    
    /**
     * 保存元进度数据
     */
    save() {
        try {
            this.data.lastPlayed = Date.now();
            localStorage.setItem(MetaSaveSystem.META_SAVE_KEY, JSON.stringify(this.data));
            console.log('MetaSaveSystem: 元进度已保存', this.data);
            return true;
        } catch (e) {
            console.error('MetaSaveSystem: 保存失败', e);
            return false;
        }
    }
    
    /**
     * 添加灵魂水晶
     */
    addSoulCrystals(amount) {
        if (amount <= 0) return;
        
        this.data.soulCrystals += amount;
        this.data.totalSoulCrystalsEarned += amount;
        this.save();
        
        console.log(`MetaSaveSystem: 获得 ${amount} 灵魂水晶，当前: ${this.data.soulCrystals}`);
    }
    
    /**
     * 消耗灵魂水晶
     */
    spendSoulCrystals(amount) {
        if (amount <= 0 || this.data.soulCrystals < amount) {
            return false;
        }
        
        this.data.soulCrystals -= amount;
        this.save();
        
        console.log(`MetaSaveSystem: 消耗 ${amount} 灵魂水晶，剩余: ${this.data.soulCrystals}`);
        return true;
    }
    
    /**
     * 解锁天赋节点
     */
    unlockTalent(talentId) {
        if (this.data.unlockedTalentIds.includes(talentId)) {
            return false;
        }
        
        this.data.unlockedTalentIds.push(talentId);
        this.save();
        
        console.log(`MetaSaveSystem: 已解锁天赋 ${talentId}`);
        return true;
    }
    
    /**
     * 检查天赋是否已解锁
     */
    isTalentUnlocked(talentId) {
        return this.data.unlockedTalentIds.includes(talentId);
    }
    
    /**
     * 更新统计数据
     */
    updateStats(stats) {
        if (stats.floor && stats.floor > this.data.highestFloor) {
            this.data.highestFloor = stats.floor;
        }
        
        if (stats.kills) {
            this.data.totalKills += stats.kills;
        }
        
        this.save();
    }
    
    /**
     * 游戏结束时调用
     */
    onGameEnd(finalStats) {
        this.data.totalGamesPlayed++;
        
        if (finalStats) {
            if (finalStats.floor > this.data.highestFloor) {
                this.data.highestFloor = finalStats.floor;
            }
            if (finalStats.totalKills) {
                this.data.totalKills += finalStats.totalKills;
            }
        }
        
        this.save();
        console.log('MetaSaveSystem: 游戏结束，元进度已更新');
    }
    
    /**
     * 重置元进度（危险操作！）
     */
    resetMetaProgress() {
        if (confirm('确定要重置所有元进度吗？这将清除所有灵魂水晶和天赋！')) {
            this.data = this.getDefaultData();
            this.save();
            console.log('MetaSaveSystem: 元进度已重置');
            return true;
        }
        return false;
    }
    
    /**
     * 导出元进度数据（用于备份）
     */
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }
    
    /**
     * 导入元进度数据（用于恢复）
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // 验证数据有效性
            const defaultData = this.getDefaultData();
            const isValid = Object.keys(defaultData).every(key => data.hasOwnProperty(key));
            
            if (!isValid) {
                throw new Error('数据格式无效');
            }
            
            this.data = data;
            this.save();
            console.log('MetaSaveSystem: 数据导入成功');
            return true;
        } catch (e) {
            console.error('MetaSaveSystem: 数据导入失败', e);
            return false;
        }
    }
    
    /**
     * 解锁成就
     * @param {string} achievementId - 成就ID
     * @returns {boolean} 是否成功解锁（如果已解锁则返回false）
     */
    unlockAchievement(achievementId) {
        if (this.data.achievements.includes(achievementId)) {
            return false; // 已解锁
        }
        
        this.data.achievements.push(achievementId);
        this.save();
        console.log(`MetaSaveSystem: 已解锁成就 ${achievementId}`);
        return true;
    }
    
    /**
     * 检查成就是否已解锁
     * @param {string} achievementId - 成就ID
     * @returns {boolean}
     */
    isAchievementUnlocked(achievementId) {
        return this.data.achievements.includes(achievementId);
    }
    
    /**
     * 增加统计数据
     * @param {string} key - 统计键名
     * @param {number} value - 增加值（默认为1）
     */
    incrementStat(key, value = 1) {
        if (!this.data.achievementStats[key]) {
            this.data.achievementStats[key] = 0;
        }
        this.data.achievementStats[key] += value;
        this.save();
    }
    
    /**
     * 更新统计数据
     * @param {string} key - 统计键名
     * @param {number} value - 新值
     */
    updateStat(key, value) {
        this.data.achievementStats[key] = value;
        this.save();
    }
    
    /**
     * 获取统计数据
     * @param {string} key - 统计键名
     * @returns {number|null}
     */
    getStat(key) {
        return this.data.achievementStats[key] ?? null;
    }
    
    /**
     * 重置当前层的统计数据（用于新层开始时）
     * 注意：trapTriggersThisFloor 已迁移到 AchievementSystem.sessionStats
     * 此方法保留用于向后兼容，但实际重置由 AchievementSystem.onLevelStart() 处理
     */
    resetFloorStats() {
        // 不再需要重置 trapTriggersThisFloor（已迁移到 sessionStats）
        // 保留此方法以防其他地方调用
    }
    
    /**
     * 解锁下一级噩梦难度
     * @param {number} currentLevel - 当前通关的难度层级
     * @returns {boolean} 如果在本次调用中成功解锁了新难度，返回 true，否则返回 false
     */
    unlockNextAscensionLevel(currentLevel) {
        // 确保 maxUnlockedAscension 字段存在（向后兼容）
        if (this.data.maxUnlockedAscension === undefined) {
            this.data.maxUnlockedAscension = 1;
        }
        
        // 如果当前层级等于已解锁的最高层级，且小于25，则解锁下一级
        if (currentLevel === this.data.maxUnlockedAscension && currentLevel < 25) {
            this.data.maxUnlockedAscension++;
            this.save();
            console.log(`MetaSaveSystem: 已解锁噩梦难度 ${this.data.maxUnlockedAscension}`);
            return true;
        }
        
        return false;
    }
}

