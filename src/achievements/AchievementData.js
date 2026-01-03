/**
 * AchievementData.js
 * 
 * 成就系统数据定义
 * 定义所有成就的ID、标题、描述和线索
 */

// 成就ID常量
export const ACH_CLOSE_CALL = 'ACH_CLOSE_CALL';
export const ACH_IRON_ROOSTER = 'ACH_IRON_ROOSTER';
export const ACH_BAD_LUCK = 'ACH_BAD_LUCK';
export const ACH_TRAP_LOVER = 'ACH_TRAP_LOVER';
export const ACH_ONE_SHOT = 'ACH_ONE_SHOT';
export const ACH_SPEED_RUN = 'ACH_SPEED_RUN';
export const ACH_PACIFIST_FAIL = 'ACH_PACIFIST_FAIL';

/**
 * 成就数据定义
 * 每个成就包含：
 * - id: 唯一标识符
 * - title: 成就标题（解锁后显示）
 * - description: 成就描述（解锁后显示）
 * - hint: 谜语线索（未解锁时显示）
 */
export const ACHIEVEMENTS = {
  [ACH_CLOSE_CALL]: {
    id: ACH_CLOSE_CALL,
    title: '死神擦肩',
    description: '在生命值低于5%的情况下获得胜利',
    hint: '在生与死的边缘起舞...'
  },
  [ACH_IRON_ROOSTER]: {
    id: ACH_IRON_ROOSTER,
    title: '守财奴的遗愿',
    description: '死亡时拥有超过2000金币',
    hint: '钱财乃身外之物，带不走的...'
  },
  [ACH_BAD_LUCK]: {
    id: ACH_BAD_LUCK,
    title: '非酋认证',
    description: '连续3次赌博获得垃圾',
    hint: '命运女神今天似乎不在家...'
  },
  [ACH_TRAP_LOVER]: {
    id: ACH_TRAP_LOVER,
    title: '脚底按摩',
    description: '在同一层触发5次陷阱',
    hint: '痛楚，有时也是一种享受...'
  },
  [ACH_ONE_SHOT]: {
    id: ACH_ONE_SHOT,
    title: '毁灭打击',
    description: '单次伤害超过300',
    hint: '追求极致的力量，一击必杀。'
  },
  [ACH_SPEED_RUN]: {
    id: ACH_SPEED_RUN,
    title: '光速逃脱',
    description: '在30秒内完成一层',
    hint: '时间就是生命，不要停下脚步。'
  },
  [ACH_PACIFIST_FAIL]: {
    id: ACH_PACIFIST_FAIL,
    title: '并不是和平主义',
    description: '累计击杀500个敌人',
    hint: '你的双手沾满了鲜血...'
  }
};

/**
 * 获取所有成就ID列表
 */
export function getAllAchievementIds() {
  return Object.keys(ACHIEVEMENTS);
}

/**
 * 根据ID获取成就数据
 */
export function getAchievement(id) {
  return ACHIEVEMENTS[id] || null;
}

