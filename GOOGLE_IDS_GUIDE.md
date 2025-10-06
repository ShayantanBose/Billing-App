# How to Get Your Google IDs

This guide explains how to find the Google Sheets, Docs, and Drive Folder IDs needed for the NGO Billing App.

## Why Configure IDs?

Each user can configure their own Google Sheets, Docs, and Drive Folder IDs. These IDs are stored locally on your device in the `backend/sheets-config.json` file, so each person using the app can work with their own Google workspace.

## Finding Your Google IDs

### 1. Google Sheets ID

1. Open or create a Google Sheet in your browser
2. Look at the URL in the address bar:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   ```
3. The Sheets ID is the long string between `/d/` and `/edit`:
   ```
   1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   ```
4. Copy this ID

**Note:** If you don't provide a Sheets ID, the app will automatically create a new sheet for you!

### 2. Google Docs ID

1. Open or create a Google Doc in your browser where you want receipt images inserted
2. Look at the URL in the address bar:
   ```
   https://docs.google.com/document/d/1abcXYZ123_example-doc-id/edit
   ```
3. The Docs ID is the long string between `/d/` and `/edit`:
   ```
   1abcXYZ123_example-doc-id
   ```
4. Copy this ID

**Note:** If you don't configure a Docs ID, receipt images will still be uploaded to Drive but won't be inserted into a document.

### 3. Google Drive Folder ID

1. Open or create a folder in Google Drive
2. Open the folder and look at the URL:
   ```
   https://drive.google.com/drive/folders/1abcXYZ123_example-folder-id
   ```
3. The Folder ID is the long string after `/folders/`:
   ```
   1abcXYZ123_example-folder-id
   ```
4. Copy this ID

**Note:** If you don't configure a Drive Folder ID, images will be uploaded to your Google Drive root.

## How to Configure in the App

### Method 1: Using the Admin Panel (Recommended)

1. Start the app and navigate to the Admin Panel
2. Click "Show Configuration" in the blue configuration section
3. Paste your IDs into the respective fields
4. Click "Save Configuration"
5. Your settings are saved locally to `backend/sheets-config.json`

### Method 2: Manual Configuration

1. Open `backend/sheets-config.json` (create it if it doesn't exist)
2. Add your IDs:
   ```json
   {
     "spreadsheetId": "your-google-sheets-id-here",
     "docId": "your-google-docs-id-here",
     "driveFolderId": "your-google-drive-folder-id-here"
   }
   ```
3. Save the file
4. Restart the backend server

### Method 3: Environment Variables (Alternative)

You can also set these in the `backend/.env` file:

```bash
GDRIVE_FOLDER_ID=your-google-drive-folder-id-here
GDOC_ID=your-google-docs-document-id-here
```

**Note:** Configuration in `sheets-config.json` takes priority over `.env` values.

## Permissions

Make sure your Google account (the one you authenticated with) has:

- **Edit access** to the Google Sheet
- **Edit access** to the Google Doc
- **Write access** to the Drive Folder

## Multi-User Setup

Each user should:

1. Run the app on their own device
2. Authenticate with their own Google account (using `node setupGoogleSheets.js`)
3. Configure their own Sheets/Docs/Drive IDs in the Admin Panel
4. Their configuration will be saved locally and won't affect other users

## Troubleshooting

**Problem:** "Google Doc ID is not configured"

- **Solution:** Go to Admin Panel → Configuration and add your Google Docs ID

**Problem:** Images not showing in Google Doc

- **Solution:** Verify you have edit permissions for the document and that the Doc ID is correct

**Problem:** Can't find the ID

- **Solution:** Make sure you're looking at the URL while viewing the document/folder, not the title

**Problem:** Configuration not saving

- **Solution:** Check that `backend/sheets-config.json` is writable and the backend server has restarted

## Example Configuration

Here's a complete example:

```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "docId": "1YzI23AbCdEfGhIjKlMnOpQrStUvWxYz456",
  "driveFolderId": "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7"
}
```

All IDs are long alphanumeric strings that you copy directly from the Google URLs.
