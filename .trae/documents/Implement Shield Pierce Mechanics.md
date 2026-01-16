# Implementation Plan: Shield Pierce Mechanics

I will implement the "Pierce deals double damage to shields" mechanic as requested.

## 1. Modify `src/entities.js` - `takeDamage` method
- **Update Signature**: Change `takeDamage(amt, type = null)` to `takeDamage(amt, type = null, pierceAmt = 0)`.
- **Logic Change**:
    - Separate the incoming `amt` into `piercePart` and `normalPart`.
    - Apply percentage-based damage reduction (`final_dmg_reduce`) to both parts proportionally (preserving the existing behavior that all damage is reducible by percentage mitigation, even if it ignored defense).
    - **Shield Logic**:
        - **Phase 1 (Pierce)**: `piercePart` attempts to damage the shield first.
            - Calculation: `damageToShield = piercePart * 2`.
            - Shield consumption: `shield -= min(shield, damageToShield)`.
            - Spillover: If shield is exhausted, remaining `piercePart` (calculated from unabsorbed portion) carries over to HP.
        - **Phase 2 (Normal)**: `normalPart` attempts to damage the remaining shield.
            - Calculation: `damageToShield = normalPart`.
            - Shield consumption: `shield -= min(shield, damageToShield)`.
            - Spillover: Remaining `normalPart` carries over to HP.
    - **HP Deduction**: Subtract total remaining damage from HP.

## 2. Modify `src/systems/CombatSystem.js`
- **Update Call Site**: Locate where `player.takeDamage` is called in the monster attack logic.
- **Pass Pierce Parameter**: Pass the calculated `penetrationDamage` variable as the third argument to `takeDamage`.
    - Ensure `penetrationDamage` is correctly scaled if any post-calculation modifiers (like `onDamaged` hooks) altered the `finalDamage`.
    - *Note*: Currently `finalDamage` is modified by hooks. I need to ensure `penetrationDamage` is proportional or tracked correctly. Since hooks modify the *total* damage, I will assume the ratio of `pierce/total` remains constant or simply cap `pierceAmt` at `finalDamage`.

## 3. Verification
- Verify that normal damage still depletes shield 1:1.
- Verify that pierce damage depletes shield 2:1.
- Verify that "typeless" damage (null type) bypasses shields (existing logic).
