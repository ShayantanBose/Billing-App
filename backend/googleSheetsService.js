const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Google Sheets API configuration
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

let auth = null;
let sheets = null;

// Default sheet name - can be configured
const DEFAULT_SHEET_NAME = "Receipts";

// Add Google Drive and Docs API authentication
let drive = null;
let docs = null;

// Initialize Google Sheets API
async function initializeGoogleSheets() {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log(
        "Google Sheets credentials not found. Please add credentials.json file."
      );
      return false;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } =
      credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have previously stored token
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
    } else {
      console.log(
        "Google Sheets token not found. Please run the authentication setup."
      );
      return false;
    }

    auth = oAuth2Client;
    sheets = google.sheets({ version: "v4", auth });
    return true;
  } catch (error) {
    console.error("Error initializing Google Sheets:", error);
    return false;
  }
}

// Initialize Google Drive and Docs API
async function initializeGoogleDriveAndDocs() {
  try {
    if (!auth) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return false;
    }
    if (!drive) drive = google.drive({ version: "v3", auth });
    if (!docs) docs = google.docs({ version: "v1", auth });
    return { drive, docs };
  } catch (error) {
    console.error("Error initializing Google Drive/Docs:", error);
    return null;
  }
}

// Remove all inline images (and trailing whitespace) from a Google Doc
async function clearDocImages(documentId) {
  try {
    if (!documentId) {
      throw new Error("Missing Google Doc ID (GDOC_ID).");
    }

    const services = await initializeGoogleDriveAndDocs();
    if (!services || !services.docs) {
      throw new Error("Failed to initialize Google Docs API.");
    }

    const { docs } = services;
    const doc = await docs.documents.get({ documentId });
    const content = doc?.data?.body?.content || [];

    const rangesToDelete = [];

    content.forEach((struct) => {
      const elements = struct?.paragraph?.elements || [];
      elements.forEach((element, idx) => {
        if (
          element.inlineObjectElement &&
          element.startIndex !== undefined &&
          element.endIndex !== undefined
        ) {
          let startIndex = element.startIndex;
          let endIndex = element.endIndex;

          const nextEl = elements[idx + 1];
          if (
            nextEl &&
            nextEl.textRun &&
            typeof nextEl.startIndex === "number" &&
            typeof nextEl.endIndex === "number"
          ) {
            const content = nextEl.textRun.content || "";
            if (content.trim() === "") {
              const sliceIndex = content.lastIndexOf("\n");
              if (sliceIndex > -1) {
                endIndex = nextEl.startIndex + sliceIndex;
              } else {
                endIndex = nextEl.startIndex;
              }
            }
          }

          if (endIndex <= startIndex) {
            endIndex = startIndex + 1;
          }

          rangesToDelete.push({ startIndex, endIndex });
        }
      });
    });

    if (!rangesToDelete.length) {
      return { removed: 0 };
    }

    // Delete from bottom to top to avoid index shift
    rangesToDelete.sort((a, b) => b.startIndex - a.startIndex);

    const requests = rangesToDelete.map((range) => ({
      deleteContentRange: { range },
    }));

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    return { removed: rangesToDelete.length };
  } catch (error) {
    console.error("Error clearing images from Google Doc:", error);
    throw error;
  }
}

// Get the first sheet name from a spreadsheet, or create "Receipts" sheet if none exists
async function getSheetName(spreadsheetId) {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return DEFAULT_SHEET_NAME;
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetList = spreadsheet.data.sheets || [];

    if (sheetList.length === 0) {
      console.warn(
        "No sheets found in spreadsheet. Using default name:",
        DEFAULT_SHEET_NAME
      );
      return DEFAULT_SHEET_NAME;
    }

    // Check if "Receipts" sheet exists
    const receiptsSheet = sheetList.find(
      (sheet) => sheet.properties?.title === DEFAULT_SHEET_NAME
    );

    if (receiptsSheet) {
      return DEFAULT_SHEET_NAME;
    }

    // Use the first sheet's name
    const firstSheetName = sheetList[0].properties?.title || DEFAULT_SHEET_NAME;
    console.log(`Using sheet name: "${firstSheetName}"`);
    return firstSheetName;
  } catch (error) {
    console.error("Error getting sheet name:", error);
    return DEFAULT_SHEET_NAME;
  }
}

