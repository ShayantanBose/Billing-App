const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Google Sheets API configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

let auth = null;
let sheets = null;

// Add Google Drive and Docs API authentication
let drive = null;
let docs = null;

// Initialize Google Sheets API
async function initializeGoogleSheets() {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('Google Sheets credentials not found. Please add credentials.json file.');
      return false;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored token
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
    } else {
      console.log('Google Sheets token not found. Please run the authentication setup.');
      return false;
    }

    auth = oAuth2Client;
    sheets = google.sheets({ version: 'v4', auth });
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
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
    if (!drive) drive = google.drive({ version: 'v3', auth });
    if (!docs) docs = google.docs({ version: 'v1', auth });
    return { drive, docs };
  } catch (error) {
    console.error('Error initializing Google Drive/Docs:', error);
    return null;
  }
}

// Remove all inline images (and trailing whitespace) from a Google Doc
async function clearDocImages(documentId) {
  try {
    if (!documentId) {
      throw new Error('Missing Google Doc ID (GDOC_ID).');
    }

    const services = await initializeGoogleDriveAndDocs();
    if (!services || !services.docs) {
      throw new Error('Failed to initialize Google Docs API.');
    }

    const { docs } = services;
    const doc = await docs.documents.get({ documentId });
    const content = doc?.data?.body?.content || [];

    const rangesToDelete = [];

    content.forEach((struct) => {
      const elements = struct?.paragraph?.elements || [];
      elements.forEach((element, idx) => {
        if (element.inlineObjectElement && element.startIndex !== undefined && element.endIndex !== undefined) {
          let startIndex = element.startIndex;
          let endIndex = element.endIndex;

          const nextEl = elements[idx + 1];
          if (
            nextEl &&
            nextEl.textRun &&
            typeof nextEl.startIndex === 'number' &&
            typeof nextEl.endIndex === 'number'
          ) {
            const content = nextEl.textRun.content || '';
            if (content.trim() === '') {
              const sliceIndex = content.lastIndexOf('\n');
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
      deleteContentRange: { range }
    }));

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    return { removed: rangesToDelete.length };
  } catch (error) {
    console.error('Error clearing images from Google Doc:', error);
    throw error;
  }
}

// Create a new Google Sheet
async function createSheet(title = 'Receipts Database') {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return null;
    }
    const resource = {
      properties: {
        title: title
      },
      sheets: [
        {
          properties: {
            title: 'Receipts',
            gridProperties: {
              rowCount: 1000,
              columnCount: 16 // A-P
            }
          }
        }
      ]
    };
    const response = await sheets.spreadsheets.create({
      resource,
      fields: 'spreadsheetId'
    });
    const spreadsheetId = response.data.spreadsheetId;
    console.log(`Created Google Sheet with ID: ${spreadsheetId}`);
    // Set up headers
    await updateHeaders(spreadsheetId);
    return spreadsheetId;
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    return null;
  }
}

// Update headers in the sheet
async function updateHeaders(spreadsheetId) {
  try {
    // 18 columns: A to R
    const mainHeaders = [
      'Sl. No.', // A
      'Date',    // B
      'Station', '', // C, D (From, To)
      'Mode of Travel', // E
      'Purpose and other particulars', // F
      'Travel Expenses (Rs)', // G
      'Food', '', '', '', '', '', // H-M (S1-S6)
      'Miscellaneous (Rs)', // N
      'Total Amount (Rs)', // O
      'Bill Details (Yes/ No)', // P
      'Remarks', // Q
      'Budget head' // R
    ];
    const subHeaders = [
      '', // Sl. No.
      '', // Date
      'From', 'To', // Station
      '', // Mode of Travel
      '', // Purpose
      '', // Travel Expenses
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', // Food
      '', // Miscellaneous
      '', // Total Amount
      '', // Bill Details
      '', // Remarks
      ''  // Budget head
    ];
    // Ensure both arrays have 18 elements
    if (mainHeaders.length !== 18 || subHeaders.length !== 18) {
      throw new Error(`Header length mismatch: mainHeaders=${mainHeaders.length}, subHeaders=${subHeaders.length}`);
    }
    console.log('Writing new headers to Receipts!A1:R2...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Receipts!A1:R2',
      valueInputOption: 'RAW',
      resource: { values: [mainHeaders, subHeaders] }
    });
    console.log('Headers written successfully!');
  } catch (error) {
    console.error('Error updating headers:', error);
  }
}

// Append data to Google Sheet
async function appendToSheet(spreadsheetId, data) {
  try {
    if (!sheets) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) return false;
    }

    // Get current number of rows to determine Sl. No. (start from row 13)
    const getRowsResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Receipts!A13:A', // start at row 13
    });
    const currentRows = getRowsResp.data.values ? getRowsResp.data.values.length : 0;
    const slNo = currentRows + 1; // Sl. No. starts at 1 for your data rows
    const targetRow = 13 + currentRows; // Row number in the sheet

    // Prepare row: match new sheet format
    // Columns: Sl. No., Date, From, To, Mode of Travel, Purpose, Travel Expenses, Lodging Expenses, Food, Miscellaneous, Total Amount, Bill Details, ...
    const row = Array(18).fill('');
    row[0] = slNo; // Sl. No.
    row[1] = data.date || '';
    row[2] = data.from || '';
    row[3] = data.to || '';
    row[4] = data.modeOfTravel || '';
    row[5] = data.purpose || '';
    row[6] = data.travelExpenses || '';
    row[7] = data.lodgingExpenses || '';
    // Food as a single cell (combine S1-S6)
    const foodArr = [data.foodS1, data.foodS2, data.foodS3, data.foodS4, data.foodS5, data.foodS6].filter(Boolean);
    row[8] = foodArr.join(', ');
    row[9] = data.misc || '';
    row[10] = data.amount || '';
    row[11] = data.billDetails || '';
    // Add imageName to remarks if present
    row[16] = (data.remarks || '') + (data.imageName ? ` [img: ${data.imageName}]` : '');
    row[17] = data.budgetHead || '';

    const values = [row];

    // Use update to write to the exact row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Receipts!A${targetRow}:R${targetRow}`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`Data written to Google Sheet at row ${targetRow}`);
    return true;
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
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

    const range = 'Receipts!A2:G';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      date: row[0] || '',
      type: row[1] || '',
      amount: row[2] || '',
      imageUrl: row[3] || '',
      imageName: row[4] || '',
      uploadTime: row[5] || '',
      status: row[6] || ''
    }));
  } catch (error) {
    console.error('Error getting sheet data:', error);
    return [];
  }
}

// Clear all data rows (A13:R1000) in Receipts sheet, keeping headers, and delete all images from disk
async function clearSheetData(spreadsheetId) {
  if (!sheets) {
    const initialized = await initializeGoogleSheets();
    if (!initialized) return false;
  }
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Receipts!A13:R1000'
  });
  // Delete all files in backend/data/images/
  const imagesDir = path.join(__dirname, 'data', 'images');
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  }
  return true;
}

// Get or create spreadsheet ID from config
function getSpreadsheetId() {
  const configPath = path.join(__dirname, 'sheets-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath));
    return config.spreadsheetId;
  }
  return null;
}

// Save spreadsheet ID to config
function saveSpreadsheetId(spreadsheetId) {
  const configPath = path.join(__dirname, 'sheets-config.json');
  const config = { spreadsheetId };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
  clearDocImages
}; 