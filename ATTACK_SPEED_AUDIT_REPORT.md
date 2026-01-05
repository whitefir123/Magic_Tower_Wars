# Attack Speed (APS) System - Logic Audit Report

## Executive Summary
The implementation has been completed, but several **critical safety issues** and **edge cases** have been identified that need to be addressed before the system is production-ready.

---

## 1. Math & Data Safety (数值安全)

### ✅ **Issue #1.1: Missing Minimum AS Clamp**
**Location**: `src/entities.js:1629` and `src/entities.js:1648-1651`

**Problem**:
- `getAttackCooldown()` uses `Math.max(1000 / 7.0, 1000 / aps)` which prevents division by zero, BUT:
- If `baseAS + bonusAS` becomes **≤ 0** (e.g., Clunky rune with -0.50 on a character with base 0.5), then:
  - `finalAS = Math.min(7.0, 0.5 + (-0.50)) = 0.0`
  - `getAttackCooldown()` returns `Math.max(142.86, 1000 / 0) = Infinity` ❌
- **Edge Case**: If `bonusAS` is very negative (multiple Clunky runes?), `finalAS` could be negative, causing `1000 / negative = negative cooldown`.

**Fix Plan**:
```javascript
// In getTotalStats(), line ~1629:
const baseAS = this.charConfig?.base_as || 1.0;
const bonusAS = total.atk_speed || 0;
const finalAS = Math.max(0.1, Math.min(7.0, baseAS + bonusAS)); // ✅ Add minimum clamp: 0.1 APS
total.atk_speed = finalAS;
```

**Also update `getAttackCooldown()`**:
```javascript
getAttackCooldown() {
  const aps = this.getAttackSpeed();
  // Safety: Ensure APS is at least 0.1 to prevent Infinity
  const safeAPS = Math.max(0.1, aps);
  return 1000 / safeAPS; // Remove the Math.max(1000/7.0, ...) since we clamp APS itself
}
```

---

### ✅ **Issue #1.2: Stat Initialization Safety**
**Location**: `src/entities.js:1134-1143` (Player constructor)

**Status**: ✅ **GOOD** - `bonusStats` properly initializes `atk_speed: 0`, `p_atk_percent: 0`, `m_atk_percent: 0`

**However**, check **save/load compatibility**:
- If an old save file loads without these fields, `getTotalStats()` uses `|| 0` fallbacks, which is safe.
- **Recommendation**: Add migration logic in save system to ensure old saves get these fields initialized.

---

### ✅ **Issue #1.3: Percentage Damage Order**
**Location**: `src/entities.js:1616-1623`

**Status**: ✅ **CORRECT** - The order is:
1. Stage 1-6: Add all flat bonuses (equipment, runes, sets, etc.)
2. Stage 7: Apply percentage multipliers: `total.p_atk = Math.floor(total.p_atk * (1 + total.p_atk_percent))`
3. Stage 8: Calculate final AS

This is the correct order: `(Base + Flat Bonuses) * (1 + Percent Bonuses)`

---

## 2. Input & State Logic (输入与状态)

### ❌ **Issue #2.1: Post-Kill Movement Bug**
**Location**: `src/main.js:880-893` and `src/main.js:1087-1125`

**Problem**:
1. Player holds key → attacks monster → `pendingCombat` is set
2. Monster dies → `pendingCombat = null` (line 1121)
3. Player **still holding the key** → Next frame, input check passes (`!pendingCombat` is true)
4. Player **immediately walks into the empty tile** where the monster was ❌

**Expected Behavior**: After killing a monster, there should be a brief "cooldown" or check to prevent immediate movement into the death tile.

**Fix Plan**:
```javascript
// In main.js, after monster kill (line ~1121):
this.player.pendingCombat = null;
this.player.isMoving = false;
// ✅ ADD: Reset lastAttackTime to prevent immediate re-attack/movement
this.player.lastAttackTime = Date.now();
// OR: Add a small "post-kill delay" flag
this.player.postKillDelay = Date.now() + 100; // 100ms grace period
```

**And update input check (line ~859)**:
```javascript
if (!this.player.isMoving && 
    this.inputStack.length > 0 && 
    !this.player.pendingCombat && 
    !playerFrozen &&
    (!this.player.postKillDelay || Date.now() >= this.player.postKillDelay)) { // ✅ Add check
  // ... rest of input logic
}
```

---

### ⚠️ **Issue #2.2: Movement Lock vs Attack Wait**
**Location**: `src/main.js:859` and `src/main.js:886-892`

**Status**: ✅ **GOOD** - The logic correctly prevents movement when waiting for attack cooldown:
- `!this.player.isMoving` ensures player isn't already moving
- When cooldown isn't ready, the code does nothing (no movement, no animation)
- `pendingCombat` is only set when attack is ready, preventing input processing

**However**, verify that `isMoving` is properly reset after combat slide completes.

---

### ⚠️ **Issue #2.3: Wall vs Monster Distinction**
**Location**: `src/main.js:867-893`

**Status**: ✅ **GOOD** - The code correctly distinguishes:
- `tile === TILE.WALL` → blocked (line 867)
- `monster` exists → attack logic (line 880)
- Empty tile → movement (line 928)

