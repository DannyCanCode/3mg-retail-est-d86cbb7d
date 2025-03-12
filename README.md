# 3MG Retail Estimator

A web application for parsing EagleView PDF reports and generating roofing estimates.

## Features

- PDF parsing using Supabase Edge Functions
- Measurement extraction from EagleView reports
- Estimate creation and management
- Material pricing calculation

## Technologies Used

- Vite
- TypeScript
- React
- Supabase (Backend as a Service)
- shadcn-ui
- Tailwind CSS

## Project Setup

Follow these steps to set up the project locally:

```sh
# Step 1: Clone the repository
git clone https://github.com/DannyCanCode/3mg-retail-est-d86cbb7d.git

# Step 2: Navigate to the project directory
cd 3mg-retail-est-d86cbb7d

# Step 3: Install the necessary dependencies
npm install

# Step 4: Create a .env file based on .env.example
cp .env.example .env
# Then edit the .env file with your Supabase credentials

# Step 5: Start the development server
npm run dev
```

## Supabase Configuration

This project uses Supabase for backend functionality. Key components include:

1. **Edge Function (parse-eagleview-pdf)**:
   - Located in `supabase/functions/parse-eagleview-pdf/`
   - Processes PDF files to extract measurements
   - Uses OpenAI API to interpret PDF content

2. **Database Tables**:
   - `measurements`: Stores extracted PDF measurements
   - `pricing_lists`: Stores material pricing information
   - `estimates`: Stores customer estimates

3. **Storage Buckets**:
   - `pdf-uploads`: Temporarily stores PDF files for processing

## Deployment

### Frontend Deployment (Netlify)

1. Connect your GitHub repository to Netlify
2. Set build command to `npm run build`
3. Set publish directory to `dist`
4. Add environment variables from your `.env` file

### Supabase Edge Function Deployment

Deploy the Edge Function to your Supabase project:

```sh
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the Edge Function
cd supabase/functions
supabase functions deploy parse-eagleview-pdf --project-ref YOUR_PROJECT_REF
```

Make sure to set the OPENAI_API_KEY in your Supabase project's environment variables.

## Development Workflow

1. Make changes to the codebase
2. Test locally using `npm run dev`
3. Commit and push changes to GitHub
4. Netlify will automatically deploy the updated frontend
5. Manually deploy Supabase Edge Functions when they change

## Troubleshooting

If you encounter issues with PDF parsing:

1. Check Supabase function logs in the Supabase dashboard
2. Verify that CORS is properly configured
3. Check that your OpenAI API key has sufficient credits
4. Ensure the PDF-uploads bucket has appropriate permissions

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
