# Implementation Plan: Blacksmith System Enhancement

## Overview

This implementation plan breaks down the blacksmith system enhancement into incremental, testable steps. The approach prioritizes core functionality first, then adds advanced features, ensuring each step builds on previous work and maintains backward compatibility.

## Implementation Strategy

1. **Foundation First**: Set up data structures, configuration, and migration
2. **Core Features**: Enhancement failure, protection items, materials
3. **Advanced Systems**: Enchantments, awakening, set enhancement
4. **Quality of Life**: Batch operations, comparison, preview
5. **Polish**: History, achievements, NPC progression, UI enhancements

## Tasks

- [ ] 1. Set up foundation and data structures
  - Create extended data models for equipment, save data, and materials
  - Implement save data migration for backward compatibility
  - Add configuration constants for all new systems
  - Set up test infrastructure with fast-check for property-based testing
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 27.1, 27.2, 27.3, 27.4_

- [ ] 1.1 Write property tests for save migration
  - **Property 63: Save migration initialization**
  - **Property 64: Save migration preservation**
  - **Property 65: Save completeness**
  - **Property 66: Save integrity validation**
  - **Validates: Requirements 26.1, 26.2, 26.3, 26.4, 26.5**

- [ ] 1.2 Write property tests for configuration system
  - **Property 67: Configuration loading**
  - **Property 68: Runtime configuration updates**
  - **Property 69: Configuration validation**
  - **Property 70: Configuration fallback**
  - **Validates: Requirements 27.1, 27.2, 27.3, 27.4**

- [ ] 2. Implement enhancement failure mechanism
  - [ ] 2.1 Create EnhancementEngine class with failure probability calculation
    - Implement calculateSuccessProbability() method
    - Add success/failure logic with level adjustment
    - Integrate with existing enhancement system in BlacksmithSystem.js
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Write property tests for enhancement mechanics
    - **Property 1: Enhancement level changes correctly**
    - **Property 2: Low-level enhancement always succeeds**
    - **Property 3: Success probability calculation**
    - **Property 6: Enhancement persistence**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ] 2.3 Add protection item system (Protection Scroll, Blessing Stone)
    - Implement ProtectionItemHandler for scroll and stone mechanics
    - Add inventory management for protection items
    - Integrate protection logic into enhancement flow
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 2.4 Write property tests for protection items
    - **Property 4: Protection scroll prevents level decrease**
    - **Property 5: Resource consumption ordering**
    - **Property 77: Resource validation consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [ ] 2.5 Write unit tests for enhancement edge cases
    - Test enhancement at maximum level
    - Test enhancement with zero resources
    - Test multiple blessing stones stacking
    - Test protection scroll with successful enhancement
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

- [ ] 3. Checkpoint - Verify enhancement system
  - Ensure all enhancement tests pass
  - Verify save/load preserves enhancement state
  - Test UI displays success/failure correctly
  - Ask the user if questions arise

- [ ] 4. Implement material system
  - [ ] 4.1 Create MaterialSystem class
    - Implement material inventory storage
    - Add calculateDismantleYield() for material generation
    - Implement material consumption for operations
    - Add material conversion functionality
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 20.2, 20.3, 20.5_

  - [ ] 4.2 Write property tests for material system
    - **Property 47: Dismantle yields both resources**
    - **Property 48: Material quality mapping**
    - **Property 49: Material storage separation**
    - **Property 50: Material consumption**
    - **Property 51: Material conversion formula**
    - **Property 52: Material validation**
    - **Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5, 20.2, 20.3, 20.5**

  - [ ] 4.3 Integrate materials with existing dismantle system
    - Modify dismantle operation to yield materials
    - Update enhancement/reforge/enchant to consume materials
    - Add material requirements to operation validation
    - _Requirements: 19.1, 19.4, 20.5_

  - [ ] 4.4 Write unit tests for material operations
    - Test dismantling various quality equipment
    - Test material conversion with different rates
    - Test operations with insufficient materials
    - _Requirements: 19.1, 19.2, 20.2, 20.3, 20.5_

