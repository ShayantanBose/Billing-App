# NGO Billing Application

A complete bill processing and expense tracking application with OCR capabilities for NGOs.

## Features

- OCR text extraction from receipt images
- Expense categorization (Food, Travel, Miscellaneous)
- Google Sheets integration for data storage
- Admin panel for data management
- Automatic image processing and storage

## Quick Start (Windows)

### Option 1: Double-click to run
Simply double-click `launch.bat` to start the application. On first run, it will automatically:
- Check if Node.js is installed (install if needed)
- Install all dependencies
- Build the frontend
- Start the application

### Option 2: Using PowerShell
Right-click `start-app.ps1` and select "Run with PowerShell"

### Option 3: Create Windows Installer
1. Install NSIS (Nullsoft Scriptable Install System)
2. Right-click `installer.nsi` and select "Compile NSIS Script"
3. This will create `NGO Billing App-Setup.exe`
4. Run the installer and use the desktop shortcut

## Manual Setup

If you prefer to set up manually:

1. **Install Node.js** (if not installed):
   - Download from https://nodejs.org/
   - Install version 18 or higher

2. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Build frontend**:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

4. **Copy frontend build**:
   ```bash
   # Windows
   xcopy /s /e /i frontend\\dist backend\\public
   
   # Linux/Mac
   cp -r frontend/dist backend/public
   ```

5. **Start the application**:
   ```bash
   cd backend
   node index.js
   ```

6. **Open browser**: Navigate to http://localhost:3001

## Configuration

### Google Sheets Setup
1. Create a Google Cloud Project
2. Enable Google Sheets and Drive APIs
3. Create service account credentials
4. Download credentials.json and place in backend folder
5. Create .env file in backend with required variables

### Environment Variables
Create a `.env` file in the `backend` directory:
```
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GDRIVE_FOLDER_ID=your_drive_folder_id
GDOC_ID=your_google_doc_id
```

## Usage

1. **Upload Bills**: Select category and upload receipt images
2. **Process OCR**: Click "Process Image" to extract text
3. **Review Data**: Verify extracted date and amount
4. **Submit**: Save data to Google Sheets
5. **Admin Panel**: Access via the Admin Panel link to view all data

## File Structure

```
billing-app/
├── backend/           # Node.js/Express backend
├── frontend/          # React frontend
├── launch.bat         # Quick launcher
├── start-app.bat      # Setup and start script
├── start-app.ps1      # PowerShell setup script
├── installer.nsi      # NSIS installer script
└── README.md          # This file
```

## Troubleshooting

### Node.js Issues
- Ensure Node.js 18+ is installed
- Restart command prompt/PowerShell after Node.js installation
- Check PATH environment variable includes Node.js

### Port Conflicts
- If port 3001 is in use, modify the port in `backend/index.js`
- Update any hardcoded URLs in the frontend

### Google Sheets Errors
- Verify credentials.json is valid
- Check API permissions
- Ensure sheet ID is correct

## Development

To run in development mode:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Copy to backend
cp -r dist ../backend/public
```

## License

This project is licensed under the ISC License.

## Support

For issues and support, please create an issue in the GitHub repository. with Google Sheets Integration

A full-stack billing application that uses OCR (Optical Character Recognition) to extract data from receipt images and stores the information in Google Sheets for collaborative access and management.

## Features

- **OCR Processing**: Extract text and data from receipt images using Tesseract.js
- **Google Sheets Integration**: Store all receipt data in Google Sheets for easy access and collaboration
- **Image Management**: Upload and store receipt images with unique identifiers
- **Admin Panel**: View all uploaded receipts, images, and Google Sheets data
- **Multi-Image Support**: Process multiple images in sequence
- **Data Validation**: Validate extracted data before submission

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Google Sheets API** for data storage
- **Multer** for file uploads
- **Sharp** for image processing
- **Google Auth Library** for OAuth authentication

### Frontend
- **React 19** with TypeScript
- **Tesseract.js** for OCR processing
- **React Router** for navigation
- **Vite** for build tooling

## Project Structure

```
Billing-App/
├── backend/
│   ├── googleSheetsService.js    # Google Sheets API integration
│   ├── setupGoogleSheets.js      # OAuth setup script
│   ├── GOOGLE_SHEETS_SETUP.md   # Setup guide
│   ├── index.js                  # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── AdminPanel.tsx        # Admin interface
│   │   ├── App.tsx              # Main app component
│   │   └── services/
│   │       └── OcrService.ts    # OCR processing logic
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Google Cloud Console account
- Google Sheets API enabled

### 1. Clone and Install

```bash
git clone <repository-url>
cd Billing-App

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Google Sheets Setup

Follow the detailed setup guide in `backend/GOOGLE_SHEETS_SETUP.md`:

1. Set up Google Cloud Console credentials
2. Run the OAuth setup script
3. Verify the integration

### 3. Start the Application

```bash
# Start backend (from backend directory)
cd backend
node index.js

# Start frontend (from frontend directory)
cd frontend
npm run dev
```

### 4. Access the Application

- **Main App**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/admin

## Usage

### Uploading Receipts

1. Go to the main application
2. Upload one or more receipt images
3. Process each image with OCR
4. Review and edit extracted data
5. Submit the data to Google Sheets

### Admin Panel

The admin panel provides:
- Google Sheets connection status
- Direct link to the Google Sheet
- View all uploaded images
- View all expense entries with details
- Create new Google Sheets if needed

## Google Sheets Integration

The app automatically:
- Creates a Google Sheet on first submission
- Stores receipt data with timestamps
- Links to uploaded images
- Provides collaborative access to all data

### Data Structure

Each receipt creates a row with:
- Date
- Type (Food, Travel, Miscellaneous)
- Amount
- Image URL
- Image Name
- Upload Time
- Status

## Development

### Backend Development

```bash
cd backend
node index.js
```

The server runs on port 3001 and provides:
- `/api/submit` - Submit receipt data
- `/api/images` - List uploaded images
- `/api/expenses` - Get Google Sheets data
- `/api/sheets/*` - Google Sheets management

### Frontend Development

```bash
cd frontend
npm run dev
```

The development server runs on port 5173 with hot reloading.

## Configuration

### Environment Variables

No environment variables are required for basic setup. The Google Sheets integration uses OAuth tokens stored locally.

### Google Sheets Configuration

The app automatically manages:
- OAuth authentication
- Google Sheet creation
- Data synchronization
- Access token refresh

## Troubleshooting

### Common Issues

1. **Google Sheets not connecting**
   - Check `backend/GOOGLE_SHEETS_SETUP.md`
   - Verify credentials.json and token.json exist
   - Ensure Google Sheets API is enabled

2. **OCR not working**
   - Check browser console for errors
   - Ensure images are clear and readable
   - Try different image formats (PNG, JPEG)

3. **Images not uploading**
   - Check file size limits
   - Verify image format (PNG, JPEG)
   - Check backend console for errors

### Debug Mode

Enable detailed logging by checking the browser console and backend terminal for error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the Google Sheets setup guide
3. Check the console logs for detailed error messages
