I will implement the requested changes to the equipment socket system and item renaming.

**Plan:**

1. **Update** **`src/data/items.js`**:

   * Add/Update the definition for `ITEM_STARDUST_DRILL` in `EQUIPMENT_DB`.

   * Set its name to "Drill" (English) and "钻头" (Chinese).

   * Keep the ID as `ITEM_STARDUST_DRILL` to maintain compatibility with existing references.

2. **Update** **`src/systems/LootGenerationSystem.js`**:

   * Modify `buildItemObject` to restore and adjust the random socket generation logic.

   * Implement a weighted random system for socket counts based on item quality (e.g., Common: 0-10% chance for 1, Legendary: high chance for 2-3).

   * Ensure newly generated items initialize their `sockets` array correctly.

3. **Update** **`src/systems/BlacksmithSystem.js`**:

   * Verify `unlockSocket` logic ensures drills can add sockets up to the maximum limit (currently 3).

   * Update any hardcoded text messages to use the new item name "钻头".

4. **Update** **`src/ui/ForgeUI.js`**:

   * Ensure the UI displays the correct name "钻头" when showing the socket unlocking requirement.

**Note on "Extra" Sockets:**
The system will interpret "extra add" as the ability to unlock additional sockets on an item *after* it has been generated, up to the global maximum (3 sockets). For example, if an item drops with 1 socket, the player can use Drills to unlock the 2nd and 3rd sockets.

以上的修改意见：我希望用钻头打的孔位没有上限；随机生成的最大孔位为5个，不同品质随机生成的孔位数量需要适当调整，并且高品质的有保底2个孔位。
