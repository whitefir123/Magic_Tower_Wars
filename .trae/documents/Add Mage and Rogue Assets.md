# Add Mage and Rogue Assets and Update Character Logic

I will integrate the provided Mage and Rogue assets into the game, enabling their specific visuals in both the hero selection screen and during gameplay.

## Asset Configuration
### Update `src/data/assets.js`
1.  Add `PLAYER_MAGE` and `PLAYER_ROGUE` to `GAMEPLAY_ASSETS` with the provided sprite sheet URLs.
2.  Add `PORTRAIT_MAGE` and `PORTRAIT_ROGUE` to `CRITICAL_ASSETS` with the provided portrait animation URLs.
3.  Add `PLAYER_WARRIOR` and `PORTRAIT_WARRIOR` for consistency (using existing Warrior assets).

## Character Data Update
### Update `src/data/characters.js`
1.  Update `WARRIOR`, `MAGE`, and `ROGUE` entries.
2.  Set `asset` property to the new specific asset keys (e.g., `PLAYER_MAGE`).
3.  Add a new `portrait` property to each character, pointing to the corresponding portrait asset keys (e.g., `PORTRAIT_MAGE`).

## Player Entity Logic
### Update `src/entities.js`
1.  Modify the `Player` class constructor.
2.  Change the sprite initialization to use `charConfig.asset` if available, instead of hardcoding `'PLAYER'`. This ensures the in-game character uses the correct sprite sheet.

## Hero Selection UI
### Update `src/main.js`
1.  Modify the `selectCharacter` function.
2.  Update the `#ror-preview-sprite` background image to dynamically use the selected character's `portrait` URL (resolved from `ASSETS`).
3.  This will enable the correct animated portrait to appear when a hero is selected.

## Verification
1.  Verify that selecting Mage or Rogue in the menu shows the correct animated portrait.
2.  Verify that starting the game with Mage or Rogue renders the correct character sprite in-game.
3.  Ensure Warrior still works correctly as the default.
