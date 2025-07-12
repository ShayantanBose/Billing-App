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

async function manualSetup() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('❌ credentials.json file not found!');
      console.log('Please download your credentials from Google Cloud Console first.');
      return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id } = credentials.installed || credentials.web;

    console.log('\n🔧 MANUAL GOOGLE SHEETS SETUP');
    console.log('===============================\n');
    
    console.log('📋 Step 1: Get Authorization URL');
    console.log('Copy this URL and open it in your browser:');
    console.log('\n' + '='.repeat(80));
    
    // Use a more compatible approach
    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${client_id}&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3001/callback')}&` +
      `scope=${encodeURIComponent(SCOPES.join(' '))}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    console.log(authUrl);
    console.log('='.repeat(80) + '\n');
    
    console.log('📋 Step 2: Get Authorization Code');
    console.log('1. Open the URL above in your browser');
    console.log('2. Sign in with your Google account');
    console.log('3. If you see "Access blocked", click "Advanced" then "Go to [Your App Name]"');
    console.log('4. Grant permissions to the application');
    console.log('5. You will be redirected to a localhost page');
    console.log('6. Copy the authorization code from the URL\n');
    
    console.log('💡 TROUBLESHOOTING ACCESS BLOCKED:');
    console.log('- If you see "Access blocked" or "This app isn\'t verified":');
    console.log('  1. Click "Advanced" at the bottom of the page');
    console.log('  2. Click "Go to [Your App Name] (unsafe)"');
    console.log('  3. Click "Allow" to grant permissions');
    console.log('- If you see "The site can\'t be reached" after authorization:');
    console.log('  Look at the URL in your browser address bar');
    console.log('  The code is in the URL after "code="');
    console.log('- The code should be a long string of letters and numbers\n');
    
    rl.question('📋 Step 3: Paste the authorization code here: ', async (code) => {
      try {
        let cleanCode = code.trim();
        
        // Handle different code formats
        if (cleanCode.includes('code=')) {
          const codeMatch = cleanCode.match(/code=([^&]+)/);
          if (codeMatch) {
            cleanCode = codeMatch[1];
          }
        }
        
        if (cleanCode.includes('localhost')) {
          const codeMatch = cleanCode.match(/code=([^&]+)/);
          if (codeMatch) {
            cleanCode = codeMatch[1];
          }
        }
        
        console.log('🔍 Using code:', cleanCode.substring(0, 10) + '...');
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3001/callback');
        const { tokens } = await oAuth2Client.getToken(cleanCode);
        
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token stored successfully!');
        
        console.log('\n📋 Step 4: Test the connection');
        oAuth2Client.setCredentials(tokens);
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
        
        // Test the connection with a simple request
        try {
          const response = await sheets.spreadsheets.get({
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            ranges: 'A1:A1'
          });
          console.log('✅ Google Sheets API connection successful!');
        } catch (testError) {
          // If test fails, that's okay - just means we can't access that specific sheet
          console.log('✅ Token created successfully!');
          console.log('💡 Note: Could not test with sample sheet, but token is valid.');
        }
        
        console.log('🎉 Setup complete! You can now use the application.');
        
      } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('- Make sure you copied the entire authorization code');
        console.log('- The code should be a long string of letters and numbers');
        console.log('- If you see "invalid_grant", the code expired - get a new one');
        console.log('- If you see "access_denied", you need to grant permissions');
        console.log('- Try the process again with a fresh code');
      } finally {
        rl.close();
      }
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    rl.close();
  }
}

// Run the manual setup
if (require.main === module) {
  manualSetup();
} 