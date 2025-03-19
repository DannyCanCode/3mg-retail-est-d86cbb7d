# 3MG Retail Estimator

A web application for processing roof measurement PDFs and generating estimates.

## Features

- PDF upload and processing
- Automatic measurement extraction including area by pitch data
- Save measurements to Supabase database
- Create and manage roofing estimates
- Intelligent material calculation with special rules for GAF Timberline HDZ
- Support for multiple roof pitches and accurate waste factor calculation

## Current Progress

We've successfully implemented several key features:

- ✅ PDF upload and processing for EagleView reports
- ✅ Automatic extraction of roof measurements including areas by pitch
- ✅ Special waste factor handling for GAF Timberline HDZ (minimum 12%)
- ✅ Display of square counts alongside bundle quantities
- ✅ Comprehensive material library with accurate pricing and coverage rules
- ✅ Fixed the "Start Fresh" and "Upload Another" functionality

## Upcoming Features

We're currently working on:

- **GAF Package Options** - Implementation of GAF 1 (basic) and GAF 2 (premium) packages
- **Warranty Options** - Support for Silver Pledge and Gold Pledge warranty selections
- **Low Slope Handling** - Special pricing and ISO requirements for 2/12 pitch areas
- **Enhanced UI** - Improvements to the measurement display and material selection interface

See the [Milestones document](./README-MILESTONES.md) for a detailed roadmap.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (storage, edge functions, database)
- PDF.js for PDF processing

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/DannyCanCode/3mg-retail-est-d86cbb7d.git
   cd 3mg-retail-est-d86cbb7d
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Environment setup:
   - Copy `.env` file and update with your Supabase credentials
   - Ensure the `pdf-uploads` bucket exists in your Supabase project

4. Deploy Supabase Edge Function:
   ```
   cd supabase/functions/process-pdf
   supabase functions deploy process-pdf
   ```

5. Run the application:
   ```
   npm run dev
   ```

### Supabase Configuration

The application requires the following Supabase resources:

1. Storage bucket named `pdf-uploads` with public access
2. Edge function named `process-pdf` for PDF processing
3. Database tables:
   - `measurements` - stores extracted roof measurements
   - `estimates` - stores estimates created from measurements
   - `estimate_items` - stores line items for estimates
   - `pricing` - stores pricing data
   - `pricing_lists` - stores pricing list data

## Usage

1. Upload an EagleView PDF file
2. The system will process the PDF and extract measurements including areas by pitch
3. View the extracted measurements
4. Create an estimate based on the measurements
5. Add pricing and materials to the estimate
6. Generate the final estimate

## Key Workflows

### PDF Processing and Measurement Extraction

1. Upload an EagleView PDF
2. System parses and extracts all measurements
3. Measurements are displayed with special handling for pitch areas
4. Create estimate based on measurements

### Material Selection and Pricing

1. Select materials from comprehensive library
2. System calculates quantities based on measurements and coverage rules
3. Special handling applied for GAF Timberline HDZ and low slope areas
4. Total cost calculated with appropriate waste factors

## Troubleshooting

- **PDF Upload Issues**: Check Supabase storage bucket permissions
- **Processing Errors**: Verify Edge Function deployment and logs
- **Database Issues**: Check database structure matches the required schema
- **Material Calculation Issues**: Verify the special rules in the utils.ts file

## License

MIT

## Project info

**URL**: https://lovable.dev/projects/9dfb42fe-c594-42dd-83cb-bf701ca56a8f

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
