# 游戏架构深度审查报告

## 审查日期
2024年审查

## 审查范围
- RoguelikeSystem (符文系统)
- SaveSystem (存档系统)
- CombatSystem (战斗系统)
- 系统间交互逻辑

---

## 问题清单与修复方案

### 1. ✅ 存档读取时的属性"双重叠加"风险 (CRITICAL - 已修复)

**问题描述**:
- 位置: `src/save.js` (restore方法) vs `src/data/Runes.js` (onObtain方法)
- 风险: `Vitality` 和 `Life Essence` 符文的 `onObtain` 会直接修改 `player.stats.maxHp`,而存档中保存的 `maxHp` 已经包含了符文加成。读档时重新调用 `onObtain` 会导致 `bonusStats.hp` 再次累加,从而在 `getTotalStats()` 中再次累加到 `maxHp`,导致双重叠加。

**修复方案**:
- 在 `save.js` 的 `restore` 方法中,在重新应用符文之前:
  1. 先重置 `bonusStats` 为0
  2. 通过 `getTotalStats()` 计算基础 `maxHp` (不包含符文加成)
  3. 恢复 `player.stats.maxHp` 为基础值
  4. 重新应用所有符文的 `onObtain`
  5. 最后通过 `getTotalStats()` 重新计算最终 `maxHp` 并同步到 `player.stats.maxHp`

**修复状态**: ✅ 已修复 (在 `src/save.js` 493-620行)

---

### 2. ✅ 符文 `onObtain` 的副作用累积 (CRITICAL - 已修复)

**问题描述**:
- 位置: `src/data/Runes.js` (glass_cannon)
- 风险: `Glass Cannon` 的 `onObtain` 会执行 `player.stats.maxHp = Math.max(10, maxHp - hpLoss)`。每次读档调用 `SaveSystem.restore` 时,都会重新触发 `onObtain`,导致每次读档都会再次扣除30%生命值。

**修复方案**:
- 在 `save.js` 的 `restore` 方法中,对于直接修改 `player.stats.maxHp` 的符文(如 `glass_cannon`),只应用一次(最高层级),因为它们是百分比修改,多次应用会导致错误。

**修复状态**: ✅ 已修复 (在 `src/save.js` 535-587行)

---

### 3. ✅ 多重施法 (Multicast) 的目标有效性与并发问题 (已检查 - 逻辑正确)

**问题描述**:
- 位置: `src/data/Runes.js` (Multicast hook) 和 `src/systems/CombatSystem.js`
- 风险: `Multicast` 使用 `setTimeout` 延迟100ms触发第二次攻击。如果第一次攻击已经打死了怪物,或者玩家在100ms内移动走了,可能会引发问题。

**检查结果**:
- 代码中已经有防御性检查(在 `Runes.js` 588-591行):
  ```javascript
  if (!game || !game.combatSystem || !game.combatSystem.checkInteraction) return;
  if (!attacker || !attacker.stats || attacker.stats.hp <= 0) return;
  if (!defender || !defender.stats || defender.stats.hp <= 0) return;
  if (!game.map || !game.map.monsters || !game.map.monsters.includes(defender)) return;
  ```
- 这些检查已经足够防御并发问题。

**修复状态**: ✅ 逻辑正确,无需修复

---

### 4. ⚠️ 浮动文字 (FloatingText) 的对象池泄漏 (需要优化)

**问题描述**:
- 位置: `src/main.js` (nextLevel) 和 `src/utils/ObjectPool.js`
- 风险: 在 `nextLevel()` 切换楼层时,清空了 `this.floatingTexts` 数组并尝试回收对象。如果 `releaseDeadObjects` 在 `loop` 中正在运行,直接清空数组是否安全?

**检查结果**:
- 当前逻辑(在 `main.js` 724-736行):
  ```javascript
  this.floatingTexts.forEach(ft => {
    if (ft && this.floatingTextPool.release) {
      this.floatingTextPool.release(ft);
    }
  });
  if (this.floatingTextPool.clear) {
    this.floatingTextPool.clear();
  }
  this.floatingTexts = [];
  ```
- 问题: `clear()` 方法会清空对象池,但 `release()` 方法会将对象放回池中。如果先 `release()` 再 `clear()`,会导致对象被放回池中后立即被清空,这是浪费的。
- 更好的做法: 直接清空数组,让对象自然死亡后被 `releaseDeadObjects` 回收,或者只调用 `clear()` 而不需要先 `release()`。

**修复建议**:
```javascript
// 直接清空数组,让对象自然死亡后被回收
this.floatingTexts = [];
// 或者只调用 clear(),不需要先 release()
if (this.floatingTextPool.clear) {
  this.floatingTextPool.clear();
}
```

