# 噩梦层级系统（Ascension Levels）代码审查报告

## 审查日期
2024年12月（代码审查阶段）

## 审查范围
对已实装的噩梦层级系统（1-25级难度系统）进行全面逻辑审查和风险评估。

---

## 问题清单

### ✅ 1. 状态传递与持久化 (State Propagation)

#### 问题 1.1: SaveSystem 未保存 ascensionLevel
**文件**: `src/save.js`  
**位置**: `SaveSystem.save()` 方法（第12-62行）

**问题描述**:
- `save()` 方法在保存游戏数据时，没有保存 `ascensionLevel` 字段
- 导致玩家重新加载存档时，噩梦层级信息丢失

**代码片段**:
```12:52:src/save.js
static save(game) {
  // ... 现有代码 ...
  const saveData = {
    stats: { ... },
    inventory: [...],
    equipment: { ... },
    gameState: { ... },
    timestamp: Date.now(),
    // ❌ 缺少: ascensionLevel
  };
}
```

**影响**: 中等 - 玩家存档后重新加载，难度设置会被重置为默认值

---

#### 问题 1.2: SaveSystem.restore() 未读取 ascensionLevel
**文件**: `src/save.js`  
**位置**: `SaveSystem.restore()` 方法（第118-202行）

**问题描述**:
- `restore()` 方法读取存档时，没有读取 `ascensionLevel` 字段
- `generateLevel()` 调用时没有传递 `ascensionLevel` 参数

**代码片段**:
```169:171:src/save.js
// 关键：重新生成当前楼层的地图
const currentFloor = player.stats.floor;
game.map.generateLevel(currentFloor); // ❌ 缺少 ascensionLevel 参数
```

**影响**: 中等 - 加载存档后地图生成会使用默认难度（Lv1）

---

#### 问题 1.3: restartGame() 未重置 ascensionLevel
**文件**: `src/main.js`  
**位置**: `Game.restartGame()` 方法（第3058行开始）

**问题描述**:
- `restartGame()` 方法重置游戏状态时，没有重置或保留 `selectedAscensionLevel`
- 玩家重试时可能期望使用之前的难度设置

**影响**: 低 - 重试时可能需要重新选择难度，但这不是必需的功能

---

### ❌ 2. 排行榜兼容性 (Leaderboard Compatibility)

#### 问题 2.1: submitScoreToLeaderboard() 使用旧的 difficulty 字段
**文件**: `src/main.js`  
**位置**: `Game.submitScoreToLeaderboard()` 方法（第3000-3055行）

**问题描述**:
- 方法中使用 `this.selectedDiff || 'normal'`，但新系统已改为 `this.selectedAscensionLevel`（数字 1-25）
- Supabase 数据库的 `difficulty` 字段期望字符串类型（'normal', 'hard', 'nightmare'）

**代码片段**:
```3027:3040:src/main.js
const scoreData = {
  // ...
  difficulty: this.selectedDiff || 'normal', // ❌ 使用了已废弃的 selectedDiff
  // ...
};
```

**影响**: **严重** - 会导致排行榜上传失败或数据不一致

**修正方案**:
需要创建一个映射函数，将 1-25 的 `ascensionLevel` 映射为字符串标签：
- Lv 1-8 → 'normal'
- Lv 9-16 → 'hard'
- Lv 17-24 → 'nightmare'
- Lv 25 → 'nightmare' 或新增 'transcendence'

---

#### 问题 2.2: LeaderboardUI 筛选按钮硬编码
**文件**: `src/ui/LeaderboardUI.js`  
**位置**: `ensureLeaderboardContainer()` 方法（第19-78行）

**问题描述**:
- 筛选按钮硬编码为 `'normal'`, `'hard'`, `'nightmare'`
- 无法按具体的 ascensionLevel（1-25）进行筛选

**代码片段**:
```32:37:src/ui/LeaderboardUI.js
<div class="leaderboard-filters">
  <button class="filter-btn active" data-difficulty="">全部</button>
  <button class="filter-btn" data-difficulty="normal">普通</button>
  <button class="filter-btn" data-difficulty="hard">困难</button>
  <button class="filter-btn" data-difficulty="nightmare">噩梦</button>
</div>
```

**影响**: 中等 - 排行榜筛选功能可以正常工作（因为使用映射后的字符串），但无法精确按层级筛选

