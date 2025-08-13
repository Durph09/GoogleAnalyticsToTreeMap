import fs from "fs/promises";

// Load JSON files asynchronously
const loadJSON = async (filePath) =>
  JSON.parse(await fs.readFile(filePath, "utf8"));

export default async function processAnalytics() {
  try {
    // Load all JSON files in parallel
    const [analyticsData, categoryTreeData, allProdsData] = await Promise.all([
      loadJSON(
       "src/lib/analytics-report.json"
      ),
      loadJSON(
        "src/lib/category-tree.json"
      ),
      loadJSON(
       "src/lib/all_prods_20250204.json"
      ),
    ]);

    console.log("✅ All JSON files loaded successfully!");

    // Convert category tree to a flat lookup table
    const flatCategoryMap = new Map();
    const idToCategoryMap = new Map();

    // Flattens category tree into a Map for quick lookup
    // @returns {void}
    function flattenCategories(categories, parentPath = []) {
      for (const category of categories) {
        if (category.url) {
          flatCategoryMap.set(category.url, {
            id: category.id,
            parent_id: category.parent_id,
            path: [...parentPath, category.id], // Store full category path
          });
        }

        // Add reverse lookup by category ID
        idToCategoryMap.set(category.id, {
          url: category.url,
          parent_id: category.parent_id,
          path: [...parentPath, category.id],
        });

        if (category.children?.length) {
          flattenCategories(category.children, [...parentPath, category.id]);
        }
      }
    }

    // Flatten category tree
    flattenCategories(categoryTreeData.data);
    console.log("Category tree flattened Successfully");
    // [/categoryURL/:{id: 561, parent_id: 100, path:[highestLevelCatID, lowestst level]}]
    //Step 1: iterate over analyticsData and match from flattenCategories.
    const analyticsWithCategories = analyticsData.map((entry) => {
      if (flatCategoryMap.get(entry.pagePath)) {
        return {
          ...entry,
          categoryID: flatCategoryMap.get(entry.pagePath).id,
          categoryPath: flatCategoryMap.get(entry.pagePath).path,
          categoryURL: entry.pagePath,
        };
      } else if (allProdsData.data.find((p) => p.url === entry.pagePath)) {
        const catID = allProdsData.data.find((p) => p.url === entry.pagePath)
          .categories[0];
        if (idToCategoryMap.get(catID)) {
          return {
            ...entry,
            categoryID: catID,
            catetoryPath: idToCategoryMap.get(catID).path,
            categoryURL: idToCategoryMap.get(catID).url,
          };
        }
      } else {
        return {
          ...entry,
          categoryID: null,
          categoryPath: null,
          categoryURL: null,
        };
      }
    });

    console.log("analyticsWithCategoires matched and mapped");
    // write analyticsWithCategories to a file
    await fs.writeFile(
      "src/lib/analytics-with-categories.json",
      JSON.stringify(analyticsWithCategories, null, 2)
    );
    console.log("analyticsWithCategories written to file");
    const analyticsWithCategoriesFiltered = analyticsWithCategories.filter(
      (item) => item !== null && item !== undefined
    );
    //Step 2: add views to all categories in pagePath to categoryTreedata
    for (const entry of analyticsWithCategoriesFiltered) {
      //map of entry.categoryPath and entry.views to each
      let categoryPathLevel = categoryTreeData.data[0];
      //console.log("current entry: ", entry);
      if (entry.categoryPath && entry.categoryPath.length > 0) {
        // console.log(
        //   "entry.categoryPath > 0: ",
        //   entry.categoryPath,
        //   " entry.categoryPath !== null: "
        // );
        for (let i = 1; i < entry.categoryPath.length; i++) {
          const categoryIndex = categoryPathLevel.children.findIndex(
            (child) => child.id === entry.categoryPath[i]
          );
          if (categoryIndex === -1) {
            console.warn(
              `Category ID ${entry.categoryPath[i]} not found in category tree`
            );
          }

          categoryPathLevel = categoryPathLevel.children[categoryIndex];
          categoryPathLevel.views
            ? (categoryPathLevel.views += Number(entry.views))
            : (categoryPathLevel.views = Number(entry.views));
        }
      }
    };
    
    //add views to products category
    const totalViewsOfDirectChildren = categoryTreeData.data[0].children.reduce(
        (total, category) => total + (category.views || 0),
        0
      );
      categoryTreeData.data[0].views = totalViewsOfDirectChildren

    console.log("added views to categoryTreeData");
    // Step 3: Save the processed data to a JSON file
    await fs.writeFile(
      "src/lib/category-popularity.json",
      JSON.stringify(categoryTreeData, null, 2)
    );

    console.log(
      "✅ Category popularity data saved as category-popularity.json"
    );
  } catch (error) {
    console.log("error", error);
  }
}
// Run the function
//processAnalytics();