- [ ] 5. Implement specialization system
  - [ ] 5.1 Create SpecializationManager class
    - Implement canChooseSpecialization() for milestone detection
    - Add applySpecialization() for direction selection
    - Implement getSpecializationBonuses() for stat calculation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 5.2 Write property tests for specialization
    - **Property 11: Specialization immutability**
    - **Property 12: Specialization multipliers**
    - **Property 13: Specialization persistence**
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [ ] 5.3 Integrate specialization with enhancement flow
    - Add specialization prompt at +5, +10, +15
    - Apply specialization bonuses to stat calculations
    - Persist specialization choices in equipment data
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 5.4 Write unit tests for specialization scenarios
    - Test specialization at each milestone
    - Test attempting to change locked specialization
    - Test stat calculations with different directions
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 6. Implement set enhancement system
  - [ ] 6.1 Create SetEnhancementManager class
    - Implement checkSetCompletion() for set detection
    - Add enhanceSet() for set-wide enhancement
    - Implement calculateSetBonuses() for bonus calculation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 6.2 Write property tests for set enhancement
    - **Property 7: Set completion detection**
    - **Property 8: Set enhancement atomicity**
    - **Property 9: Independent enhancement levels**
    - **Property 10: Combined enhancement bonuses**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5**

  - [ ] 6.3 Write unit tests for set enhancement
    - Test set enhancement with complete set
    - Test set enhancement with incomplete set
    - Test set enhancement with insufficient essence
    - Test stat calculations with set bonuses
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 7. Checkpoint - Verify core systems
  - Ensure all core system tests pass
  - Verify materials, specialization, and set enhancement work together
  - Test save/load with all new data
  - Ask the user if questions arise

- [ ] 8. Implement enchantment system
  - [ ] 8.1 Create EnchantmentSystem class
    - Implement applyEnchantment() for slot management
    - Add getAvailableEnchantments() for enchantment library
    - Implement calculateEnchantmentEffects() for stat application
    - Define enchantment library with all types and tiers
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.5_

  - [ ] 8.2 Write property tests for enchantment system
    - **Property 20: Enchantment independence**
    - **Property 21: Enchantment overwriting**
    - **Property 22: Enchantment stat application**
    - **Property 23: Enchantment tier scaling**
    - **Property 24: Enchantment power contribution**
    - **Validates: Requirements 8.1, 8.4, 8.5, 9.2, 9.5**

  - [ ] 8.3 Write unit tests for enchantment operations
    - Test applying enchantments to different equipment types
    - Test overwriting existing enchantments
    - Test enchantment with insufficient scrolls
    - Test stat calculations with multiple enchantments
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.2, 9.3_

- [ ] 9. Implement awakening system
  - [ ] 9.1 Create AwakeningSystem class
    - Implement canAwaken() for eligibility check
    - Add awaken() for awakening operation
    - Implement rollAwakeningSkill() for skill selection
    - Define awakening skill library for all equipment types
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.4_

  - [ ] 9.2 Write property tests for awakening system
    - **Property 25: Awakening eligibility**
    - **Property 26: Awakening skill assignment**
    - **Property 27: Awakening flag**
    - **Property 28: Awakening skill persistence**
    - **Validates: Requirements 10.1, 10.3, 10.4, 11.2, 11.3, 11.4**

  - [ ] 9.3 Write unit tests for awakening operations
    - Test awakening Mythic +15 equipment
    - Test awakening ineligible equipment
    - Test awakening with insufficient stones
    - Test skill assignment for different equipment types
    - _Requirements: 10.1, 10.2, 10.3, 11.2_

- [ ] 10. Implement enhanced gem system
  - [ ] 10.1 Create GemSystemEnhanced class
    - Implement gem quality system (Normal, Fine, Perfect)
    - Add fuseGems() for gem fusion
    - Implement extractGem() for paid extraction
    - Add calculateGemSetEffects() for set bonuses
    - Define gem series and set effects
    - _Requirements: 21.1, 21.2, 21.4, 22.1, 22.2, 22.3, 22.4, 24.1, 24.2, 24.3, 24.5, 25.1, 25.2, 25.3, 25.4_

  - [ ] 10.2 Write property tests for gem system
    - **Property 53: Gem quality multipliers**
    - **Property 54: Gem quality persistence**
    - **Property 55: Gem fusion validation**
    - **Property 56: Gem fusion consumption**
    - **Property 57: Gem fusion output**
    - **Property 58: Gem set bonus application**
    - **Property 59: Gem set bonus scaling**
    - **Property 60: Gem set recalculation**
    - **Property 61: Gem extraction preservation**
    - **Property 62: Gem extraction cost formula**
    - **Validates: Requirements 21.2, 21.4, 22.1, 22.2, 22.3, 22.4, 24.2, 24.3, 24.5, 25.3, 25.4**

  - [ ] 10.3 Write unit tests for gem operations
    - Test gem fusion with various qualities
    - Test gem fusion with incompatible gems
    - Test gem extraction vs removal
    - Test gem set effects with different combinations
    - _Requirements: 21.1, 22.1, 22.2, 22.3, 22.4, 24.1, 24.2, 25.1, 25.2, 25.3_

- [ ] 11. Checkpoint - Verify advanced systems
  - Ensure enchantment, awakening, and gem tests pass
  - Verify all systems integrate correctly
  - Test complex scenarios (awakened equipment with enchantments and gems)
  - Ask the user if questions arise

