# Requirements Document

## Introduction

This document specifies the requirements for enhancing the existing blacksmith/forge system in a roguelike dungeon crawler game. The enhancement adds strategic depth through failure mechanics, protection systems, enchantments, awakening, batch operations, and expanded material/gem systems while maintaining backward compatibility with existing save files.

## Glossary

- **Blacksmith_System**: The core system managing equipment enhancement, reforging, gem operations, and dismantling
- **Enhancement_Level**: Numeric value from +0 to +15 (expandable to +20) representing equipment power
- **Quality_Tier**: Equipment quality classification (Common, Uncommon, Rare, Epic, Legendary, Mythic)
- **Protection_Scroll**: Consumable item preventing enhancement level decrease on failure
- **Blessing_Stone**: Consumable item increasing enhancement success rate
- **Set_Essence**: Special material required for set enhancement operations
- **Set_Enhancement**: Enhancement applied to equipment sets providing additional set bonuses
- **Specialization_Direction**: Permanent enhancement path choice (Attack, Defense, Speed, Balanced)
- **Blacksmith_NPC**: Non-player character providing forge services with level and affinity systems
- **Enchantment**: Special effect applied to equipment independent of enhancement level
- **Enchantment_Scroll**: Material required to apply enchantments
- **Awakening**: Special transformation for Mythic +15 equipment granting unique skills
- **Awakening_Stone**: Rare material required for equipment awakening
- **Enhancement_Material**: Resources obtained from dismantling used for forge operations
- **Gem_Quality**: Classification of gems (Normal, Fine, Perfect)
- **Forge_UI**: User interface for all blacksmith operations

## Requirements

### Requirement 1: Enhancement Failure Mechanism

**User Story:** As a player, I want enhancement to have risk at high levels, so that achieving maximum enhancement feels rewarding and strategic.

#### Acceptance Criteria

1. WHEN enhancement level is +9 or below, THE Blacksmith_System SHALL succeed with 100% probability
2. WHEN enhancement level is +10 or above, THE Blacksmith_System SHALL calculate failure probability based on current level
3. WHEN enhancement fails, THE Blacksmith_System SHALL decrease equipment enhancement level by 1
4. WHEN enhancement succeeds, THE Blacksmith_System SHALL increase equipment enhancement level by 1
5. THE Blacksmith_System SHALL persist enhancement level changes to save data immediately after each attempt

### Requirement 2: Protection Item System

**User Story:** As a player, I want to use protection items to mitigate enhancement risks, so that I can strategically manage my resources.

#### Acceptance Criteria

1. WHEN a Protection_Scroll is consumed during enhancement, THE Blacksmith_System SHALL prevent level decrease on failure
2. WHEN a Blessing_Stone is consumed during enhancement, THE Blacksmith_System SHALL increase success rate by a fixed percentage
3. WHEN multiple Blessing_Stones are used, THE Blacksmith_System SHALL stack success rate bonuses additively
4. THE Blacksmith_System SHALL consume protection items from inventory before processing enhancement
5. WHEN enhancement fails with Protection_Scroll active, THE Blacksmith_System SHALL maintain current enhancement level

### Requirement 3: Enhancement Visual Feedback

**User Story:** As a player, I want clear visual feedback for enhancement results, so that I understand what happened immediately.

#### Acceptance Criteria

1. WHEN enhancement succeeds, THE Forge_UI SHALL display success animation with positive visual effects
2. WHEN enhancement fails, THE Forge_UI SHALL display failure animation with negative visual effects
3. WHEN enhancement completes, THE Forge_UI SHALL play corresponding audio feedback
4. THE Forge_UI SHALL display enhancement probability percentage before confirmation
5. THE Forge_UI SHALL show protection item status and effects in the enhancement interface

### Requirement 4: Set Enhancement System

**User Story:** As a player, I want to enhance equipment sets together, so that I can unlock additional set bonuses.

#### Acceptance Criteria

