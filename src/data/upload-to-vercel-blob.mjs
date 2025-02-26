import {put} from '@vercel/blob';
import fs from 'fs/promises';
import 'dotenv/config';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
export async function upLoadToVercelBlob(){
const svgFile = await fs.readFile('G:\\user\\Conor\\big_commerce\\function-modules\\utils\\category-tree-map.svg');
try{
const returnData = await put("catTreeMapSVG/category-tree-map.svg", svgFile,{token: BLOB_READ_WRITE_TOKEN, access: "public", addRandomSuffix: false});

console.log("✅ SVG file uploaded to Vercel Blob Storage: ", returnData);
}catch(error) {
console.error("❌ Error uploading SVG file to Vercel Blob Storage: ", error);}

}

