# Billing App with Google Sheets Integration

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
