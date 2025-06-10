# Test info

- Name: Create New Estimate via PDF Upload >> should allow a user to create a new estimate by uploading an EagleView PDF
- Location: /Users/danielpedraza/3mg-retail-est-d86cbb7d/e2e/create-estimate.spec.ts:4:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: getByRole('heading', { name: 'Selected Materials' }).locator('..').getByText('GAF Timberline HDZ SG')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Selected Materials' }).locator('..').getByText('GAF Timberline HDZ SG')

    at /Users/danielpedraza/3mg-retail-est-d86cbb7d/e2e/create-estimate.spec.ts:61:76
```

# Page snapshot

```yaml
- text: 3MG Estimator
- button:
  - img
- navigation:
  - link "Dashboard":
    - /url: /
    - img
    - text: Dashboard
  - link "Estimates":
    - /url: /estimates
    - img
    - text: Estimates
  - link "Pricing":
    - /url: /pricing
    - img
    - text: Pricing
  - link "Accounting":
    - /url: /accounting-report
    - img
    - text: Accounting
  - link "Settings":
    - /url: /settings
    - img
    - text: Settings
- text: © 2023 3MG Estimator
- main:
  - heading "Create New Estimate" [level=1]
  - button "Start Fresh":
    - img
    - text: Start Fresh
  - paragraph: Follow the steps below to create a complete estimate
  - tablist:
    - tab "1. Upload EagleView"
    - tab "2. Enter Measurements"
    - tab "3. Select Materials" [selected]
    - tab "4. Labor & Profit"
    - tab "5. Summary"
  - group: Debug Info
  - tabpanel "3. Select Materials":
    - heading "Select Pricing Template" [level=3]
    - paragraph: Choose a pricing template to apply to this estimate
    - text: Pricing Template
    - combobox "Pricing Template": Master
    - button "Apply Template"
    - button "Edit"
    - button "New Template"
    - paragraph: "Template: Master"
    - paragraph: "Materials: 5 items"
    - heading "GAF Package & Warranty Selection" [level=3]
    - heading "GAF Package Selection" [level=3]
    - paragraph: Select a package or double-click to deselect
    - heading "GAF 1 - Basic Package" [level=4]
    - paragraph: Standard GAF materials for quality installation
    - list:
      - listitem: GAF ProStart Starter Shingle Strip (120')
      - listitem: GAF Timberline HDZ
      - listitem: GAF Seal-A-Ridge (25')
      - listitem: GAF WeatherWatch Ice & Water Shield (valleys only)
      - listitem: ABC Pro Guard 20 (Rhino)
    - text: Silver Pledge Eligible
    - paragraph: This package only supports Silver Pledge warranty.
    - heading "GAF 2 - Premium Package" [level=4]
    - paragraph: Premium GAF materials with enhanced protection
    - list:
      - listitem: GAF Timberline HDZ
      - listitem: GAF Seal-A-Ridge (25')
      - listitem: GAF ProStart Starter Shingle Strip (120')
      - listitem: GAF FeltBuster Synthetic Underlayment (10 sq)
      - listitem: GAF WeatherWatch Ice & Water Shield (valleys only)
    - text: Silver Pledge Eligible Gold Pledge Eligible
    - paragraph: This package supports both Silver and Gold Pledge warranties.
    - heading "GAF Warranty Options" [level=3]
    - paragraph: Select a warranty or click again to deselect
    - heading "Silver Pledge Warranty" [level=4]
    - text: Available
    - paragraph: Standard GAF warranty coverage
    - list:
      - listitem: 10-year workmanship coverage
      - listitem: Lifetime material warranty
      - listitem: Available with GAF 1 or GAF 2 Package
    - paragraph: Basic protection for your roof
    - heading "Gold Pledge Warranty" [level=4]
    - text: Unavailable
    - paragraph: Premium GAF warranty with enhanced coverage
    - list:
      - listitem: 25-year workmanship coverage
      - listitem: Lifetime material warranty
      - listitem: Requires GAF Cobra Ventilation
      - listitem: Requires GAF 2 Package
    - paragraph: Superior protection for your investment
    - checkbox "Full W.W Peel & Stick System"
    - text: Full W.W Peel & Stick System
    - paragraph: Enhanced waterproofing protection
    - list:
      - listitem: Complete peel & stick underlayment system (1 roll / 1.5 sq)
      - listitem: Maximum protection against water infiltration
      - listitem: Adds $60/square to the estimate
    - heading "Select Materials" [level=3]
    - text: "Waste Factor:"
    - spinbutton "Waste Factor:": "10"
    - text: "% (Applies to all materials except GAF Timberline HDZ) GAF Timberline HDZ Waste Factor:"
    - button "12%"
    - button "15%"
    - button "20%"
    - text: "Current: 12%"
    - heading "Material Presets" [level=3]
    - button "GAF 1 - Basic Package":
      - img
      - text: GAF 1 - Basic Package
    - button "GAF 2 - Premium Package":
      - img
      - text: GAF 2 - Premium Package
    - button "OC 1 - Oakridge":
      - img
      - text: OC 1 - Oakridge
    - button "OC 2 - Duration":
      - img
      - text: OC 2 - Duration
    - paragraph: Click a preset to automatically add a pre-configured bundle of materials
    - heading "SHINGLES" [level=3]:
      - button "SHINGLES" [expanded]:
        - text: SHINGLES
        - img
    - region "SHINGLES":
      - text: Material Name
      - textbox "Material Name": GAF Timberline HDZ SG
      - text: Price
      - spinbutton "Price": "42.82"
      - text: per Bundle (≈ $128.46/sq)
      - paragraph: "Coverage: 3 Bundles/Square (33.3 sq ft per bundle)"
      - paragraph: "Logic: Steep Slope Area / 33.3 rounded up"
      - paragraph: "→ Current Calc: Steep Slope Area (0.0 sq ft) / 33.3 rounded up → 131 Bundles needed (43.7 squares)"
      - button "Selected":
        - img
        - text: Selected
      - text: Material Name
      - textbox "Material Name": GAF Seal-A-Ridge (25')
      - text: Price
      - spinbutton "Price": "70.56"
      - text: per Bundle
      - paragraph: "Coverage: 20 LF/Bundle"
      - paragraph: "Logic: (Ridge Length + Hip Length) * (1 + Waste%) / 20 rounded up"
      - paragraph: "→ Current Calc: (Ridge Length (0.0 ft) + Hip Length (0.0 ft) = 0.0 ft) / 20 rounded up → 18 Bundles needed"
      - button "Selected":
        - img
        - text: Selected
      - text: Material Name
      - textbox "Material Name": GAF ProStart Starter Shingle Strip (120')
      - text: Price
      - spinbutton "Price": "67.22"
      - text: per Bundle
      - paragraph: "Coverage: 110 LF/Bundle"
      - paragraph: "Logic: Eaves LF * (1 + Waste%) / 110 rounded up"
      - paragraph: "→ Current Calc: Eaves LF (0.0 ft) * (1 + Waste 10%)) / 110 rounded up → 4 Bundles needed"
      - button "Selected":
        - img
        - text: Selected
      - text: Material Name
      - textbox "Material Name": OC Oakridge
      - text: Price
      - spinbutton "Price": "38.33"
      - text: per Bundle (≈ $114.99/sq)
      - paragraph: "Coverage: 3 Bundles/Square (33.3 sq ft per bundle)"
      - paragraph: "Logic: Steep Slope Area / 33.3 rounded up"
      - paragraph: "→ Current Calc: Steep Slope Area (0.0 sq ft) / 33.3 rounded up → 0 Bundles needed"
      - button "Add":
        - img
        - text: Add
      - text: Material Name
      - textbox "Material Name": OC Hip & Ridge
      - text: Price
      - spinbutton "Price": "84.44"
      - text: per Bundle
      - paragraph: "Coverage: 25 LF/Bundle"
      - paragraph: "Logic: (Ridge Length + Hip Length) * (1 + Waste%) / 25 rounded up"
      - paragraph: "→ Current Calc: (Ridge Length (0.0 ft) + Hip Length (0.0 ft) = 0.0 ft) / 25 rounded up → 0 Bundles needed"
      - button "Add":
        - img
        - text: Add
      - text: Material Name
      - textbox "Material Name": OC Starter
      - text: Price
      - spinbutton "Price": "70.56"
      - text: per Bundle
      - paragraph: "Coverage: 120 LF/Bundle"
      - paragraph: "Logic: (Eave Length + Rake Length) * (1 + Waste%) / 120 rounded up"
      - paragraph: "→ Current Calc: (Eave Length (0.0 ft) + Rake Length (0.0 ft)) * (1 + Waste 10%)) / 120 rounded up → 0 Bundles needed"
      - button "Add":
        - img
        - text: Add
      - text: Material Name
      - textbox "Material Name": OC Duration
      - text: Price
      - spinbutton "Price": "41.3"
      - text: per Bundle (≈ $123.90/sq)
      - paragraph: "Coverage: 3 Bundles/Square (33.3 sq ft per bundle)"
      - paragraph: "Logic: Steep Slope Area / 33.3 rounded up"
      - paragraph: "→ Current Calc: Steep Slope Area (0.0 sq ft) / 33.3 rounded up → 0 Bundles needed"
      - button "Add":
        - img
        - text: Add
    - heading "UNDERLAYMENTS" [level=3]:
      - button "UNDERLAYMENTS":
        - text: UNDERLAYMENTS
        - img
    - heading "METAL" [level=3]:
      - button "METAL":
        - text: METAL
        - img
    - heading "VENTILATION" [level=3]:
      - button "VENTILATION":
        - text: VENTILATION
        - img
    - heading "ACCESSORIES" [level=3]:
      - button "ACCESSORIES":
        - text: ACCESSORIES
        - img
    - button "Back to Measurements":
      - img
      - text: Back to Measurements
    - button "Continue"
    - heading "Selected Materials" [level=3]
    - text: GAF Timberline HDZ SG
    - paragraph: 43.7 squares (131 bundles)
    - text: $128.46 per Square
    - paragraph: "– Calculation Details: Steep Slope Area (0.0 sq ft) / 33.3 rounded up → 131 Bundles needed (43.7 squares)"
    - button "Decrease quantity for GAF Timberline HDZ SG": "-"
    - spinbutton "Quantity in Squares for GAF Timberline HDZ SG": "43.7"
    - button "Increase quantity for GAF Timberline HDZ SG": +
    - button "Remove GAF Timberline HDZ SG":
      - img
    - text: GAF ProStart Starter Shingle Strip (120')
    - paragraph: "Quantity: 4 Bundles"
    - text: $67.22 per Bundle
    - paragraph: "– Calculation Details: Eaves LF (0.0 ft) * (1 + Waste 10%)) / 110 rounded up → 4 Bundles needed"
    - button "Decrease quantity for GAF ProStart Starter Shingle Strip (120')": "-"
    - spinbutton "Quantity for GAF ProStart Starter Shingle Strip (120')": "4"
    - button "Increase quantity for GAF ProStart Starter Shingle Strip (120')": +
    - button "Remove GAF ProStart Starter Shingle Strip (120')":
      - img
    - text: GAF Seal-A-Ridge (25')
    - paragraph: "Quantity: 18 Bundles"
    - text: $70.56 per Bundle
    - paragraph: "– Calculation Details: (Ridge Length (0.0 ft) + Hip Length (0.0 ft) = 0.0 ft) / 20 rounded up → 18 Bundles needed"
    - button "Decrease quantity for GAF Seal-A-Ridge (25')": "-"
    - spinbutton "Quantity for GAF Seal-A-Ridge (25')": "18"
    - button "Increase quantity for GAF Seal-A-Ridge (25')": +
    - button "Remove GAF Seal-A-Ridge (25')":
      - img
    - text: GAF WeatherWatch Ice & Water Shield
    - paragraph: "Quantity: 27 Rolls"
    - text: $101.11 per Roll (≈ $50.56/square)
    - paragraph: "– Calculation Details: Valley Length (0.0 ft) / 45.5 rounded up → 27 Rolls needed"
    - button "Decrease quantity for GAF WeatherWatch Ice & Water Shield": "-"
    - spinbutton "Quantity for GAF WeatherWatch Ice & Water Shield": "27"
    - button "Increase quantity for GAF WeatherWatch Ice & Water Shield": +
    - button "Remove GAF WeatherWatch Ice & Water Shield":
      - img
    - text: ABC Pro Guard 20 (Rhino)
    - paragraph: "Quantity: 9 Rolls"
    - text: $87.88 per Roll (≈ $19.53/square)
    - paragraph: "– Calculation Details: Steep Slope Area (0.0 sq ft) / 4.5 rounded up → 9 Rolls needed"
    - button "Decrease quantity for ABC Pro Guard 20 (Rhino)": "-"
    - spinbutton "Quantity for ABC Pro Guard 20 (Rhino)": "9"
    - button "Increase quantity for ABC Pro Guard 20 (Rhino)": +
    - button "Remove ABC Pro Guard 20 (Rhino)":
      - img
    - text: Master Builders MasterSeal NP1 Sealant (10.1 oz)
    - paragraph: "Quantity: 4 Eachs"
    - text: $11.76 per Each
    - paragraph: "– Calculation Details: Ceiling(Total Squares / 10) → 4 Eachs needed"
    - button "Decrease quantity for Master Builders MasterSeal NP1 Sealant (10.1 oz)": "-"
    - spinbutton "Quantity for Master Builders MasterSeal NP1 Sealant (10.1 oz)": "4"
    - button "Increase quantity for Master Builders MasterSeal NP1 Sealant (10.1 oz)": +
    - button "Remove Master Builders MasterSeal NP1 Sealant (10.1 oz)":
      - img
    - text: "Total: $10,716.31"
  - button "Back"
  - button "Continue"
- region "Notifications (F8)":
  - list:
    - status:
      - text: Measurements extracted Successfully parsed sample-eagleview.pdf with unknown sq ft of roof area.
      - button:
        - img
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Create New Estimate via PDF Upload', () => {
   4 |   test('should allow a user to create a new estimate by uploading an EagleView PDF', async ({ page }) => {
   5 |     // Step 1: Navigate to the application
   6 |     await page.goto('http://localhost:8081');
   7 |     await expect(page).toHaveTitle(/3MG Retail Estimator/);
   8 |
   9 |     // Step 2: Click the "New Estimate" link
  10 |     // It's a link, not a button. Using the correct role and .first() to be specific.
  11 |     await page.getByRole('link', { name: 'New Estimate' }).first().click();
  12 |     await expect(page).toHaveURL(/.*\/estimates/);
  13 |     await expect(page.getByRole('heading', { name: 'Create New Estimate' })).toBeVisible();
  14 |
  15 |     // Step 3: Upload the file
  16 |     // First, click the "Browse Files" button to open the file chooser
  17 |     const fileChooserPromise = page.waitForEvent('filechooser');
  18 |     await page.getByRole('button', { name: 'Browse Files' }).click();
  19 |     const fileChooser = await fileChooserPromise;
  20 |     
  21 |     // Set the input file using a relative path
  22 |     await fileChooser.setFiles('e2e/fixtures/sample-eagleview.pdf');
  23 |
  24 |     // Wait for the "PDF processed successfully" message to appear
  25 |     await expect(page.getByRole('heading', { name: 'PDF processed successfully' })).toBeVisible({ timeout: 15000 });
  26 |
  27 |     // Step 4: Click the "Save Measurements" button
  28 |     await page.getByRole('button', { name: 'Save Measurements' }).click();
  29 |
  30 |     // Wait for the success toast message
  31 |     // Targeting the text only within the "Notifications" region to be very specific.
  32 |     await expect(page.getByRole('region', { name: 'Notifications (F8)' })
  33 |       .getByText('Measurements have been saved to the database.')).toBeVisible();
  34 |
  35 |     // Step 5: Click the "Continue" button to go to the measurements tab
  36 |     await page.getByRole('button', { name: 'Continue' }).click();
  37 |     await expect(page.getByRole('tab', { name: 'Enter Measurements', selected: true })).toBeVisible();
  38 |     
  39 |     // Step 6: Click the "Continue" button to go to the materials tab
  40 |     await page.getByRole('button', { name: 'Continue' }).click();
  41 |     await expect(page.getByRole('tab', { name: 'Select Materials', selected: true })).toBeVisible();
  42 |
  43 |     // Add a final assertion to confirm we are on the materials tab
  44 |     await expect(page.getByRole('heading', { name: 'Select Pricing Template' })).toBeVisible();
  45 |
  46 |     // Step 7: Apply the "Master" pricing template
  47 |     await page.getByRole('button', { name: 'Apply Template' }).click();
  48 |     await expect(page.getByRole('region', { name: 'Notifications (F8)' }).getByText('Template Applied')).toBeVisible();
  49 |
  50 |     // Take a screenshot to debug the material list rendering
  51 |     await page.screenshot({ path: 'e2e/debug-screenshots/after-template-applied.png' });
  52 |
  53 |     // Add a wait to ensure the material list is ready after applying the template, with a longer timeout
  54 |     await expect(page.getByText('GAF Timberline HDZ SG')).toBeVisible({ timeout: 10000 });
  55 |
  56 |     // Step 8: Add the "GAF 1 - Basic Package"
  57 |     await page.getByRole('button', { name: 'GAF 1 - Basic Package' }).click();
  58 |     
  59 |     // Assert that the materials have been added to the "Selected Materials" list
  60 |     const selectedMaterialsCard = page.getByRole('heading', { name: 'Selected Materials' }).locator('..');
> 61 |     await expect(selectedMaterialsCard.getByText('GAF Timberline HDZ SG')).toBeVisible();
     |                                                                            ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  62 |     await expect(selectedMaterialsCard.getByText('GAF Seal-A-Ridge (25\')')).toBeVisible();
  63 |
  64 |     // Step 9: Continue to Labor & Profit
  65 |     await page.getByRole('button', { name: 'Continue' }).click();
  66 |     await expect(page.getByRole('tab', { name: 'Labor & Profit', selected: true })).toBeVisible();
  67 |
  68 |     // Step 10: Assert dumpster count and continue to Summary
  69 |     await expect(page.getByLabel('Number of Dumpsters')).toHaveValue('2');
  70 |     await page.getByRole('button', { name: 'Continue' }).click();
  71 |     await expect(page.getByRole('tab', { name: 'Summary', selected: true })).toBeVisible();
  72 |
  73 |     // Step 11: Verify the final estimate total is visible and formatted as currency
  74 |     const totalEstimateLocator = page.locator('td:has-text("Total Estimate") + td');
  75 |     await expect(totalEstimateLocator).toBeVisible();
  76 |     await expect(totalEstimateLocator).toContainText('$');
  77 |     await expect(totalEstimateLocator).not.toContainText('$0.00');
  78 |   });
  79 | }); 
```