No issues here.

---

## 3. Legacy Logic Conflicts (旧逻辑冲突)

### ✅ **Issue #3.1: Monster CD Conversion**
**Location**: `src/entities.js:396-406` and `src/entities.js:862-875`

**Status**: ✅ **COMPATIBLE** - The conversion is correct:
- Old system: `baseAttackCooldown = 2000ms` (hardcoded map)
- New system: `baseAS = 0.5` → `baseAttackCooldown = 1000 / 0.5 = 2000ms` ✅
- Boss enrage: Multiplies `base_as * 1.3` (30% speed increase) ✅

**However**, verify that **all monsters** have `base_as` defined. If missing, fallback is `1.0`, which might change monster behavior.

---

### ✅ **Issue #3.2: Hardcoded Delays**
**Location**: `src/systems/CombatSystem.js`

**Status**: ✅ **SAFE** - Found only skill cooldowns (5000ms, 25000ms) which are separate from attack speed system. No conflicts.

---

### ⚠️ **Issue #3.3: Monster Attack Cooldown Calculation**
**Location**: `src/entities.js:403-405`

**Potential Issue**:
```javascript
const baseAttackCooldown = 1000 / baseAS;
this.baseAttackCooldown = Math.max(100, baseAttackCooldown * (1 + ascConfig.atkCooldownMult));
```

If `ascConfig.atkCooldownMult` is negative (e.g., -0.5), and `baseAS` is high (e.g., 1.5), then:
- `baseAttackCooldown = 1000 / 1.5 = 666.67ms`
- `final = Math.max(100, 666.67 * (1 - 0.5)) = Math.max(100, 333.33) = 333.33ms` ✅

This is safe, but verify that `atkCooldownMult` is never < -1.0 (which would make cooldown negative).

---

## 4. UI & Feedback (交互反馈)

### ⚠️ **Issue #4.1: No Visual Feedback for Attack Cooldown**
**Location**: `src/ui/UIManager.js:538-560`

**Status**: ⚠️ **UX GAP** - When player has low AS (e.g., 0.5 APS = 2s cooldown), they stand still for 2 seconds with no visual indication.

**Recommendation** (Optional, not critical):
- Add a small progress bar or cooldown indicator above the player sprite
- Or prevent idle animation reset during cooldown wait
- Or add a subtle "charging" visual effect

**Priority**: Low (can be added later as polish)

---

## 5. Data Structure Confirmation

### ✅ **Confirmed Structure**:
```javascript
player.runeState.bonusStats = {
  p_atk: 0,
  m_atk: 0,
  p_def: 0,
  m_def: 0,
  hp: 0,
  crit_rate: 0,
  dodge: 0,
  gold_rate: 0,
  atk_speed: 0,        // ✅ New: Additive APS bonus
  p_atk_percent: 0,    // ✅ New: Percentage physical attack multiplier
  m_atk_percent: 0     // ✅ New: Percentage magic attack multiplier
}
```

**Initialization**: ✅ Properly initialized in:
- `src/entities.js:1134-1143` (Player constructor)
- `src/data/Runes.js` (All new runes)

---

## 6. Safe Implementation Strategy

### **Priority Order**:

1. **CRITICAL - Fix Math Safety** (Issue #1.1)
   - Add minimum AS clamp (0.1) in `getTotalStats()`
   - Update `getAttackCooldown()` to use clamped APS
   - **Location**: `src/entities.js:1629` and `1648-1651`

2. **HIGH - Fix Post-Kill Movement** (Issue #2.1)
   - Add `postKillDelay` flag or reset `lastAttackTime` after kill
   - Update input check to respect delay
   - **Location**: `src/main.js:1121` and `859`

3. **MEDIUM - Verify Monster Data** (Issue #3.1)
   - Audit all monsters in `src/data/monsters.js` to ensure `base_as` is defined
   - Add fallback warning if missing

4. **LOW - UX Polish** (Issue #4.1)
   - Add visual feedback for attack cooldown (optional)

---

## Summary of Required Fixes

| Issue | Severity | File | Line | Status |
|-------|----------|------|------|--------|
| #1.1: Missing AS clamp | 🔴 CRITICAL | `entities.js` | 1629, 1648 | ❌ Needs Fix |
| #2.1: Post-kill movement | 🟠 HIGH | `main.js` | 1121, 859 | ❌ Needs Fix |
| #3.1: Monster data audit | 🟡 MEDIUM | `monsters.js` | All | ⚠️ Verify |
| #4.1: Visual feedback | 🟢 LOW | `UIManager.js` | N/A | ⚠️ Optional |

---

## Testing Checklist (After Fixes)

- [ ] Test with Clunky rune (-0.50 AS) on Paladin (0.7 base) → Should clamp to 0.1 APS minimum
- [ ] Test holding attack key, kill monster, continue holding → Should not immediately walk into empty tile
- [ ] Test Boss enrage → Should correctly multiply AS by 1.3
- [ ] Test with multiple attack speed runes → Should stack additively
- [ ] Test save/load with attack speed runes → Should preserve AS bonuses
- [ ] Test very high AS (7.0+ cap) → Should cap at 7.0 APS

---

**End of Audit Report**