1. WHEN all equipment pieces in a set are present, THE Blacksmith_System SHALL enable set enhancement option
2. WHEN set enhancement is performed, THE Blacksmith_System SHALL require Set_Essence material
3. WHEN set enhancement succeeds, THE Blacksmith_System SHALL increase set enhancement level for all set pieces
4. THE Blacksmith_System SHALL track set enhancement level separately from individual enhancement level
5. WHEN calculating equipment stats, THE Blacksmith_System SHALL apply both individual and set enhancement bonuses

### Requirement 5: Specialization Direction System

**User Story:** As a player, I want to choose enhancement specializations at milestones, so that I can customize my equipment build.

#### Acceptance Criteria

1. WHEN equipment reaches +5, +10, or +15, THE Blacksmith_System SHALL prompt for specialization direction choice
2. THE Blacksmith_System SHALL offer four directions: Attack Focus, Defense Focus, Speed Focus, Balanced
3. WHEN a direction is chosen, THE Blacksmith_System SHALL record the choice permanently for that equipment
4. WHEN calculating enhancement bonuses, THE Blacksmith_System SHALL apply direction-specific attribute multipliers
5. THE Blacksmith_System SHALL prevent changing specialization direction after selection

### Requirement 6: Blacksmith NPC Character System

**User Story:** As a player, I want to interact with a blacksmith character, so that the forge feels more immersive and rewarding.

#### Acceptance Criteria

1. THE Blacksmith_NPC SHALL have a level system starting at level 1
2. WHEN forge operations are completed, THE Blacksmith_NPC SHALL gain experience points
3. WHEN Blacksmith_NPC reaches level thresholds, THE Blacksmith_System SHALL unlock new features
4. THE Blacksmith_NPC SHALL have an affinity value that increases through interactions
5. WHEN affinity reaches thresholds, THE Blacksmith_NPC SHALL provide discounts or special services

### Requirement 7: Blacksmith Dialogue System

**User Story:** As a player, I want to have conversations with the blacksmith, so that the game world feels more alive.

#### Acceptance Criteria

1. WHEN entering the forge, THE Forge_UI SHALL display Blacksmith_NPC greeting dialogue
2. THE Blacksmith_NPC SHALL have dialogue variations based on current level and affinity
3. WHEN completing special milestones, THE Blacksmith_NPC SHALL display unique dialogue responses
4. THE Forge_UI SHALL support dialogue choices that affect affinity
5. THE Blacksmith_NPC SHALL provide quest dialogue for blacksmith-specific quests

### Requirement 8: Enchantment System

**User Story:** As a player, I want to add special effects to my equipment, so that I can further customize my build.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL provide enchantment slots independent of enhancement level
2. WHEN applying an enchantment, THE Blacksmith_System SHALL require an Enchantment_Scroll
3. THE Blacksmith_System SHALL support enchantment types: lifesteal, critical, elemental damage, resistance
4. WHEN an enchantment slot is filled, THE Blacksmith_System SHALL allow overwriting with a new enchantment
5. THE Blacksmith_System SHALL apply enchantment effects to equipment stats immediately

### Requirement 9: Enchantment Tier System

**User Story:** As a player, I want enchantments of different power levels, so that progression feels meaningful.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL classify enchantments into three tiers: Basic, Advanced, Master
2. WHEN applying an enchantment, THE Blacksmith_System SHALL determine effect magnitude based on tier
3. THE Blacksmith_System SHALL require tier-appropriate Enchantment_Scroll materials
4. THE Forge_UI SHALL display enchantment tier and effect values clearly
5. WHEN calculating equipment power, THE Blacksmith_System SHALL include enchantment contributions

### Requirement 10: Equipment Awakening System

**User Story:** As a player, I want to awaken my best equipment for unique abilities, so that endgame progression remains engaging.

#### Acceptance Criteria