// Insert rows at a specific position without deleting existing data
// Also copies totals row content after insertion (row 19→29, row 29→39, or row 39→59)
async function insertRowsAtPosition(
  spreadsheetId,
  sheetName,
  startRow,
  numberOfRows
) {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return false;
    }

    // Get the sheet ID (not the spreadsheet ID)
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetMetadata.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Determine which row to read based on startRow
    // If inserting at row 16: read row 19 (totals before first expansion)
    // If inserting at row 26: read row 29 (totals after first expansion)
    // If inserting at row 36: read row 39 (totals after second expansion)
    let sourceRow;
    if (startRow === 16) {
      sourceRow = 19;
    } else if (startRow === 26) {
      sourceRow = 29;
    } else if (startRow === 36) {
      sourceRow = 39;
    } else {
      sourceRow = 19; // fallback
    }

    // Step 1: Read the content from the source row BEFORE insertion
    console.log(`Reading row ${sourceRow} content before insertion...`);
    const sourceData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A${sourceRow}:J${sourceRow}`,
    });
    const sourceValues = sourceData.data.values?.[0] || [];
    console.log(`Row ${sourceRow} content saved:`, sourceValues);

    // Step 2: Insert rows using batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: startRow - 1, // 0-indexed, so row 16 = index 15
                endIndex: startRow - 1 + numberOfRows, // Insert rows
              },
              inheritFromBefore: false, // Don't inherit formatting from row above
            },
          },
        ],
      },
    });

    console.log(`Inserted ${numberOfRows} rows at position ${startRow}`);

    // Step 3: Copy the saved content to the target row (source row + numberOfRows)
    if (sourceValues.length > 0) {
      const targetRow = sourceRow + numberOfRows; // Row 29 or 39 depending on expansion
      console.log(`Copying row ${sourceRow} content to row ${targetRow}...`);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${targetRow}:J${targetRow}`,
        valueInputOption: "RAW",
        resource: { values: [sourceValues] },
      });

      console.log(`Successfully copied content to row ${targetRow}`);
    }

    return true;
  } catch (error) {
    console.error("Error inserting rows:", error);
    return false;
  }
}

// Create a new Google Sheet
async function createSheet(title = "Receipts Database") {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return null;
    }
    const resource = {
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: "Receipts",
            gridProperties: {
              rowCount: 1000,
              columnCount: 16, // A-P
            },
          },
        },
      ],
    };
    const response = await sheets.spreadsheets.create({
      resource,
      fields: "spreadsheetId",
    });
    const spreadsheetId = response.data.spreadsheetId;
    console.log(`Created Google Sheet with ID: ${spreadsheetId}`);
    // Set up headers
    await updateHeaders(spreadsheetId);
    return spreadsheetId;
  } catch (error) {
    console.error("Error creating Google Sheet:", error);
    return null;
  }
}

// Update headers in the sheet
async function updateHeaders(spreadsheetId) {
  try {
    // 18 columns: A to R
    const mainHeaders = [
      "Sl. No.", // A
      "Date", // B
      "Station",
      "", // C, D (From, To)
      "Mode of Travel", // E
      "Purpose and other particulars", // F
      "Travel Expenses (Rs)", // G
      "Food",
      "",
      "",
      "",
      "",
      "", // H-M (S1-S6)
      "Miscellaneous (Rs)", // N
      "Total Amount (Rs)", // O
      "Bill Details (Yes/ No)", // P
      "Remarks", // Q
      "Budget head", // R
    ];
    const subHeaders = [
      "", // Sl. No.
      "", // Date
      "From",
      "To", // Station
      "", // Mode of Travel
      "", // Purpose
      "", // Travel Expenses
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6", // Food
      "", // Miscellaneous
      "", // Total Amount
      "", // Bill Details
      "", // Remarks
      "", // Budget head
    ];
    // Ensure both arrays have 18 elements
    if (mainHeaders.length !== 18 || subHeaders.length !== 18) {
      throw new Error(
        `Header length mismatch: mainHeaders=${mainHeaders.length}, subHeaders=${subHeaders.length}`
      );
    }
    console.log("Writing new headers to Receipts!A1:R2...");
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Receipts!A1:R2",
      valueInputOption: "RAW",
      resource: { values: [mainHeaders, subHeaders] },
    });
    console.log("Headers written successfully!");
  } catch (error) {
    console.error("Error updating headers:", error);
  }
}