**修正方案选项**:
- **选项 A（推荐）**: 保持现有 UI，但在数据库中添加 `ascension_level` 字段（数字），筛选时同时考虑 `difficulty` 和 `ascension_level`
- **选项 B**: 完全重写排行榜 UI，支持按层级筛选（1-25）

---

### ⚠️ 3. 战斗逻辑实装 (Combat Mechanics)

#### 问题 3.1: 陷阱伤害未应用 ascensionLevel 修饰符
**文件**: `src/main.js`  
**位置**: `Game.update()` 方法中的陷阱触发逻辑（第1052-1065行）

**问题描述**:
- 陷阱触发时，使用固定的 `OBJ_TRAP.damage`（值为 10）
- 没有读取陷阱对象中存储的动态伤害值（`trapDamage`）
- 地图生成时已计算了 `trapDamage = Math.floor(OBJ_TRAP.damage * trapDamageMultiplier)`，但触发时没有使用

**代码片段**:
```1052:1065:src/main.js
const trapAtPlayer = this.map.getObjectAt(this.player.x, this.player.y);
if (trapAtPlayer && trapAtPlayer.type === 'OBJ_TRAP' && !trapAtPlayer.triggered) {
  // ...
  const damage = OBJ_TRAP.damage; // ❌ 使用固定值，忽略了 ascensionLevel 修饰符
  this.player.takeDamage(damage);
  // ...
}
```

**对比**（MapSystem 中已正确计算）:
```458:460:src/systems/MapSystem.js
const trapDamage = Math.floor(OBJ_TRAP.damage * trapDamageMultiplier);
this.objects.push({
  type: 'OBJ_TRAP',
  // ...
  damage: trapDamage // ✅ 已存储动态伤害值
});
```

**影响**: 中等 - Lv12+ 的陷阱伤害加成不会生效，导致实际难度低于预期

**修正方案**: 使用 `trapAtPlayer.damage || OBJ_TRAP.damage` 作为伤害值

---

#### 问题 3.2: bossEnrage 在 tryChasePlayer 中的实现
**文件**: `src/entities.js`  
**位置**: `Monster.tryChasePlayer()` 方法（第670-676行）

**问题描述**:
- `bossEnrage` 机制在 `tryChasePlayer()` 中动态调整 `attackCooldown`
- 但这只影响攻击冷却检查，不会永久修改怪物的 `attackCooldown` 属性
- 如果 Boss 在狂暴状态下移动或受到其他影响，可能会重置攻击冷却

**代码片段**:
```670:676:src/entities.js
let effectiveAttackCooldown = this.attackCooldown;
if (this.type === 'BOSS' && this.ascConfig && this.ascConfig.bossEnrage) {
  const hpPercent = this.stats.hp / this.stats.maxHp;
  if (hpPercent < 0.5) {
    // Boss狂暴：攻击冷却时间减少30%（攻击速度+30%）
    effectiveAttackCooldown = Math.floor(this.attackCooldown * 0.7);
  }
}
```

**影响**: 低 - 功能可以正常工作，但建议在 `Monster.update()` 中持久化修改 `attackCooldown`

---

### ⚠️ 4. 地图生成算法 (Map Generation)

#### 问题 4.1: 怪物数量计算可能丢失精度
**文件**: `src/systems/MapSystem.js`  
**位置**: 房间内怪物生成逻辑（第366-371行）

**问题描述**:
- `count = Math.floor(baseCount * monsterDensityMultiplier)` 使用 `Math.floor`
- 当 `monsterDensityMultiplier` 很小时（如 1.05），可能导致实际生成的怪物数量与预期不符
- 例如：`baseCount = 3`, `multiplier = 1.05` → `count = Math.floor(3.15) = 3`（无变化）

**代码片段**:
```366:371:src/systems/MapSystem.js
const monsterDensityMultiplier = 1 + ascConfig.monsterDensity;
rooms.forEach(r => {
  // ...
  const baseCount = Math.max(3, Math.floor((r.w * r.h) / 8));
  const count = Math.floor(baseCount * monsterDensityMultiplier); // ⚠️ 可能丢失精度
  // ...
});
```

**影响**: 低 - 在低层级时影响很小，但层级越高影响越明显

**修正方案**: 使用 `Math.ceil()` 或 `Math.round()`，确保至少有一个怪物的增加

---

