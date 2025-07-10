const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require('docx');
const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');
const sharp = require('sharp');

const app = express();
const port = 3001; // Port for the backend server

app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: 'backend/data/' });

// Helper: Append to Excel file (read, append, overwrite)
async function appendToExcel(date, type, amount) {
  const filePath = path.join(__dirname, 'data', 'expenses.xlsx');
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
    worksheet = workbook.getWorksheet('Expenses') || workbook.worksheets[0];
  } else {
    worksheet = workbook.addWorksheet('Expenses');
    worksheet.addRow(['Date', 'Type', 'Amount']);
  }
  worksheet.addRow([date, type, amount]);
  await workbook.xlsx.writeFile(filePath);
}

// Helper: Store image and regenerate Word file with all images
async function storeImageAndRegenerateWord(imagePath) {
  const imagesDir = path.join(__dirname, 'data', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }
  // Copy image to imagesDir with unique name
  const imageName = `receipt_${Date.now()}${path.extname(imagePath)}`;
  const destPath = path.join(imagesDir, imageName);
  fs.copyFileSync(imagePath, destPath);

  // Regenerate the Word file with all images
  const filePath = path.join(__dirname, 'data', 'receipts.docx');
  const doc = new Document();
  const imageFiles = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  const children = [];
  for (let idx = 0; idx < imageFiles.length; idx++) {
    const img = imageFiles[idx];
    const imgPath = path.join(imagesDir, img);
    try {
      const imageBuffer = fs.readFileSync(imgPath);
      console.log('Processing image:', imgPath, 'Buffer length:', imageBuffer.length);
      if (!imageBuffer || imageBuffer.length === 0) {
        console.warn('Skipping invalid or empty image:', imgPath);
        continue;
      }
      const image = doc.createImage(imageBuffer);
      children.push(new Paragraph(`Receipt Image #${idx + 1}`));
      children.push(image);
    } catch (err) {
      console.error('Failed to add image to Word:', imgPath, err);
    }
  }
  if (children.length > 0) {
    doc.addSection({ children });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
  }
}

// Update endpoint to use new logic (Word file generation removed)
app.post('/api/submit', upload.single('image'), async (req, res) => {
  try {
    const { date, type, amount } = req.body;
    const imageFile = req.file;
    if (!date || !type || !amount || !imageFile) {
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
    await appendToExcel(date, type, amount);
    fs.unlinkSync(imageFile.path);
    res.status(200).json({ message: 'Data appended to Excel and image saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to append data.' });
  }
});

// Endpoint to download the Excel file
app.get('/api/download/excel', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'expenses.xlsx');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'expenses.xlsx');
  } else {
    res.status(404).json({ message: 'Excel file not found.' });
  }
});

// Endpoint to download the Word file
app.get('/api/download/word', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'receipts.docx');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'receipts.docx');
  } else {
    res.status(404).json({ message: 'Word file not found.' });
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

// Endpoint to get Excel data as JSON
app.get('/api/expenses', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'expenses.xlsx');
  if (!fs.existsSync(filePath)) return res.json([]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Expenses') || workbook.worksheets[0];
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    rows.push({
      date: row.getCell(1).value,
      type: row.getCell(2).value,
      amount: row.getCell(3).value,
    });
  });
  res.json(rows);
});

// On-demand Word file generation endpoint
app.get('/api/generate-word', async (req, res) => {
  try {
    console.log('Starting Word file generation...');
    const imagesDir = path.join(__dirname, 'data', 'images');
    const filePath = path.join(__dirname, 'data', 'receipts.docx');
    const doc = new Document();
    if (!fs.existsSync(imagesDir)) {
      console.log('No images directory found.');
      return res.status(404).json({ message: 'No images found.' });
    }
    const imageFiles = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    console.log('Found image files:', imageFiles);
    if (imageFiles.length === 0) {
      console.log('No valid images to generate Word file.');
      return res.status(404).json({ message: 'No valid images to generate Word file.' });
    }
    // Add each image as a new page
    for (const img of imageFiles) {
      const imgPath = path.join(imagesDir, img);
      try {
        const imageBuffer = fs.readFileSync(imgPath);
        const reencodedBuffer = await sharp(imageBuffer).toFormat('jpeg').toBuffer();
        const dimensions = imageSize(reencodedBuffer);
        console.log('Adding image:', imgPath, 'Buffer length:', reencodedBuffer.length, 'Dimensions:', dimensions);
        const image = doc.createImage(reencodedBuffer, 400, 500);
        doc.addSection({ children: [new Paragraph(img), image] });
      } catch (err) {
        console.error('Failed to add image to Word:', imgPath, err);
        doc.addSection({ children: [new Paragraph('Failed to add image: ' + img)] });
      }
    }
    console.log('Packing Word file...');
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    console.log('Word file written to disk:', filePath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.download(filePath, 'receipts.docx', (err) => {
      if (err) {
        console.error('Error sending Word file:', err);
      } else {
        console.log('Word file sent successfully.');
      }
    });
  } catch (err) {
    console.error('Failed to generate Word file:', err);
    res.status(500).json({ message: 'Failed to generate Word file.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
}); 