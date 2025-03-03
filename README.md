# 3MG Retail Estimation Tool

A web application for parsing and analyzing roof measurement PDFs to generate accurate retail estimates.

## Features

- **PDF Parsing**: Uses pdfjs-serverless via Supabase Edge Functions to extract measurements from PDF reports
- **EagleView PDF Support**: Specialized parsing for EagleView PDF reports
- **Pricing Lists**: Create and manage pricing lists for different materials and services
- **Measurement Storage**: Save parsed measurements to a database for future reference
- **User Authentication**: Secure access to the application with Supabase Auth

## Architecture

- **Frontend**: React with TypeScript, Vite, and Shadcn UI components
- **Backend**: Supabase for authentication, database, storage, and serverless functions
- **PDF Processing**: Uses pdfjs-serverless for direct text extraction from PDF files

## Supabase Components

- **Edge Functions**:
  - `parse-pdf`: Extracts measurements from standard PDF reports
  - `parse-eagleview-pdf`: Specialized function for EagleView reports
  - `create-pricing-lists`: Creates and manages pricing lists
  - `save-measurement`: Saves parsed measurements to the database

- **Database Tables**:
  - `measurements`: Stores parsed roof measurements
  - `pricing_lists`: Stores pricing information for materials and services

- **Storage Buckets**:
  - `pdfs`: Stores uploaded PDF files with appropriate access policies

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Deployment

The application is deployed on Netlify and connected to the GitHub repository.