// Append data to Google Sheet starting from row 11
async function appendToSheet(spreadsheetId, data) {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return false;
    }

    // Get the actual sheet name
    // Get the actual sheet name
    const sheetName = await getSheetName(spreadsheetId);

    // Find the first empty row in the range 11-60 (expanded to handle three expansions)
    // Auto-expansion:
    // 1. When row 15 is filled (next write would be row 16), 10 new rows are inserted at row 16
    // 2. When row 25 is filled (next write would be row 26), 10 new rows are inserted at row 26
    // 3. When row 35 is filled (next write would be row 36), 20 new rows are inserted at row 36
    // This pushes existing data (like totals) down without erasing it
    let targetRow = 11;
    let slNo = 1;
    let hasExpandedAt16 = false;
    let hasExpandedAt26 = false;
    let hasExpandedAt36 = false;

    // Check each row from 11 to 60 to find the first empty one
    for (let row = 11; row <= 60; row++) {
      const checkResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A${row}`,
      });

      const cellValue = checkResp.data.values?.[0]?.[0];

      if (!cellValue || cellValue === "") {
        // Found empty row
        targetRow = row;
        slNo = row - 10; // Sl. No. = 1 for row 11, 2 for row 12, etc.

        // First expansion: If we're about to write to row 16 (meaning row 15 is filled), insert 10 new rows
        if (targetRow === 16 && !hasExpandedAt16) {
          console.log(
            "Row 15 is filled. Inserting 10 new rows at position 16..."
          );
          await insertRowsAtPosition(spreadsheetId, sheetName, 16, 10);
          hasExpandedAt16 = true;
          console.log(
            "Successfully inserted 10 rows at position 16. Data below has been pushed down."
          );
        }

        // Second expansion: If we're about to write to row 26 (meaning row 25 is filled), insert 10 new rows
        if (targetRow === 26 && !hasExpandedAt26) {
          console.log(
            "Row 25 is filled. Inserting 10 new rows at position 26..."
          );
          await insertRowsAtPosition(spreadsheetId, sheetName, 26, 10);
          hasExpandedAt26 = true;
          console.log(
            "Successfully inserted 10 rows at position 26. Data below has been pushed down."
          );
        }

        // Third expansion: If we're about to write to row 36 (meaning row 35 is filled), insert 20 new rows
        if (targetRow === 36 && !hasExpandedAt36) {
          console.log(
            "Row 35 is filled. Inserting 20 new rows at position 36..."
          );
          await insertRowsAtPosition(spreadsheetId, sheetName, 36, 20);
          hasExpandedAt36 = true;
          console.log(
            "Successfully inserted 20 rows at position 36. Data below has been pushed down."
          );
        }

        break;
      }

      if (row === 60) {
        throw new Error(
          "Data range is full (rows 11-60). Please clear data before adding more entries."
        );
      }
    }

    console.log(`Writing to row ${targetRow} with Sl. No. ${slNo}`);

    // Prepare row according to your specified mapping:
    // A11: Sl. No.
    // B11: Date
    // C11: Station (From)
    // D11: Station (To)
    // E11: Mode of Travel
    // F11: Purpose and other particulars
    // G11: Travel Expense
    // H11: Lodging Expense
    // I11: Food
    // J11: Total Amount
    const row = Array(10).fill("");
    row[0] = slNo; // A: Sl. No.
    row[1] = data.date || ""; // B: Date
    row[2] = data.from || ""; // C: Station (From)
    row[3] = data.to || ""; // D: Station (To)
    row[4] = data.modeOfTravel || ""; // E: Mode of Travel
    row[5] = data.purpose || ""; // F: Purpose and other particulars
    row[6] = data.travelExpenses || ""; // G: Travel Expense
    row[7] = data.lodgingExpenses || ""; // H: Lodging Expense
    // I: Food - combine S1-S6
    const foodArr = [
      data.foodS1,
      data.foodS2,
      data.foodS3,
      data.foodS4,
      data.foodS5,
      data.foodS6,
    ].filter(Boolean);
    row[8] = foodArr.join(", "); // I: Food
    row[9] = data.amount || ""; // J: Total Amount

    const values = [row];

    // Use update to write to the exact row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${targetRow}:J${targetRow}`,
      valueInputOption: "RAW",
      resource: { values },
    });

    console.log(
      `Data written to Google Sheet "${sheetName}" at row ${targetRow}`
    );

    // Update totals in row 19 for columns G, H, I, J
    await updateTotals(spreadsheetId);
    return true;
  } catch (error) {
    console.error("Error appending to Google Sheet:", error);
    return false;
  }
}

