# Category Tree Map Generator

## Overview
This project generates a hierarchical tree map visualization of product category analytics data. It processes Google Analytics data, maps it to product categories, and creates an interactive SVG visualization that can be used as a React component.

## Features
- Fetches analytics data from Google Analytics API
- Processes search analytics data and assigns categories
- Generates a hierarchical tree map visualization
- Creates a React-compatible SVG component
- Uploads assets to Vercel Blob storage
- Supports dynamic data updates

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- Google Analytics API credentials
- Vercel account and Blob storage access
- Environment variables properly configured


📂 Project Structure

project-root/
src/
├── data/
│ ├── fetch-analytics.mjs # Fetches data from Google Analytics
│ ├── search-analytics-assign-cat.mjs # Processes and categorizes analytics data
│ ├── create-tree-graph.mjs # Generates tree map visualization
│ ├── svg-react-comp.mjs # Creates React component
│ └── upload-to-vercel-blob.mjs # Handles asset upload
├── lib/
│ ├── analytics-report.json # Raw analytics data
│ ├── analytics-with-categories.json # Processed data
│ ├── category-popularity.json # Category metrics
│ └── category-tree.json # Category hierarchy
└── index.mjs # Main entry point

🔧 Setup Instructions

1️⃣ Prerequisites

Node.js (v16+ recommended)

Google Analytics API Access

Google Cloud Credentials (Base64-encoded JSON key)

Vercel Blob Storage

2️⃣ Install Dependencies

npm install

3️⃣ Set Up Environment Variables

Create a .env file in the root directory:

GOOGLE_APPLICATION_CREDENTIALS_BASE64=your_base64_encoded_json
VERCEL_BLOB_TOKEN=your_vercel_blob_token





📊 Data Flow


This will:
1. Fetch latest analytics data
2. Process and categorize the data
3. Generate the tree map visualization
4. Create a React component
5. Upload assets to Vercel Blob

## Data Flow
1. `fetch-analytics.mjs` retrieves raw analytics data
2. `search-analytics-assign-cat.mjs` processes and categorizes the data
3. `create-tree-graph.mjs` generates the visualization
4. `svg-react-comp.mjs` creates a React component
5. `upload-to-vercel-blob.mjs` handles asset storage

## Output
- A React component for the tree map visualization
- JSON files with processed data in `src/lib/`
- Uploaded assets in Vercel Blob storage

## Dependencies
- @google-analytics/admin
- @google-analytics/data
- @svgr/core and related plugins
- @vercel/blob
- d3-node
- dotenv
- Other utilities (see package.json)

📦 Dependencies

{
"dotenv": "^16.4.7",
    "@google-analytics/admin": "^7.6.0",
    "@google-analytics/data": "^4.12.0",
    "canvas": "^2.11.2",
    "d3-node": "^4.0.1",
    "@vercel/blob": "^0.27.1",
    "@svgr/plugin-jsx": "^8.1.0",
    "@svgr/plugin-prettier": "^8.1.0",
    "@svgr/plugin-svgo": "^8.1.0"
  }




📸 Example Output

SVG Tree Map Preview: src\lib\category-tree-map.svg

React Component Usage: src\lib\CategoryTreeMap.jsx



🔥 Troubleshooting

403 Permission Denied? Ensure API key has read access.

Environment Variables Not Loading? Run node -r dotenv/config src/index.mjs.

SVG Not Displaying in Browser? Ensure viewBox and width/height are set.

🔒 Security Considerations

Never commit .env files.

Restrict API key usage to only required services.

Use HTTPS & Vercel for secure storage.

🚀 Future Enhancements

Add a UI dashboard for viewing analytics reports.

Enable email notifications when new data is available.

Integrate AI for anomaly detection in analytics trends.

📜 License

This project is licensed under the MIT License.

🙌 Credits

Google Analytics API for data

**D3node **for tree map visualization

Vercel Blob Storage for storing images