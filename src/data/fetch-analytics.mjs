import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs/promises'; 
import 'dotenv/config';
import path from 'path'; 

const propertyId = '416205358';
const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64; //



export default async function fetchAnalyticsReport() {
   
if (!base64Credentials) {
  throw new Error('Missing Google Analytics credentials.');
}

// Decode credentials
const credentials = JSON.parse(Buffer.from(base64Credentials, 'base64').toString('utf-8'));

// Initialize the GA4 API Client
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials,
});
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
            dimensions: [{ name: "pagePath" }], // Track page visits
            metrics: [{ name: "screenPageViews" }], // Total views per page
        });

        // Format the data to remove unnecessary fields
        const formattedData = response.rows.map(row => ({
            pagePath: row.dimensionValues[0].value,  // Extract the page URL
            views: row.metricValues[0].value         // Extract the number of views
        }));

        // Convert to JSON and write to a file using relative path
        const jsonFilePath = path.join('src', 'lib', 'analytics-report.json');
        await fs.writeFile(jsonFilePath, JSON.stringify(formattedData, null, 2));

        console.log(`✅ Google Analytics Data saved to ${jsonFilePath}`);

    } catch (error) {
        console.error("❌ Error fetching data:", error);
    }
}

// Run the function
//fetchAnalyticsReport();
