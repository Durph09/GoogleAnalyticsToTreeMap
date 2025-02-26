import fetchAnalyticsReport from "./data/fetch-analytics.mjs";
import processAnalytics from "./data/search-analytics-assign-cat.mjs";
import { createTreeMap } from "./visualization/create-tree-graph.mjs";
import generateComponent from "./visualization/svg-react-comp.mjs";
import {upLoadToVercelBlob} from "./data/upload-to-vercel-blob.mjs";

async function createTreeMapMaster(){
await fetchAnalyticsReport();
await processAnalytics();
await createTreeMap();

//upload to vercel blob
await upLoadToVercelBlob();

// create react component
await generateComponent();
console.log("✅ Tree map master function completed");
};

createTreeMapMaster();