1. WHEN equipment is Mythic quality and +15 enhancement, THE Blacksmith_System SHALL enable awakening option
2. WHEN awakening is performed, THE Blacksmith_System SHALL require Awakening_Stone material
3. WHEN awakening succeeds, THE Blacksmith_System SHALL grant a unique skill from the awakening skill library
4. THE Blacksmith_System SHALL mark awakened equipment with a special flag
5. THE Forge_UI SHALL display awakened status with distinct visual indicators

### Requirement 11: Awakening Skill Library

**User Story:** As a player, I want awakened equipment to have varied abilities, so that each awakening feels unique.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL maintain a library of awakening skills with active and passive types
2. WHEN awakening equipment, THE Blacksmith_System SHALL randomly select a skill from the appropriate category
3. THE Blacksmith_System SHALL ensure awakening skills are appropriate for equipment type
4. THE Blacksmith_System SHALL persist awakening skill data with equipment data
5. WHEN equipment is used, THE Blacksmith_System SHALL apply awakening skill effects

### Requirement 12: Batch Enhancement Operations

**User Story:** As a player, I want to enhance equipment to a target level automatically, so that I can save time on repetitive operations.

#### Acceptance Criteria

1. THE Forge_UI SHALL provide a batch enhancement interface with target level selection
2. WHEN batch enhancement is initiated, THE Blacksmith_System SHALL perform sequential enhancements until target or failure
3. WHEN batch enhancement encounters failure, THE Blacksmith_System SHALL stop and report results
4. THE Forge_UI SHALL display real-time progress during batch enhancement
5. THE Blacksmith_System SHALL consume resources and apply protection items according to user settings

### Requirement 13: Batch Dismantling Operations

**User Story:** As a player, I want to dismantle multiple items at once, so that inventory management is efficient.

#### Acceptance Criteria

1. THE Forge_UI SHALL provide multi-select interface for dismantling operations
2. WHEN batch dismantling is confirmed, THE Blacksmith_System SHALL process all selected items
3. THE Blacksmith_System SHALL calculate total gold and materials from all dismantled items
4. THE Forge_UI SHALL display summary of obtained resources after batch dismantling
5. THE Blacksmith_System SHALL remove all dismantled items from inventory atomically

### Requirement 14: Equipment Comparison System

**User Story:** As a player, I want to compare two equipment items side-by-side, so that I can make informed decisions.

#### Acceptance Criteria

1. THE Forge_UI SHALL provide equipment comparison interface accepting two equipment items
2. WHEN comparison is displayed, THE Forge_UI SHALL show all attributes side-by-side with difference highlighting
3. THE Forge_UI SHALL include enhancement level, quality, enchantments, and awakening status in comparison
4. THE Forge_UI SHALL highlight superior attributes with positive visual indicators
5. THE Forge_UI SHALL support comparison from inventory and forge interfaces

### Requirement 15: Enhancement Preview System

**User Story:** As a player, I want to see what stats I'll get at the next enhancement level, so that I can plan my upgrades.

#### Acceptance Criteria

1. THE Forge_UI SHALL display next level stats preview in the enhancement interface
2. WHEN enhancement level changes, THE Forge_UI SHALL update preview immediately
3. THE Forge_UI SHALL show stat differences between current and next level
4. THE Forge_UI SHALL include specialization direction bonuses in preview calculations
5. THE Forge_UI SHALL display success probability for the next enhancement attempt

### Requirement 16: Enhancement History Tracking

**User Story:** As a player, I want to see my enhancement history, so that I can track my progress and learn from patterns.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL record all enhancement attempts with timestamp, result, and equipment
2. THE Blacksmith_System SHALL maintain success and failure counters per enhancement level
3. THE Blacksmith_System SHALL track total gold invested in forge operations
4. THE Forge_UI SHALL provide history view displaying recent enhancement attempts
5. THE Blacksmith_System SHALL persist enhancement history to save data

### Requirement 17: Achievement System

