const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function authorize() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log('❌ credentials.json file not found!');
    console.log('Please download your credentials from Google Cloud Console and place it in the backend folder.');
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3001/callback');
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  console.log('\n🔐 Authorization required!');
  console.log('1. Open this URL in your browser:');
  console.log(authUrl);
  const code = await ask('2. Paste the authorization code here: ');
  const { tokens } = await oAuth2Client.getToken(code.trim());
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('✅ Token stored successfully!');
  return oAuth2Client;
}

async function createTestDriveFolder(drive) {
  const folderName = 'BillingApp-Receipts';
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });
  return res.data.id;
}

async function createTestDoc(docs) {
  const res = await docs.documents.create({
    requestBody: { title: 'BillingApp Receipts Doc' }
  });
  return res.data.documentId;
}

async function main() {
  console.log('--- Billing App Unified Setup ---');
  const auth = await authorize();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  // Create or get Drive folder
  let folderId = await ask('Enter Google Drive folder ID for receipts (leave blank to create new): ');
  if (!folderId) {
    folderId = await createTestDriveFolder(drive);
    console.log('✅ Created Drive folder. ID:', folderId);
  }

  // Create or get Google Doc
  let docId = await ask('Enter Google Doc ID for receipts (leave blank to create new): ');
  if (!docId) {
    docId = await createTestDoc(docs);
    console.log('✅ Created Google Doc. ID:', docId);
  }

  // Test Drive upload
  const fileRes = await drive.files.create({
    requestBody: {
      name: 'test-upload.txt',
      parents: [folderId],
      mimeType: 'text/plain'
    },
    media: {
      mimeType: 'text/plain',
      body: 'BillingApp test file.'
    },
    fields: 'id'
  });
  const testFileId = fileRes.data.id;
  await drive.permissions.create({ fileId: testFileId, requestBody: { role: 'reader', type: 'anyone' } });
  const testFileUrl = `https://drive.google.com/uc?id=${testFileId}`;
  console.log('✅ Uploaded test file to Drive:', testFileUrl);

  // Test Docs insert
  const publicImageUrl = await ask('Enter a public image URL (e.g., from Imgur) to test Docs image insert (or leave blank to skip): ');
  const requests = [
    { insertText: { location: { index: 1 }, text: '\nBillingApp setup test\n' } }
  ];
  if (publicImageUrl) {
    requests.push({
      insertInlineImage: {
        location: { index: 2 },
        uri: publicImageUrl,
        objectSize: { height: { magnitude: 50, unit: 'PT' }, width: { magnitude: 50, unit: 'PT' } }
      }
    });
  }
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });
  if (publicImageUrl) {
    console.log('✅ Inserted test text and image into Google Doc.');
  } else {
    console.log('✅ Inserted test text into Google Doc (no image, as none was provided).');
  }

  // Print export commands
  console.log('\n--- Setup Complete! ---');
  console.log('Add these to your environment or .env file:');
  console.log(`GDOC_ID=${docId}`);
  console.log(`GDRIVE_FOLDER_ID=${folderId}`);
  console.log('\nYou can now run your backend and use the new features.');
  rl.close();
}

if (require.main === module) {
  main();
} 