- [ ] 12. Implement batch operations
  - [ ] 12.1 Create BatchOperationProcessor class
    - Implement batchEnhance() with progress tracking
    - Add batchDismantle() for multi-item dismantling
    - Implement cancelBatch() for user cancellation
    - Add chunking for large batches
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.5_

  - [ ] 12.2 Write property tests for batch operations
    - **Property 29: Batch enhancement sequence**
    - **Property 30: Batch resource consumption**
    - **Property 31: Batch dismantle completeness**
    - **Property 32: Batch dismantle yield calculation**
    - **Property 33: Batch dismantle atomicity**
    - **Property 76: Batch chunking**
    - **Validates: Requirements 12.2, 12.3, 12.5, 13.2, 13.3, 13.5, 29.4**

  - [ ] 12.3 Write unit tests for batch operations
    - Test batch enhancement to target level
    - Test batch enhancement with failure
    - Test batch dismantle with various item counts
    - Test batch cancellation
    - _Requirements: 12.2, 12.3, 12.5, 13.2, 13.3_

- [ ] 13. Implement comparison and preview systems
  - [ ] 13.1 Add equipment comparison functionality
    - Implement comparison data generation
    - Include all attributes (enhancement, quality, enchantments, awakening)
    - Calculate stat differences
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 13.2 Add enhancement preview functionality
    - Implement next level stat calculation
    - Include specialization bonuses in preview
    - Display success probability
    - Show stat differences
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 13.3 Write property tests for comparison and preview
    - **Property 34: Comparison completeness**
    - **Property 35: Preview stat difference**
    - **Property 36: Preview includes specialization**
    - **Property 37: Preview probability accuracy**
    - **Validates: Requirements 14.3, 15.3, 15.4, 15.5**

  - [ ] 13.4 Write unit tests for comparison and preview
    - Test comparison with various equipment combinations
    - Test preview at different enhancement levels
    - Test preview with specializations
    - _Requirements: 14.3, 15.3, 15.4, 15.5_

- [ ] 14. Implement history tracking and achievements
  - [ ] 14.1 Create HistoryTracker class
    - Implement logEnhancement() for operation logging
    - Add getHistory() with filtering
    - Implement getStatistics() for summary data
    - Add achievement checking and unlocking
    - Define achievement library
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4_

  - [ ] 14.2 Write property tests for history and achievements
    - **Property 38: Enhancement logging**
    - **Property 39: Counter accuracy**
    - **Property 40: Gold tracking**
    - **Property 41: History persistence**
    - **Property 42: Achievement unlocking**
    - **Property 43: Achievement persistence**
    - **Property 44: Statistics accuracy**
    - **Property 45: Personal records**
    - **Property 46: Milestone progress**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.5, 17.2, 17.5, 18.2, 18.3, 18.4**

  - [ ] 14.3 Write unit tests for history and achievements
    - Test logging various operation types
    - Test achievement unlocking conditions
    - Test statistics calculation
    - Test personal records tracking
    - _Requirements: 16.1, 16.2, 16.3, 17.1, 17.2, 18.2, 18.3_

- [ ] 15. Implement Blacksmith NPC system
  - [ ] 15.1 Create BlacksmithNPC class
    - Implement level and experience system
    - Add affinity tracking
    - Implement getDiscountRate() based on affinity
    - Add getDialogue() for context-based dialogue
    - Implement getAvailableFeatures() for level-based unlocks
    - Define dialogue library
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

  - [ ] 15.2 Write property tests for Blacksmith NPC
    - **Property 14: Experience gain**
    - **Property 15: Feature unlocking**
    - **Property 16: Affinity increase**
    - **Property 17: Affinity-based discounts**
    - **Property 18: Dialogue variation**
    - **Property 19: Dialogue choice effects**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 7.2, 7.4**

  - [ ] 15.3 Write unit tests for Blacksmith NPC
    - Test experience gain from operations
    - Test level up and feature unlocking
    - Test affinity increase from interactions
    - Test discount calculation at various affinity levels
    - Test dialogue selection
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.4_

- [ ] 16. Checkpoint - Verify all systems
  - Ensure all tests pass (unit and property)
  - Verify complete integration of all features
  - Test complex multi-system scenarios
  - Ask the user if questions arise