**User Story:** As a player, I want to earn achievements for forge milestones, so that my accomplishments are recognized.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL define achievements for forge activities (Enhancement Master, Reforge King, etc.)
2. WHEN achievement conditions are met, THE Blacksmith_System SHALL unlock the achievement
3. THE Forge_UI SHALL display achievement notifications when unlocked
4. THE Forge_UI SHALL provide achievement list view showing progress and unlocked achievements
5. THE Blacksmith_System SHALL persist achievement data to save data

### Requirement 18: Statistics Dashboard

**User Story:** As a player, I want to view comprehensive forge statistics, so that I can understand my usage patterns.

#### Acceptance Criteria

1. THE Forge_UI SHALL provide statistics dashboard displaying key metrics
2. THE Forge_UI SHALL show total enhancements, success rate, gold spent, materials used
3. THE Forge_UI SHALL display personal records (highest enhancement, most valuable item, etc.)
4. THE Forge_UI SHALL show milestone progress (total +15 items, awakened items, etc.)
5. THE Forge_UI SHALL update statistics in real-time as operations are performed

### Requirement 19: Material System

**User Story:** As a player, I want to obtain materials from dismantling, so that I can use them for forge operations.

#### Acceptance Criteria

1. WHEN equipment is dismantled, THE Blacksmith_System SHALL yield both gold and Enhancement_Material
2. THE Blacksmith_System SHALL determine material quality based on equipment quality tier
3. THE Blacksmith_System SHALL store materials in a dedicated material inventory
4. WHEN performing forge operations, THE Blacksmith_System SHALL consume appropriate materials
5. THE Blacksmith_System SHALL support material types for enhancement, reforging, and enchanting

### Requirement 20: Material Management System

**User Story:** As a player, I want to manage and convert materials, so that I can optimize my resource usage.

#### Acceptance Criteria

1. THE Forge_UI SHALL provide material storage interface displaying all material types and quantities
2. THE Blacksmith_System SHALL support material conversion between different types
3. WHEN material conversion is performed, THE Blacksmith_System SHALL apply conversion rates
4. THE Forge_UI SHALL display material requirements for all forge operations
5. THE Blacksmith_System SHALL validate material availability before allowing operations

### Requirement 21: Enhanced Gem Quality System

**User Story:** As a player, I want gems to have quality tiers, so that gem progression is more meaningful.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL classify gems into three qualities: Normal, Fine, Perfect
2. WHEN calculating gem stat bonuses, THE Blacksmith_System SHALL apply quality multipliers
3. THE Forge_UI SHALL display gem quality with distinct visual indicators
4. THE Blacksmith_System SHALL persist gem quality data with gem data
5. WHEN socketing gems, THE Blacksmith_System SHALL apply quality-appropriate bonuses

### Requirement 22: Gem Fusion System

**User Story:** As a player, I want to fuse identical gems to upgrade quality, so that I can improve my gems over time.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL support gem fusion requiring two identical gems of the same quality
2. WHEN gem fusion is performed, THE Blacksmith_System SHALL consume both input gems
3. WHEN gem fusion succeeds, THE Blacksmith_System SHALL create one gem of the next quality tier
4. THE Blacksmith_System SHALL prevent fusion of Perfect quality gems (maximum tier)
5. THE Forge_UI SHALL display fusion interface with gem selection and preview

### Requirement 23: Gem Visual Effects

**User Story:** As a player, I want high-tier gems to have special visual effects, so that their value is immediately apparent.

#### Acceptance Criteria

1. WHEN gems are displayed, THE Forge_UI SHALL render quality-appropriate visual effects
2. THE Forge_UI SHALL use distinct particle effects for Fine and Perfect quality gems
3. WHEN gems are socketed, THE Forge_UI SHALL display gem glow effects on equipment
4. THE Forge_UI SHALL animate gem effects during fusion operations
5. THE Forge_UI SHALL ensure gem visual effects are performant on all supported devices

