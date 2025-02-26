import fs from "fs";
import { createCanvas, loadImage } from "canvas";
import {D3Node }from "d3-node";

export async function createTreeMap() {
    // Load category data
    const categoryTreeData = await JSON.parse(
        fs.readFileSync("src/lib/category-popularity.json", "utf8")
    );

    // Extract the root node and filter categories
    const rootCategory = categoryTreeData.data[0];

    function filterCategories(category) {
        if (!category.views || category.views === 0) return null;
        const filteredChildren = category.children
            .map(filterCategories)
            .filter(child => child !== null);
        return { ...category, children: filteredChildren };
    }

    const filteredRootCategory = filterCategories(rootCategory);

    // Set up dimensions
    const width = 1000;
    const height = 1000;

    // Initialize D3Node with canvas
    const d3n = new D3Node({ canvasModule: createCanvas });
    const d3 = d3n.d3;

    // Create SVG container
    const svg = d3n.createSVG(width, height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", width)
        .attr("height", height)
        .attr("style", "max-width: 100%; height: auto; font: 14px sans-serif; background-color: white;")
        .call(d3.zoom().scaleExtent([0.5, 5]).on("zoom", function (event) {
            g.attr("transform", event.transform);
        })); // Zoomable

    // Append a white rectangle as the background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "white");

    // Create a group for zooming
    const g = svg.append("g");

    // Specify a color scale with 35 distinct colors
    const extendedColorScheme = d3.schemeTableau10
        .concat(d3.schemeSet3)
        .concat(d3.schemePaired)
        .slice(0, 35);

    const color = d3.scaleOrdinal(
        filteredRootCategory.children?.map(d => d.name),
        extendedColorScheme
    );

    // Compute the treemap layout
    const root = d3.treemap()
        .tile(d3.treemapResquarify)
        .size([width, height])
        .padding(1)
        .paddingInner(5)
        .round(true)(
            d3.hierarchy(filteredRootCategory)
                .sum(d => d.views)
                .sort((a, b) => b.value - a.value)
        );

    // Add a cell for each leaf of the hierarchy
    const leaf = g.selectAll("g")
        .data(root.descendants().filter(d => d.depth > 0))
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Append a tooltip
    const format = d3.format(",d");
    leaf.append("title")
        .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("->")}\n${format(d.value)}`);

    // Append a color rectangle
    leaf.append("rect")
        .attr("fill", d => {
            while (d.depth > 1) d = d.parent;
            return color(d.data.name);
        })
        .attr("fill-opacity", 0.6)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    // Log dimensions of each leaf
    root.leaves().forEach(d => {
        console.log(`📏 Category: ${d.data.name}, Width: ${d.x1 - d.x0}, Height: ${d.y1 - d.y0}`);
    });

    // Append text labels inside rectangles
    leaf.append("text")
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", d => {
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            const textLength = d.data.name.length;
            return `${Math.max(8, Math.min(width / textLength, 14))}px`;
        })
        .attr("fill-opacity", 0.7)
        .text(d => {
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            return (width > 50 && height > 20) ? `${d.data.name} (${d.value})` : "";
        });

    // Convert SVG to PNG using canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const svgString = d3n.svgString();
    const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`);
    ctx.drawImage(img, 0, 0);

    // Save SVG
    fs.writeFileSync("src/lib/category-tree-map.svg", svgString);

    // Save as PNG
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("src/lib/category-tree-map.png", buffer);

    console.log("✅ Tree map saved as category-tree-map.png");
}

//createTreeMap();
