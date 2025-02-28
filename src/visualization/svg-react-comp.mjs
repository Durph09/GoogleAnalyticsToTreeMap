import { transform } from '@svgr/core';
import fs from 'fs/promises';
import path from 'path';

const svgFilePath = path.join(
  'src/lib/category-tree-map.svg'
);
const outputFilePath = path.join(
  'src/lib/CategoryTreeMap.jsx'
);

export default async function generateComponent() {
  try {
    // Read SVG file content
    const svgCode = await fs.readFile(svgFilePath, 'utf8');

    // Transform SVG to React component
    const jsCode = await transform(
      svgCode,
      {
        plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx', '@svgr/plugin-prettier'],
        jsxRuntime: 'automatic', // Uses React 17+ JSX transform
      
        replaceAttrValues: { '#000': 'currentColor' }, // Optional: makes fill colors dynamic
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: {
              overrides: {
              removeTitle: false,
              }}
             
            },
          ],
        },
      },
      { componentName: 'CategoryTreeMap' }
    );

    // Save the component to a file
    await fs.writeFile(outputFilePath, jsCode);

    console.log(`✅ SVG transformed into a React component: ${outputFilePath}`);
  } catch (error) {
    console.error('❌ Error transforming SVG:', error);
  }
}

//generateComponent();
