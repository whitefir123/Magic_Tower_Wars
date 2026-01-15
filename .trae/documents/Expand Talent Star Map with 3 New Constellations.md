I will expand the "Talent Star Map" by adding three new constellations, inspired by real celestial patterns, branching from existing intermediate nodes to create a richer and more surprising progression path.

### 1. New Constellation: Phoenix (The Firebird) - Rebirth & Survival

* **Theme**: Rising from ashes, focusing on durability and damage mitigation.

* **Location**: Branches from **Leo (Lion)** (`leo_medium`) at the top-left, soaring further outward.

* **Structure**:

  * **Node 1 (Spark)**: Max HP +30.

  * **Node 2 (Flame)**: Final Damage Reduction +3%.

  * **Medium Node (Blaze)**: Max HP +10%, Physical Defense +5.

  * **Keystone (Nirvana)**: "Phoenix Soul" - Max HP +25%, Final Damage Reduction +8%.

### 2. New Constellation: Aquarius (The Water Bearer) - Mana & Flow

* **Theme**: Fluidity and magical depth.

* **Location**: Branches from **Cassiopeia (Intellect)** (`int_3`) at the top-right.

* **Structure**:

  * **Node 1 (Stream)**: Max MP +30.

  * **Node 2 (Tide)**: Magic Attack +6.

  * **Medium Node (Deep)**: Max MP +10%, Cooldown Reduction +3%.

  * **Keystone (Ocean's Wrath)**: "Tidal Force" - Magic Attack +15%, Max MP +20%.

### 3. New Constellation: Taurus (The Bull) - Tenacity & Power

* **Theme**: Unstoppable force, mixing defense with offense.

* **Location**: Branches from **Ursa Major (Defense)** (`def_2`) on the left side.

* **Structure**:

  * **Node 1 (Horn)**: Physical Defense +5.

  * **Node 2 (Charge)**: Physical Attack +6.

  * **Medium Node (Rage)**: Physical Attack +8%, Max HP +50.

  * **Keystone (Unstoppable)**: "Minotaur's Might" - Physical Defense +15%, Physical Attack +10%.

### Implementation Details

* **File to Edit**: `src/TalentData.js`.

* **Coordinates**: Carefully calculated to form recognizable constellation shapes (e.g., the 'V' of Taurus, the rising curve of Phoenix).

* **Logic**: Uses existing supported stats (`final_dmg_reduce`, `max_hp_percent`, etc.) to ensure immediate compatibility with the game engine without risky core logic modifications.

