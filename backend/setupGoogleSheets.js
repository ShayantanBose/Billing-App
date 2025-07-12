const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function authorize() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('❌ credentials.json file not found!');
      console.log('\n📋 To set up Google Sheets API:');
      console.log('1. Go to https://console.developers.google.com/');
      console.log('2. Create a new project or select existing one');
      console.log('3. Enable Google Sheets API');
      console.log('4. Create credentials (OAuth 2.0 Client ID)');
      console.log('5. Choose "Desktop application" as the application type');
      console.log('6. Download the credentials and save as "credentials.json" in the backend folder');
      console.log('7. Run this script again');
      return null;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id } = credentials.installed || credentials.web;

    // Use a simple approach without redirect URI
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      return await getNewToken(oAuth2Client);
    }
  } catch (error) {
    console.error('Error during authorization:', error);
    return null;
  }
}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n🔐 Authorization required!');
  console.log('📋 Follow these steps:');
  console.log('1. Copy and paste this URL into your browser:');
  console.log('   ' + authUrl);
  console.log('\n2. Sign in with your Google account');
  console.log('3. Grant permissions to the application');
  console.log('4. You will see a page with a code or be redirected');
  console.log('5. Look for the authorization code on the page or in the URL');
  console.log('6. Copy the code and paste it below\n');
  
  console.log('💡 TROUBLESHOOTING:');
  console.log('- If you see a page with "The site can\'t be reached", that\'s normal!');
  console.log('- Look at the URL in your browser address bar');
  console.log('- The code is usually in the URL after "code="');
  console.log('- If you see a blank page, check the URL carefully');
  console.log('- The code is a long string of letters and numbers\n');
  
  return new Promise((resolve) => {
    rl.question('Enter the authorization code: ', async (code) => {
      try {
        // Clean the code - remove any URL parts
        let cleanCode = code.trim();
        
        // If the user pasted a full URL, extract the code
        if (cleanCode.includes('code=')) {
          const codeMatch = cleanCode.match(/code=([^&]+)/);
          if (codeMatch) {
            cleanCode = codeMatch[1];
          }
        }
        
        // If the user pasted a URL with localhost, extract the code
        if (cleanCode.includes('localhost')) {
          const codeMatch = cleanCode.match(/code=([^&]+)/);
          if (codeMatch) {
            cleanCode = codeMatch[1];
          }
        }
        
        console.log('🔍 Attempting to use code:', cleanCode.substring(0, 10) + '...');
        
        const { tokens } = await oAuth2Client.getToken(cleanCode);
        oAuth2Client.setCredentials(tokens);
        
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token stored successfully!');
        resolve(oAuth2Client);
      } catch (error) {
        console.error('❌ Error retrieving access token:', error);
        console.log('\n💡 Troubleshooting:');
        console.log('- Make sure you copied the entire authorization code correctly');
        console.log('- The code should be a long string of letters and numbers');
        console.log('- Try copying the code again from the browser');
        console.log('- If the URL shows "error=access_denied", you need to grant permissions');
        console.log('- If you see "invalid_grant", the code may have expired - try again');
        resolve(null);
      }
    });
  });
}

async function createInitialSpreadsheet() {
  try {
    console.log('🚀 Starting Google Sheets setup...\n');
    
    const auth = await authorize();
    if (!auth) {
      console.log('❌ Authorization failed');
      console.log('💡 Please check your credentials.json file and try again');
      return;
    }

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📊 Creating Google Sheet...');
    
    const resource = {
      properties: {
        title: 'Receipts Database'
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
      fields: 'spreadsheetId,spreadsheetUrl'
    });

    const spreadsheetId = response.data.spreadsheetId;
    const spreadsheetUrl = response.data.spreadsheetUrl;

    console.log('✅ Google Sheet created successfully!');
    console.log('📋 Spreadsheet ID:', spreadsheetId);
    console.log('🔗 Spreadsheet URL:', spreadsheetUrl);

    // Set up headers
    console.log('📝 Setting up headers...');
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

    // Save spreadsheet ID to config
    const configPath = path.join(__dirname, 'sheets-config.json');
    const config = { spreadsheetId, spreadsheetUrl };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('✅ Headers set up and formatted');
    console.log('✅ Configuration saved to sheets-config.json');
    console.log('\n🎉 Google Sheets setup complete!');
    console.log('You can now use the application to upload receipts to Google Sheets.');

  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('- Make sure you have internet connection');
    console.log('- Verify your Google account has access to Google Sheets');
    console.log('- Check that the Google Sheets API is enabled in your project');
  } finally {
    rl.close();
  }
}

// Run the setup
if (require.main === module) {
  createInitialSpreadsheet();
} 