// Update totals in row 19, 29, or 39 depending on expansion state
async function updateTotals(spreadsheetId) {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return false;
    }

    // Get the actual sheet name
    const sheetName = await getSheetName(spreadsheetId);

    // Find the last filled row in the data range (expanded to 60 to match appendToSheet)
    let lastDataRow = 11;
    for (let row = 11; row <= 60; row++) {
      const checkResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A${row}`,
      });
      const cellValue = checkResp.data.values?.[0]?.[0];
      if (cellValue && cellValue !== "") {
        lastDataRow = row;
      } else {
        break; // Stop at first empty row
      }
    }

    console.log(`Calculating totals from rows 11 to ${lastDataRow}`);

    // Read data from rows 11 to lastDataRow for columns G, H, I, J
    const dataResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!G11:J${lastDataRow}`,
    });

    const values = dataResp.data.values || [];

    // Calculate totals for each column
    let totalG = 0; // Travel Expense
    let totalH = 0; // Lodging Expense
    let totalI = 0; // Food (will try to parse if numeric)
    let totalJ = 0; // Total Amount

    values.forEach((row) => {
      // Parse and sum column G (Travel Expense)
      const valG = parseFloat(String(row[0] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(valG)) totalG += valG;

      // Parse and sum column H (Lodging Expense)
      const valH = parseFloat(String(row[1] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(valH)) totalH += valH;

      // Parse and sum column I (Food) - skip if it has commas (combined S1-S6)
      const foodVal = String(row[2] || "");
      if (!foodVal.includes(",")) {
        const valI = parseFloat(foodVal.replace(/[^0-9.-]/g, ""));
        if (!isNaN(valI)) totalI += valI;
      }

      // Parse and sum column J (Total Amount)
      const valJ = parseFloat(String(row[3] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(valJ)) totalJ += valJ;
    });

    // Determine totals row based on data expansion:
    // - Row 19: if data is in rows 11-15 (no expansion yet)
    // - Row 29: if data is in rows 16-25 (first expansion at row 16)
    // - Row 39: if data is in rows 26-35 (second expansion at row 26)
    // - Row 59: if data is in rows 36+ (third expansion at row 36)
    let totalsRowNumber;
    if (lastDataRow >= 36) {
      totalsRowNumber = 59; // Data has expanded past row 36 (third expansion)
    } else if (lastDataRow >= 26) {
      totalsRowNumber = 39; // Data has expanded past row 26 (second expansion)
    } else if (lastDataRow >= 16) {
      totalsRowNumber = 29; // Data has expanded past row 16 (first expansion)
    } else {
      totalsRowNumber = 19; // Data is still in rows 11-15 (no expansion)
    }

    const totalsRow = [
      totalG.toFixed(2),
      totalH.toFixed(2),
      totalI.toFixed(2),
      totalJ.toFixed(2),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!G${totalsRowNumber}:J${totalsRowNumber}`,
      valueInputOption: "RAW",
      resource: { values: [totalsRow] },
    });

    console.log(
      `Totals updated in "${sheetName}" row ${totalsRowNumber}: G=${totalG.toFixed(
        2
      )}, H=${totalH.toFixed(2)}, I=${totalI.toFixed(2)}, J=${totalJ.toFixed(
        2
      )}`
    );

    return true;
  } catch (error) {
    console.error("Error updating totals:", error);
    return false;
  }
}

// Get all data from Google Sheet
async function getSheetData(spreadsheetId) {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return [];
    }

    const range = "Receipts!A2:G";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      date: row[0] || "",
      type: row[1] || "",
      amount: row[2] || "",
      imageUrl: row[3] || "",
      imageName: row[4] || "",
      uploadTime: row[5] || "",
      status: row[6] || "",
    }));
  } catch (error) {
    console.error("Error getting sheet data:", error);
    return [];
  }
}

// Clear only website-uploaded data rows (A11:J20) in Receipts sheet, preserving headers/styling (rows 1-10) and data after row 20
async function clearSheetData(spreadsheetId) {
  if (!sheets) {
    const initialized = await initializeGoogleSheets();
    if (!initialized) return false;
  }

  // Get the actual sheet name
  const sheetName = await getSheetName(spreadsheetId);

  console.log(
    `Clearing data rows A11:J20 in "${sheetName}" (preserving rows 1-10 with headers/styling and rows 21+ with additional data)...`
  );

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A11:J20`,
  });

  console.log("Sheet data cleared successfully.");

  // Clear totals in row 19
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!G19:J19`,
    valueInputOption: "RAW",
    resource: { values: [["0.00", "0.00", "0.00", "0.00"]] },
  });
  console.log("Totals in row 19 reset to 0.00");

  // Delete all files in backend/data/images/
  const imagesDir = path.join(__dirname, "data", "images");
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} image file(s) from disk.`);
  }

  return true;
}