### Requirement 24: Gem Set Effects

**User Story:** As a player, I want to socket matching gem series for bonus effects, so that gem selection is strategic.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL define gem series with thematic groupings
2. WHEN multiple gems from the same series are socketed, THE Blacksmith_System SHALL apply set bonuses
3. THE Blacksmith_System SHALL calculate set bonus magnitude based on number of matching gems
4. THE Forge_UI SHALL display active gem set effects in equipment details
5. WHEN gems are removed or changed, THE Blacksmith_System SHALL recalculate gem set effects

### Requirement 25: Gem Extraction System

**User Story:** As a player, I want to extract gems without destroying them, so that I can reorganize my gem setup.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL support gem extraction as an alternative to gem removal
2. WHEN gem extraction is performed, THE Blacksmith_System SHALL require gold payment
3. WHEN gem extraction succeeds, THE Blacksmith_System SHALL return the gem to inventory intact
4. THE Blacksmith_System SHALL calculate extraction cost based on gem quality and type
5. THE Forge_UI SHALL clearly distinguish between destructive removal and paid extraction

### Requirement 26: Backward Compatibility

**User Story:** As a developer, I want new features to work with existing save files, so that players don't lose progress.

#### Acceptance Criteria

1. WHEN loading a save file without new data fields, THE Blacksmith_System SHALL initialize default values
2. THE Blacksmith_System SHALL migrate existing enhancement data to new format transparently
3. THE Blacksmith_System SHALL preserve all existing equipment attributes during migration
4. WHEN saving game data, THE Blacksmith_System SHALL include all new system data
5. THE Blacksmith_System SHALL validate save data integrity after migration

### Requirement 27: Configuration Management

**User Story:** As a developer, I want all system parameters configurable, so that balancing is flexible.

#### Acceptance Criteria

1. THE Blacksmith_System SHALL load all probability, cost, and bonus values from configuration
2. THE Blacksmith_System SHALL support runtime configuration updates for testing
3. THE Blacksmith_System SHALL validate configuration values on load
4. WHEN configuration is invalid, THE Blacksmith_System SHALL use safe default values and log warnings
5. THE Blacksmith_System SHALL expose configuration through constants.js following existing patterns

### Requirement 28: Error Handling

**User Story:** As a player, I want clear error messages when operations fail, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN an operation fails validation, THE Forge_UI SHALL display specific error message
2. THE Blacksmith_System SHALL validate all inputs before processing operations
3. WHEN insufficient resources exist, THE Forge_UI SHALL display required vs available amounts
4. WHEN operations encounter errors, THE Blacksmith_System SHALL log detailed error information
5. THE Blacksmith_System SHALL ensure failed operations do not corrupt game state

### Requirement 29: Performance Optimization

**User Story:** As a player, I want the forge to remain responsive with large inventories, so that the game feels smooth.

#### Acceptance Criteria

1. WHEN rendering inventory lists, THE Forge_UI SHALL use virtualization for lists exceeding 100 items
2. THE Blacksmith_System SHALL cache calculated equipment stats until modifications occur
3. THE Forge_UI SHALL debounce search and filter operations to prevent excessive recalculation
4. WHEN performing batch operations, THE Blacksmith_System SHALL process in chunks with progress updates
5. THE Forge_UI SHALL maintain 60 FPS during animations on target hardware

### Requirement 30: Mobile Interface Support

**User Story:** As a mobile player, I want touch-friendly forge controls, so that I can use all features comfortably.

#### Acceptance Criteria

1. THE Forge_UI SHALL provide touch targets minimum 44x44 pixels for all interactive elements
2. THE Forge_UI SHALL support touch gestures for common operations (swipe, long-press)
3. THE Forge_UI SHALL adapt layout for portrait and landscape orientations
4. THE Forge_UI SHALL prevent accidental operations through confirmation dialogs on mobile
5. THE Forge_UI SHALL ensure all text is readable at mobile screen sizes
