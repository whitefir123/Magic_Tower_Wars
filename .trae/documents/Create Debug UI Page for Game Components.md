I will create a standalone HTML file `debug_ui.html` in the project root. This file will:

1.  **Import CSS**: Re-use `src/css/main.css` and `mobile-adapt.css` to ensure visual consistency with the main game.
2.  **Mock Game State**: Create a minimal `window.game` object with necessary player stats (gold, HP, etc.) and system interfaces (audio, logs, inventory) to satisfy the dependencies of the UI components.
3.  **Import UI Modules**: Directly import the existing ES modules for the components you requested:
    -   `ShopUI.js` (Shop)
    -   `GamblerUI.js` (Gambler)
    -   `ForgeUI.js` (Anvil/Blacksmith)
4.  **Implement Shrine (Statue) Logic**: Extract the Shrine interaction logic from `src/main.js` and adapt it into the test page, as it's not a standalone UI class.
5.  **Add Control Panel**: Provide a top navigation bar with buttons to toggle each of these UI overlays instantly.

This approach ensures that **any changes you make to the source files (e.g., `src/ui/ShopUI.js`) will be immediately reflected in this test page**, satisfying your requirement for synchronization and ease of modification.