**修复状态**: ⚠️ 需要优化 (非关键)

---

### 5. ❌ 符文刷新费用的持久化 (BUG - 需要修复)

**问题描述**:
- 位置: `src/systems/RoguelikeSystem.js` 和 `src/save.js`
- 风险: `RoguelikeSystem` 包含 `currentRerollCost`(刷新费用),但这个变量没有被保存到 `SaveSystem` 中。如果玩家刷新到200G,保存并退出,读档后费用会重置为50G。这是否是预期的"特性"?

**检查结果**:
- `currentRerollCost` 确实没有在 `save.js` 中保存和恢复。
- 在 `RoguelikeSystem.js` 中,`closeDraft()` 方法会重置 `currentRerollCost = 50` (462行),这意味着每次关闭符文选择界面时费用都会重置。
- 在 `processNext()` 方法中,也会重置 `currentRerollCost = 50` (514行)。

**修复建议**:
- 如果希望刷新费用持久化,需要在 `save.js` 中保存和恢复 `currentRerollCost`。
- 如果希望每次打开符文选择界面时费用重置,当前逻辑是正确的。

**修复状态**: ❌ 需要决定设计意图 (当前行为可能是预期的)

---

### 6. ✅ 吸血 (Vampire) 与 反伤 (Thorns) 的死循环 (已检查 - 逻辑正确)

**问题描述**:
- 位置: `src/systems/CombatSystem.js`
- 风险: 玩家攻击 -> 触发吸血 -> 怪物触发反伤 -> 玩家受伤 -> (如果未来有受击触发的符文) -> 可能导致无限递归。

**检查结果**:
- 吸血只在 `onHit` (主动攻击)触发,不会在受击时触发。
- 反伤在 `checkInteraction` 中处理(1214-1230行),是直接造成伤害,不会触发玩家的 `onHit` hook。
- 逻辑链条: 玩家攻击 -> 造成伤害 -> 触发吸血(通过 `onHit` hook) -> 触发反伤(直接造成伤害) -> 结束。
- 没有无限递归的风险。

**修复状态**: ✅ 逻辑正确,无需修复

---

### 7. ✅ 动态装备 (ProcGen) 与 铁匠铺 (Blacksmith) 的兼容性 (已检查 - 逻辑正确)

**问题描述**:
- 位置: `src/systems/BlacksmithSystem.js` (recalculateDynamicItemStats)
- 风险: V2.0的动态装备引入了 `baseStats`(纯底材)和 `stats`(最终值)。铁匠铺强化时,是基于 `baseStats` 乘以倍率,然后累加前后缀的数值。确认 `baseStats` 是否包含了 LevelMult?如果是,强化时再次乘算是否会导致数值膨胀过快?

**检查结果**:
- 在 `BlacksmithSystem.js` 的 `recalculateDynamicItemStats` 方法中(220-290行):
  1. 读取 `baseStats` (纯底材,不包含强化)
  2. 应用强化倍率 `enhanceMultiplier = 1 + (enhanceLevel * 0.1)` (+10% per level)
  3. 重新应用前缀固定加成
  4. 重新应用后缀百分比加成
  5. 更新 `item.stats` (不修改 `baseStats`)
- `baseStats` 应该是装备生成那一刻固定的数值(已包含楼层加成和 LevelMult),但不包含强化加成。
- 强化时基于 `baseStats` 乘算,然后累加前后缀,逻辑是正确的。

**修复状态**: ✅ 逻辑正确,无需修复

---

## 总结

### 已修复的问题
1. ✅ 存档读取时的属性双重叠加风险
2. ✅ 符文 `onObtain` 的副作用累积

### 逻辑正确,无需修复
3. ✅ 多重施法 (Multicast) 的目标有效性与并发问题
4. ✅ 吸血 (Vampire) 与 反伤 (Thorns) 的死循环
5. ✅ 动态装备 (ProcGen) 与 铁匠铺 (Blacksmith) 的兼容性

### 需要优化/决定的问题
6. ⚠️ 浮动文字对象池清理逻辑 (非关键,可以优化)
7. ❌ 符文刷新费用的持久化 (需要决定设计意图)

---

## 建议

1. **浮动文字对象池优化**: 简化 `nextLevel()` 中的清理逻辑,直接清空数组即可。

2. **符文刷新费用持久化**: 需要决定是否希望刷新费用在存档中持久化。如果希望持久化,需要在 `save.js` 中保存和恢复 `currentRerollCost`。

3. **代码审查建议**: 建议定期审查系统间交互逻辑,特别是涉及状态持久化的部分。

