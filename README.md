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
