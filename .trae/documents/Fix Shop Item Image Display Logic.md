I have identified the issues causing the shop item images not to display correctly. The image URLs in `src/data/assets.js` are actually correct and match the ones you provided. The problem lies in the `ShopUI.js` code which has two main bugs:

1.  **Incorrect Gem Slicing in Service List**: In `renderServiceItems`, Gem items are incorrectly treated as "Weapons" (which use a 4x4 grid), but Gems actually use a 5x4 grid. This causes the Gem icons to be sliced incorrectly, showing the wrong part of the image or nothing at all.
2.  **Broken Image Loading Callback**: When images are loading (not yet cached), the code tries to call a non-existent method `renderShopGoods()` to refresh the view. This fails, so if images aren't ready immediately, they never show up.

**Plan:**
1.  **Fix `src/ui/ShopUI.js`**:
    *   Update `renderServiceItems` to correctly set `type: 'GEM'` for gem items, so the icon slicer uses the correct 5-column grid.
    *   Update `createItemIcon` to call `this.render()` (the correct method) instead of `renderShopGoods()` when images finish loading.

This will ensure all items, including Gems, Consumables, and Equipment, render correctly in the Shop, just as they do in the Inventory.