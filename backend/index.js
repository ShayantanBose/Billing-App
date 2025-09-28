require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');
const sharp = require('sharp');
const { 
  initializeGoogleSheets, 
  createSheet, 
  appendToSheet, 
  getSheetData, 
  getSpreadsheetId, 
  saveSpreadsheetId, 
  clearSheetData, 
  initializeGoogleDriveAndDocs // Import new function
} = require('./googleSheetsService');

const app = express();
const port = 3001; // Port for the backend server

app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'backend/data/' });

// Initialize Google Sheets on startup
let isGoogleSheetsReady = false;
initializeGoogleSheets().then(ready => {
  isGoogleSheetsReady = ready;
  if (ready) {
    console.log('Google Sheets API initialized successfully');
  } else {
    console.log('Google Sheets API not initialized - check credentials');
  }
});

// Helper: Append to Google Sheets
async function appendToGoogleSheets(data) {
  try {
    let spreadsheetId = getSpreadsheetId();
    
    // Create new sheet if none exists
    if (!spreadsheetId) {
      spreadsheetId = await createSheet();
      if (spreadsheetId) {
        saveSpreadsheetId(spreadsheetId);
      } else {
        throw new Error('Failed to create Google Sheet');
      }
    }

    const success = await appendToSheet(spreadsheetId, data);
    if (!success) {
      throw new Error('Failed to append to Google Sheets');
    }

    return true;
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    return false;
  }
}

// Helper: Store image in local directory
async function storeImage(imagePath) {
  const imagesDir = path.join(__dirname, 'data', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }
  // Copy image to imagesDir with unique name
  const imageName = `receipt_${Date.now()}${path.extname(imagePath)}`;
  const destPath = path.join(imagesDir, imageName);
  fs.copyFileSync(imagePath, destPath);
  return imageName;
}

// Update endpoint to use new logic (Word file generation removed)
app.post('/api/submit', upload.single('image'), async (req, res) => {
  try {
    const {
      date,
      from,
      to,
      modeOfTravel,
      purpose,
      travelExpenses,
      foodS1,
      foodS2,
      foodS3,
      foodS4,
      foodS5,
      foodS6,
      misc,
      amount,
      billDetails,
      remarks,
      budgetHead
    } = req.body;
    const imageFile = req.file;
    if (!date || !amount || !imageFile) {
      console.warn('Missing required fields or image.');
      return res.status(400).json({ message: 'Missing required fields or image.' });
    }
    // Log file info
    console.log('Received file:', {
      originalname: imageFile.originalname,
      mimetype: imageFile.mimetype,
      path: imageFile.path,
      size: imageFile.size,
    });
    // Validate image: must be PNG or JPEG, non-empty, and a real image
    const validExt = /\.(png|jpg|jpeg)$/i;
    const ext = (imageFile.originalname || '').toLowerCase();
    const isValidExt = validExt.test(ext);
    const stats = fs.statSync(imageFile.path);
    const isNonEmpty = stats.size > 0;
    let isRealImage = false;
    if (isValidExt && isNonEmpty) {
      try {
        const buffer = fs.readFileSync(imageFile.path);
        imageSize(buffer); // throws if not a real image
        isRealImage = true;
        console.log('Image-size validation: PASSED');
      } catch (e) {
        console.warn('Rejected invalid image (not a real image):', imageFile.originalname, e.message);
      }
    } else {
      if (!isValidExt) console.warn('Rejected: invalid extension', ext);
      if (!isNonEmpty) console.warn('Rejected: file is empty');
    }
    if (!isValidExt || !isNonEmpty || !isRealImage) {
      fs.unlink(imageFile.path, (err) => {
        if (err) {
          console.error('Failed to delete temp file:', imageFile.path, err);
        } else {
          console.log('Temp file deleted:', imageFile.path);
        }
      });
      console.warn('Rejected invalid image upload:', imageFile.originalname, 'Size:', stats.size);
      return res.status(400).json({ message: 'Invalid image file. Only real, non-empty PNG/JPEG images are allowed.' });
    }
    // Copy to images folder with unique name
    const imagesDir = path.join(__dirname, 'data', 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
    const uniqueName = `receipt_${Date.now()}${ext.slice(ext.lastIndexOf('.'))}`;
    const destPath = path.join(imagesDir, uniqueName);
    // Convert to grayscale using sharp and save
    let sharpImg = sharp(imageFile.path).grayscale();
    // Save to buffer to sample pixel
    const grayBuffer = await sharpImg.raw().toBuffer({ resolveWithObject: true });
    // Sample the top-left pixel (first value in buffer)
    const firstPixel = grayBuffer.data[0];
    let processedImg;
    if (firstPixel < 128) {
      // Background is black, invert image
      processedImg = sharp(imageFile.path).grayscale().negate();
      await processedImg.toFile(destPath);
      console.log('Inverted grayscale image due to black background:', destPath);
    } else {
      // Background is white, just save grayscale
      await sharpImg.toFile(destPath);
      console.log('Saved grayscale image (no inversion needed):', destPath);
    }

    // Upload to Google Drive
    const { drive } = await initializeGoogleDriveAndDocs();
    const driveRes = await drive.files.create({
      requestBody: {
        name: uniqueName,
        mimeType: 'image/jpeg',
        parents: [process.env.GDRIVE_FOLDER_ID] // Optional: set a folder
      },
      media: {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(destPath)
      },
      fields: 'id'
    });
    const fileId = driveRes.data.id;
    // Make file public
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' }
    });
    // Get public URL
    const imageUrl = `https://drive.google.com/uc?id=${fileId}`;
    console.log('Uploaded image to Google Drive:', imageUrl);

    // Insert image into Google Doc (side by side, 2 per row, no text)
    const { docs } = await initializeGoogleDriveAndDocs();
    const DOC_ID = process.env.GDOC_ID;
    const doc = await docs.documents.get({ documentId: DOC_ID });
    let endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

    // Find the last paragraph's text to determine if we need a tab or newline
    let lastPara = doc.data.body.content[doc.data.body.content.length - 2];
    let lastText = '';
    if (lastPara && lastPara.paragraph && lastPara.paragraph.elements) {
      lastText = lastPara.paragraph.elements.map(e => e.textRun ? e.textRun.content : '').join('');
    }
    // Count images in the last row (by counting tabs)
    const imagesInRow = (lastText.match(/\t/g) || []).length + 1;
    let requests = [
      {
        insertInlineImage: {
          location: { index: endIndex },
          uri: imageUrl,
          objectSize: {
            height: { magnitude: 300, unit: 'PT' },
            width: { magnitude: 200, unit: 'PT' }
          }
        }
      }
    ];
    if (imagesInRow % 2 === 1) {
      // After first image in row, insert tab
      requests.push({
        insertText: {
          location: { index: endIndex + 1 },
          text: '\t'
        }
      });
    } else {
      // After second image in row, insert newline
      requests.push({
        insertText: {
          location: { index: endIndex + 1 },
          text: '\n'
        }
      });
    }
    await docs.documents.batchUpdate({
      documentId: DOC_ID,
      requestBody: { requests }
    });
    console.log('Inserted image into Google Doc.');
    await appendToGoogleSheets({
      date,
      from,
      to,
      modeOfTravel,
      purpose,
      travelExpenses,
      foodS1,
      foodS2,
      foodS3,
      foodS4,
      foodS5,
      foodS6,
      misc,
      amount,
      billDetails,
      remarks,
      budgetHead,
      imageName: uniqueName
    });
    // Remove or comment out the file deletion step after processing the image
    // fs.unlinkSync(imageFile.path);
    // or if using async: fs.unlink(imageFile.path, ...);
    res.status(200).json({ message: 'Data appended to Google Sheets and image saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to append data.' });
  }
});

