# 3MG Estimator - Milestones & TODOs

## Critical Features to Maintain

These features are working correctly and should be preserved in all future updates:

1. **PDF Parsing**: The EagleView PDF parsing is working correctly for most measurements, extracting values like:
   - Total area
   - Ridge/Hip/Valley/Rake/Eave lengths
   - Flashing measurements
   - Property location information
   - Feature counts
   - Areas by pitch information

2. **Auto-fill Functionality**: The automatic filling of measurements extracted from PDFs into the measurement form is working well.

3. **Material Calculation Logic**: The special calculation for GAF Timberline HDZ with minimum 12% waste factor is working properly.

## Completed Tasks

- [x] Fix display of Areas by Pitch in the measurement display component
- [x] Ensure all extracted data from PDFs is visible in the UI
- [x] Add better error handling for edge cases in PDF formats
- [x] Remove GAF Royal Sovereign from the material list
- [x] Remove all CertainTeed materials (Landmark Pro, Landmark, and SwiftStart Starter)
- [x] Update GAF WeatherWatch price to $93.89
- [x] Show square counts next to bundle counts (divide bundles by 3) while keeping bundle quantities the same
- [x] Implement special waste factor options (12%, 15%, 20%) for GAF Timberline HDZ
- [x] Fix "Start Fresh" and "Upload Another" functionality
- [x] Add missing materials from AccuLynx screenshots
- [x] Fix negative square count issues with GAF Timberline HDZ

## Current Issues to Fix

1. **Areas by Pitch Display**: The PDF parsing is correctly extracting pitch areas, but they're not displaying properly in the UI. This may be due to:
   - Table size constraints
   - UI formatting issues
   - Conditional rendering logic

## TODO List for Next Development Phase

### Immediate Tasks (High Priority)

- [ ] Implement GAF Package Options:
  - [ ] Create GAF 1 Package (basic package)
  - [ ] Create GAF 2 Package (premium package, includes Cobra)
  - [ ] Add UI option to select between packages
  - [ ] Implement package-specific pricing logic

- [ ] Add Warranty Options:
  - [ ] Silver Pledge warranty option
  - [ ] Gold Pledge warranty option (requires Cobra material from GAF 2)
  - [ ] Add UI toggle for warranty selection
  - [ ] Display warranty requirements in UI

- [ ] Implement Low Slope Area Handling:
  - [ ] Detect 2/12 pitch areas from PDF parsing
  - [ ] Apply special pricing for 2/12 pitch areas ($100/sqr with fixed 10% waste)
  - [ ] Add ISO installation option for 2/12 areas ($50/sqr)
  - [ ] Update calculation logic to apply these rules only to 2/12 pitch areas

### Material & Pricing System Enhancement (Medium Priority)

- [ ] Implement individual price updates for materials
- [ ] Implement individual price updates for labor
- [ ] Create permission system for price management
- [ ] Add price history tracking
- [ ] Design bulk price update functionality
- [ ] Implement markup rules by product category

### UI/UX Improvements (Medium Priority)

- [ ] Enhance mobile responsiveness
- [ ] Add loading states for all async operations
- [ ] Improve form validation and error messaging
- [ ] Create comprehensive estimate review screen
- [ ] Add print-friendly estimate output
- [ ] Add visual indicators for warranty requirements

### Backend Enhancements (Lower Priority)

- [ ] Improve database schema for material pricing
- [ ] Optimize PDF processing performance
- [ ] Add batch processing capabilities for multiple PDFs
- [ ] Implement data export functionality
- [ ] Add API endpoints for integration with other systems

## Development Guidelines

1. Always test PDF parsing with multiple sample files
2. Maintain backward compatibility with existing data
3. Document all APIs and major components
4. Follow the established design system
5. Prioritize user experience and performance
6. Use the existing waste factor handling logic as a reference for new special calculations

## GAF Package Implementation Details

### GAF 1 (Basic Package)
- Includes standard GAF materials
- Compatible with Silver Pledge warranty
- Standard pricing and waste factor rules

### GAF 2 (Premium Package)
- Includes all GAF 1 materials plus premium materials like Cobra
- Required for Gold Pledge warranty
- May have different pricing or discount structure
- Includes upgraded accessories

## Low Slope Area Handling Implementation Details

### 2/12 Pitch Areas
- Automatically identify 2/12 pitch areas from EagleView data
- Apply fixed $100/sqr pricing with 10% waste factor
- Add ISO installation option at $50/sqr
- Create separate line items for these areas in the estimate
- Modify measurement display to highlight 2/12 areas that require special handling

## Pricing System Questions to Address

(These questions will be answered one by one to guide the pricing system development)

1. How frequently do material prices change, and what triggers these changes?
2. Who should have permission to update material vs. labor prices?
3. How are materials grouped into categories?
4. How do you calculate labor rates (hourly, per square, flat rate)?
5. Should the pricing pull from or push to any external systems?
6. Who needs to see the pricing information (internal staff, customers, contractors)?
7. Do you need a preferred format for importing existing pricing data?
8. Are there different markup strategies for different product categories?
9. Do you offer volume discounts on certain materials?
10. Should we track price history for reporting and trend analysis? 