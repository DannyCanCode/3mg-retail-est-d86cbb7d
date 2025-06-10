# 3MG Retail Roofing Estimator

A modern roofing estimation tool for 3MG Retail Roofing.

## Features

### Dashboard
- Overview of estimate counts and statuses
- Quick access to recent estimates
- EagleView PDF uploader for measurements extraction

### Estimates
- Create detailed roofing estimates with material selections
- Select from GAF or other manufacturer packages
- Configure labor rates and profit margins
- View and manage all estimate statuses (Draft, Pending, Approved, Rejected)

### Measurements
- View all properties with extracted measurements from EagleView reports
- Detailed breakdown of roof areas by pitch
- Comprehensive roof measurements including ridges, hips, valleys, eaves, and rakes
- Create new estimates directly from measurement data
- Export measurement data for offline use or sharing

### Pricing Templates
- Create and manage pricing templates with default material selections
- Customize labor rates, profit margins, and permit fees
- Duplicate templates to create variations for different project types
- Apply templates during estimate creation for faster workflow

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

The application connects to a Supabase backend for data storage. Configure your environment variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

## Workflow

1. Upload an EagleView PDF to extract measurements
2. Review the measurements in the Measurements tab
3. Create a new estimate from the measurements
4. Select materials and configure pricing
5. Save the estimate and share with the customer

## Technologies

- React + TypeScript
- Vite for development and building
- Shadcn UI components
- Supabase for backend storage
- PDF.js for PDF parsing

## License

[MIT](LICENSE)

## Project info


## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9dfb42fe-c594-42dd-83cb-bf701ca56a8f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

---

## Project Roadmap (as of 6/10/2025)

This section outlines the strategic initiatives for the 3MG Estimating Tool, based on business goals and recent development analysis. Our primary goal is to prepare the tool for a company-wide rollout by July.

### 📍 Initiative 1: Core Logic & Foundational Fixes (Immediate Priority)

These are critical issues that must be addressed to ensure the accuracy and reliability of the platform.

- **[ ] Change Profit Calculation from Markup to Margin:**
  - **Task:** Update the core profit calculation formula.
  - **Context:** This is a fundamental business logic change requested by the GM.
  - **Action:** Identify the current formula and change it to the correct margin formula.

- **[ ] Fix Flat Roof Labor & Waste Calculations:**
  - **Task:** Correct the labor and material waste calculations specifically for low-slope/flat roof areas.
  - **Context:** Essential for generating accurate material orders from "sold" estimates.

- **[ ] Resolve Preset Bundle Application Bug:**
  - **Task:** Debug the state management issue in the `MaterialsSelectionTab` component.
  - **Context:** Our E2E test has confirmed that applying a material preset does not correctly update the UI. This is a critical bug.
  - **Action:** Fix the state flow between `Estimates.tsx` and `MaterialsSelectionTab.tsx`.

### 📱 Initiative 2: Mobile-First Responsive UI (High Priority)

To support reps in the field, the application must be fully functional and easy to use on mobile phones and tablets.

- **[ ] Comprehensive UI Audit & Refactoring:**
  - **Task:** Systematically review every view and component, ensuring it is responsive and usable on small screens.
  - **Priority Areas:**
    - The 5-step estimate workflow (tabs may become a stepper or dropdown on mobile).
    - Data tables (columns should stack vertically).
    - All forms and buttons must be easily tappable.

### ✨ Initiative 3: Future Feature Development

These are longer-term goals to be addressed after the initial rollout.

- **[ ] Customer-Facing PDF Proposal Generation:**
  - **Task:** Create a feature to generate a "blue chip / white glove" PDF of the final estimate.
  - **Context:** A key request from the marketing team to enhance the customer experience.

- **[ ] Customer & Estimate Management (CRM-Lite):**
  - **Task:** Allow associating estimates with specific customers.

- **[ ] Expand Sub-Trade Support:**
  - **Task:** Add features for Stucco, siding, painting, solar D&R, screen replacements estimates.

- **[ ] Tile & Metal Roofing Functionality:**
  - **Task:** Add support for different roofing material types, we have shingle now we need metal/tile. 
  
- **[ ] API Integrations:**
  - **Task:** Plan for future integrations with AccuLynx, ServiceTitan, and measurement report providers.

### 🧪 Initiative 4: Solidify Testing Framework

A robust testing suite is non-negotiable for an enterprise platform. It ensures we can add features without breaking existing functionality.

- **[ ] Complete and Fix the "Golden Path" E2E Test:**
  - **Task:** Once the preset bundle bug is fixed, get the `create-estimate.spec.ts` test to pass reliably.
  - **Context:** This test validates the entire core user journey.
  
- **[ ] Add Unit Tests for Core Calculations:**
  - **Task:** Implement unit tests for functions like `calculateMaterialQuantity` and `calculateFinalCosts`.
  - **Context:** These tests are fast and ensure our core business logic is always mathematically correct.