- [ ] 17. Implement error handling and validation
  - [ ] 17.1 Add comprehensive input validation
    - Implement validation for all operation inputs
    - Add resource validation before operations
    - Implement business logic validation
    - _Requirements: 28.1, 28.2, 28.3, 28.5_

  - [ ] 17.2 Write property tests for error handling
    - **Property 71: Validation error messages**
    - **Property 72: Input validation precedence**
    - **Property 73: Resource error details**
    - **Property 74: State integrity on failure**
    - **Validates: Requirements 28.1, 28.2, 28.3, 28.5**

  - [ ] 17.3 Write unit tests for error conditions
    - Test all validation error types
    - Test resource error messages
    - Test state rollback on errors
    - Test error logging
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [ ] 18. Implement performance optimizations
  - [ ] 18.1 Add stat caching system
    - Implement cache for calculated equipment stats
    - Add cache invalidation on equipment modification
    - _Requirements: 29.2_

  - [ ] 18.2 Write property tests for performance features
    - **Property 75: Stat caching**
    - **Validates: Requirements 29.2**

  - [ ] 18.3 Write performance tests
    - Test large inventory operations (1000+ items)
    - Test batch operations with 100+ items
    - Test rapid successive operations
    - Verify memory usage over time
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [ ] 19. Update ForgeUI with new features
  - [ ] 19.1 Add UI for enhancement failure and protection items
    - Display success probability
    - Add protection scroll and blessing stone controls
    - Show success/failure animations
    - Add audio feedback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 19.2 Add UI for specialization selection
    - Display specialization prompt at milestones
    - Show specialization options with descriptions
    - Display current specializations on equipment
    - _Requirements: 5.1, 5.2_

  - [ ] 19.3 Add UI for set enhancement
    - Display set completion status
    - Add set enhancement interface
    - Show set bonuses
    - _Requirements: 4.1_

  - [ ] 19.4 Add UI for enchantment system
    - Display enchantment slots
    - Add enchantment selection interface
    - Show enchantment effects
    - Display tier information
    - _Requirements: 8.1, 9.4_

  - [ ] 19.5 Add UI for awakening system
    - Display awakening eligibility
    - Add awakening interface
    - Show awakening skills
    - Display awakened status
    - _Requirements: 10.1, 10.5_

  - [ ] 19.6 Add UI for gem quality and fusion
    - Display gem quality with visual effects
    - Add gem fusion interface
    - Add gem extraction interface
    - Show gem set effects
    - _Requirements: 21.3, 22.5, 23.1, 23.2, 23.3, 23.4, 24.4, 25.5_

  - [ ] 19.7 Add UI for batch operations
    - Add batch enhancement interface with target level
    - Add batch dismantle multi-select
    - Display progress during batch operations
    - _Requirements: 12.1, 12.4, 13.1, 13.4_

  - [ ] 19.8 Add UI for comparison and preview
    - Add equipment comparison view
    - Display enhancement preview
    - Show stat differences
    - _Requirements: 14.1, 14.2, 14.4, 15.1, 15.2_

  - [ ] 19.9 Add UI for history and achievements
    - Add history view
    - Display statistics dashboard
    - Add achievement list
    - Show achievement notifications
    - _Requirements: 16.4, 17.3, 17.4, 18.1_

  - [ ] 19.10 Add UI for material management
    - Display material inventory
    - Add material conversion interface
    - Show material requirements
    - _Requirements: 20.1, 20.4_

  - [ ] 19.11 Add Blacksmith NPC dialogue UI
    - Display blacksmith character
    - Add dialogue system
    - Show blacksmith level and affinity
    - Display dialogue choices
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 19.12 Implement mobile-friendly UI
    - Ensure touch targets are 44x44 pixels minimum
    - Add touch gesture support
    - Implement responsive layouts
    - Add confirmation dialogs for mobile
    - Ensure text readability
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_

- [ ] 20. Final integration and testing
  - [ ] 20.1 Run full test suite
    - Execute all unit tests
    - Execute all property tests (100 iterations each)
    - Verify code coverage > 80%
    - Fix any failing tests

  - [ ] 20.2 Perform integration testing
    - Test save/load round-trip with all features
    - Test UI integration with all systems
    - Test complex multi-system scenarios
    - Verify backward compatibility with old saves

  - [ ] 20.3 Perform manual testing
    - Test all features in-game
    - Verify mobile compatibility
    - Check audio and visual feedback
    - Test edge cases and error conditions

  - [ ] 20.4 Performance validation
    - Verify 60 FPS during animations
    - Test with large inventories
    - Check memory usage
    - Optimize any bottlenecks

- [ ] 21. Final checkpoint - Complete implementation
  - All tests passing
  - All features working correctly
  - Performance targets met
  - Documentation updated
  - Ready for release

## Notes

- All tasks are required for comprehensive implementation with full test coverage
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100 iterations
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows a bottom-up approach: foundation → core → advanced → polish
- All new features integrate with existing BlacksmithSystem.js and ForgeUI.js
- Backward compatibility is maintained throughout via save data migration
