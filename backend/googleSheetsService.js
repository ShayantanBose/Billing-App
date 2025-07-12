const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Google Sheets API configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

let auth = null;
let sheets = null;

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
              columnCount: 10
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
    const headers = [
      'Date',
      'Type',
      'Amount',
      'Image URL',
      'Image Name',
      'Upload Time',
      'Status'
    ];

    const range = 'Receipts!A1:G1';
    const valueRange = {
      values: [headers]
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: valueRange
    });

    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.6,
                    blue: 0.8
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1
                    }
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }
        ]
      }
    });

    console.log('Headers updated successfully');
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

    const values = [
      [
        data.date,
        data.type,
        data.amount,
        data.imageUrl || '',
        data.imageName || '',
        new Date().toISOString(),
        'Active'
      ]
    ];

    const range = 'Receipts!A:G';
    const valueRange = {
      values: values
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: valueRange
    });

    console.log('Data appended to Google Sheet successfully');
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
  saveSpreadsheetId
}; 