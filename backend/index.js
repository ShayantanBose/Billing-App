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
  clearSheetData 
} = require('./googleSheetsService');

const app = express();
const port = 3001; // Port for the backend server

app.use(cors());
app.use(bodyParser.json());

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
      fs.unlinkSync(imageFile.path);
      console.warn('Rejected invalid image upload:', imageFile.originalname, 'Size:', stats.size);
      return res.status(400).json({ message: 'Invalid image file. Only real, non-empty PNG/JPEG images are allowed.' });
    }
    // Copy to images folder with unique name
    const imagesDir = path.join(__dirname, 'data', 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
    const uniqueName = `receipt_${Date.now()}${ext.slice(ext.lastIndexOf('.'))}`;
    const destPath = path.join(imagesDir, uniqueName);
    fs.copyFileSync(imageFile.path, destPath);
    console.log('Saved image:', destPath, 'Size:', stats.size);
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
    fs.unlinkSync(imageFile.path);
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

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
}); 