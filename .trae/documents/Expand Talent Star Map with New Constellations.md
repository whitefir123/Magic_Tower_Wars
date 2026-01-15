I will expand the Talent Star Map (TalentData.js) with three new constellation-themed branches to enrich the out-of-game progression system.

### 1. Phoenix (凤凰座) - The Fire of Rebirth
*   **Theme**: Survival & Magic Power.
*   **Location**: Upper Right (Branching from Draco/Penetration).
*   **Pivot**: Starts from `pen_1` (Draco).
*   **Nodes**:
    *   `phoenix_1` (Ankaa): Max HP & Magic Atk.
    *   `phoenix_2` (Fire Wing): Magic Atk & Magic Def.
    *   `phoenix_medium` (Heart of Fire): Large Magic Atk boost.
    *   **Keystone**: `keystone_phoenix` (**Nirvana/涅槃**): Significantly increases Max HP (+30%) and Magic Atk (+10%).

### 2. Pegasus (飞马座) - The Celestial Wing
*   **Theme**: Speed & Evasion.
*   **Location**: Upper Left (Branching from Ursa Major/Defense).
*   **Pivot**: Starts from `def_2` (Ursa Major).
*   **Nodes**:
    *   `pegasus_1` (Markab): Dodge & Move Speed.
    *   `pegasus_2` (Scheat): Atk Speed & Dodge.
    *   `pegasus_medium` (Wind Wings): Large Atk Speed boost.
    *   **Keystone**: `keystone_pegasus` (**Meteor Wings/天马之翼**): Massive Attack Speed (+25%) and Dodge (+5%) boost.

### 3. Southern Cross (南十字座) - The Guiding Star
*   **Theme**: Resource & Guidance.
*   **Location**: Deep South (Extending from Libra/Economy).
*   **Pivot**: Starts from `keystone_golden` (Libra).
*   **Nodes**:
    *   `cross_1` (Acrux): Gold Rate & Max MP.
    *   `cross_2` (Mimosa): Max MP & Magic Def.
    *   `cross_3` (Gacrux): Gold Rate.
    *   **Keystone**: `keystone_cross` (**Star Guide/星引**): Gold Rate (+20%) and Max MP (+20%).

### Implementation Details
*   Modify `src/TalentData.js` to add these node definitions with appropriate coordinates and connections.
*   Ensure all new stats use existing supported properties (`max_hp_percent`, `atk_speed`, `gold_rate`, etc.) to guarantee functionality without engine modifications.
*   No changes to `TalentTreeUI.js` are needed as it renders dynamically based on data.