// Endpoint to get Google Sheets URL
app.get('/api/sheets/url', (req, res) => {
  const spreadsheetId = getSpreadsheetId();
  if (spreadsheetId) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    res.json({ url, spreadsheetId });
  } else {
    res.status(404).json({ message: 'Google Sheet not found. Please submit some data first.' });
  }
});

// Endpoint to create a new Google Sheet
app.post('/api/sheets/create', async (req, res) => {
  try {
    const spreadsheetId = await createSheet();
    if (spreadsheetId) {
      saveSpreadsheetId(spreadsheetId);
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      res.json({ url, spreadsheetId, message: 'Google Sheet created successfully' });
    } else {
      res.status(500).json({ message: 'Failed to create Google Sheet' });
    }
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    res.status(500).json({ message: 'Failed to create Google Sheet' });
  }
});

// Endpoint to clear all data rows from the sheet (A13:R1000)
app.post('/api/sheets/clear', async (req, res) => {
  try {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return res.status(404).json({ message: 'No Google Sheet found.' });
    await clearSheetData(spreadsheetId);
    res.json({ message: 'All data cleared.' });
  } catch (err) {
    console.error('Error clearing sheet:', err);
    res.status(500).json({ message: 'Failed to clear data.' });
  }
});

// Serve images as static files
app.use('/images', express.static(path.join(__dirname, 'data', 'images')));

// Endpoint to list image filenames
app.get('/api/images', (req, res) => {
  const imagesDir = path.join(__dirname, 'data', 'images');
  if (!fs.existsSync(imagesDir)) return res.json([]);
  const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  res.json(files);
});

// Endpoint to get Google Sheets data as JSON
app.get('/api/expenses', async (req, res) => {
  try {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) {
      return res.json([]);
    }
    
    const data = await getSheetData(spreadsheetId);
    res.json(data);
  } catch (error) {
    console.error('Error getting expenses data:', error);
    res.status(500).json({ message: 'Failed to get expenses data' });
  }
});

// Endpoint to check Google Sheets status
app.get('/api/sheets/status', (req, res) => {
  const spreadsheetId = getSpreadsheetId();
  res.json({ 
    isReady: isGoogleSheetsReady,
    hasSheet: !!spreadsheetId,
    spreadsheetId 
  });
});

// Catch all handler: send back React's index.html file for SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle other static routes that don't match API endpoints
app.use((req, res, next) => {
  // Only handle GET requests that don't start with /api
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/images')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log(`Frontend available at http://localhost:${port}`);
}); 