#### 问题 4.2: guaranteedCurseAltar 可能因空间不足而失败
**文件**: `src/systems/MapSystem.js`  
**位置**: `generateLevel()` 中的诅咒祭坛生成逻辑（需要查找）

**问题描述**:
- 如果 Lv25 的 `guaranteedCurseAltar` 为 true，但地图空间不足（所有可用位置都被占用），`placeObject` 可能会失败
- 没有错误处理或重试机制

**影响**: 低 - 这种情况很少发生，但应该添加日志记录失败情况

---

### ✅ 5. UI 边界与交互 (UI Edge Cases)

#### 问题 5.1: changeAscensionLevel() 边界检查
**文件**: `src/main.js`  
**位置**: `Game.changeAscensionLevel()` 方法（第2514-2517行）

**代码片段**:
```2514:2517:src/main.js
changeAscensionLevel(direction) {
  const newLevel = Math.max(1, Math.min(25, this.selectedAscensionLevel + direction));
  this.setAscensionLevel(newLevel);
}
```

**状态**: ✅ **已正确实现** - 使用 `Math.max(1, Math.min(25, ...))` 确保值在 1-25 范围内

---

#### 问题 5.2: Tooltip 显示逻辑
**文件**: `src/main.js`  
**位置**: `Game.updateAscensionTooltip()` 方法（第2523-2538行）

**问题描述**:
- Tooltip 通过 CSS `:hover` 伪类显示（`style.css` 中的 `.ror-diff-display:hover .ror-diff-tooltip`）
- 没有 JavaScript 事件处理来防止快速移入移出导致的闪烁

**影响**: 极低 - CSS hover 已经可以处理基本的显示/隐藏

---

## 修正优先级

### 🔴 高优先级（必须修复）
1. **问题 2.1**: 排行榜提交使用错误的 difficulty 字段
2. **问题 1.1**: SaveSystem 未保存 ascensionLevel
3. **问题 1.2**: SaveSystem.restore() 未读取 ascensionLevel

### 🟡 中优先级（建议修复）
4. **问题 3.1**: 陷阱伤害未应用 ascensionLevel 修饰符
5. **问题 2.2**: LeaderboardUI 筛选按钮硬编码（可选）

### 🟢 低优先级（可选优化）
6. **问题 4.1**: 怪物数量计算精度丢失
7. **问题 3.2**: bossEnrage 实现优化
8. **问题 4.2**: guaranteedCurseAltar 错误处理
9. **问题 1.3**: restartGame() 难度重置（可选）

---

## 修正方案总览

### 方案 A: 最小修改（推荐）
- 修复问题 2.1: 创建 `getDifficultyString(ascensionLevel)` 映射函数
- 修复问题 1.1-1.2: 在 `save()` 和 `restore()` 中添加 `ascensionLevel` 字段
- 修复问题 3.1: 使用 `trapAtPlayer.damage` 替代 `OBJ_TRAP.damage`

### 方案 B: 完整迁移（如需精确筛选）
- 所有方案 A 的修改
- 修改 Supabase 数据库架构，添加 `ascension_level` 数字字段
- 更新 `LeaderboardUI` 支持按层级筛选
- 更新 `SupabaseService.submitRun()` 同时保存字符串和数字

---

## 风险评估

### 数据兼容性风险
- **旧存档**: 加载时如果缺少 `ascensionLevel` 字段，应默认为 Lv1（✅ 已在代码中处理）
- **排行榜数据**: 旧数据使用字符串难度，新数据使用映射后的字符串，可以兼容

### 功能回归风险
- **低**: 修改主要集中在数据持久化和排行榜提交，不影响核心游戏逻辑

### 性能影响
- **无**: 所有修改都是数据层面的，不涉及性能关键路径

---

## 测试建议

1. **存档/读取测试**: 
   - 创建新游戏（Lv15），存档，重新加载，验证难度仍为 Lv15

2. **排行榜测试**:
   - 以不同层级完成游戏，验证提交的数据格式正确

3. **陷阱伤害测试**:
   - 在 Lv12+ 触发陷阱，验证伤害是否包含加成

4. **边界测试**:
   - 测试 Lv1 和 Lv25 的所有功能
   - 测试从 Lv25 切换到 Lv1 再切换回来

---

## 结论

核心功能已正确实装，但存在以下必须修复的问题：
1. 存档系统未保存/读取 `ascensionLevel`
2. 排行榜提交使用了错误的难度字段

建议先修复高优先级问题，再进行完整测试。