// Get or create spreadsheet ID from config
function getSpreadsheetId() {
  const configPath = path.join(__dirname, "sheets-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath));
    let spreadsheetId = config.spreadsheetId;

    // Extract Spreadsheet ID from URL if it's a full URL
    if (
      spreadsheetId &&
      typeof spreadsheetId === "string" &&
      spreadsheetId.includes("docs.google.com")
    ) {
      const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return spreadsheetId;
  }
  return null;
}

// Save spreadsheet ID to config
function saveSpreadsheetId(spreadsheetId) {
  const configPath = path.join(__dirname, "sheets-config.json");
  const config = JSON.parse(
    fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "{}"
  );

  // Extract Spreadsheet ID from URL if it's a full URL before saving
  if (
    spreadsheetId &&
    typeof spreadsheetId === "string" &&
    spreadsheetId.includes("docs.google.com")
  ) {
    const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      spreadsheetId = match[1];
    }
  }

  config.spreadsheetId = spreadsheetId;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Get Google Doc ID from config
function getDocId() {
  const configPath = path.join(__dirname, "sheets-config.json");
  let docId = null;

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    docId = config.docId || process.env.GDOC_ID || null;
  } else {
    docId = process.env.GDOC_ID || null;
  }

  // Extract Doc ID from URL if it's a full URL
  if (docId && typeof docId === "string" && docId.includes("docs.google.com")) {
    const match = docId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      console.log(`Extracted Doc ID: ${match[1]} from URL: ${docId}`);
      return match[1];
    }
  }

  return docId;
}

// Save Google Doc ID to config
function saveDocId(docId) {
  const configPath = path.join(__dirname, "sheets-config.json");
  const config = JSON.parse(
    fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "{}"
  );

  // Extract Doc ID from URL if it's a full URL before saving
  if (docId && typeof docId === "string" && docId.includes("docs.google.com")) {
    const match = docId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      docId = match[1];
    }
  }

  config.docId = docId;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Get Drive Folder ID from config
function getDriveFolderId() {
  const configPath = path.join(__dirname, "sheets-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return config.driveFolderId || process.env.GDRIVE_FOLDER_ID || null;
  }
  return process.env.GDRIVE_FOLDER_ID || null;
}

// Save Drive Folder ID to config
function saveDriveFolderId(folderId) {
  const configPath = path.join(__dirname, "sheets-config.json");
  const config = JSON.parse(
    fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "{}"
  );
  config.driveFolderId = folderId;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Get all configuration
function getConfig() {
  const configPath = path.join(__dirname, "sheets-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return {
      spreadsheetId: config.spreadsheetId || null,
      docId: config.docId || process.env.GDOC_ID || null,
      driveFolderId:
        config.driveFolderId || process.env.GDRIVE_FOLDER_ID || null,
    };
  }
  return {
    spreadsheetId: null,
    docId: process.env.GDOC_ID || null,
    driveFolderId: process.env.GDRIVE_FOLDER_ID || null,
  };
}

module.exports = {
  initializeGoogleSheets,
  createSheet,
  appendToSheet,
  getSheetData,
  getSpreadsheetId,
  saveSpreadsheetId,
  clearSheetData,
  initializeGoogleDriveAndDocs,
  clearDocImages,
  getDocId,
  saveDocId,
  getDriveFolderId,
  saveDriveFolderId,
  getConfig,
};
