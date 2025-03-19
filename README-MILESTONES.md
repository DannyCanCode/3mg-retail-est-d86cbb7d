# 3MG Estimator - Milestones & TODOs

## Critical Features to Maintain

These features are working correctly and should be preserved in all future updates:

1. **PDF Parsing**: The EagleView PDF parsing is working correctly for most measurements, extracting values like:
   - Total area
   - Ridge/Hip/Valley/Rake/Eave lengths
   - Flashing measurements
   - Property location information
   - Feature counts

2. **Auto-fill Functionality**: The automatic filling of measurements extracted from PDFs into the measurement form is working well.

## Current Issues to Fix

1. **Areas by Pitch Display**: The PDF parsing is correctly extracting pitch areas, but they're not displaying properly in the UI. This may be due to:
   - Table size constraints
   - UI formatting issues
   - Conditional rendering logic

## TODO List for Next Development Phase

### Immediate Tasks

- [ ] Fix display of Areas by Pitch in the measurement display component
- [x] Ensure all extracted data from PDFs is visible in the UI
- [x] Add better error handling for edge cases in PDF formats
- [x] Remove GAF Royal Sovereign from the material list
- [x] Remove all CertainTeed materials (Landmark Pro, Landmark, and SwiftStart Starter)
- [x] Update GAF WeatherWatch price to $93.89
- [x] Show square counts next to bundle counts (divide bundles by 3) while keeping bundle quantities the same
- [x] Implement special waste factor options (12%, 15%, 20%) for GAF Timberline HDZ

### Material & Pricing System Enhancement

- [ ] Implement individual price updates for materials
- [ ] Implement individual price updates for labor
- [ ] Create permission system for price management
- [ ] Add price history tracking
- [ ] Design bulk price update functionality
- [ ] Implement markup rules by product category

### UI/UX Improvements

- [ ] Enhance mobile responsiveness
- [ ] Add loading states for all async operations
- [ ] Improve form validation and error messaging
- [ ] Create comprehensive estimate review screen
- [ ] Add print-friendly estimate output

### Backend Enhancements

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