# Billing App Frontend

This is the **frontend** for the Billing App, built with **React**, **TypeScript**, and **Vite**.
It provides a user-friendly interface for uploading receipts or bills, extracting key information using OCR (Optical Character Recognition), and submitting the data for further processing.

---

## Features

- **Image Upload:** Upload a bill or receipt image directly from your device.
- **Clipboard Paste & Drag-and-Drop:** Skip downloading—copy a bill screenshot and press <kbd>Ctrl</kbd> + <kbd>V</kbd>, or drop it straight into the app.
- **OCR Extraction:** Uses [Tesseract.js](https://github.com/naptha/tesseract.js) to extract text from images in the browser.
- **Smart Parsing:** Extracts structured data such as customer name, ride details, and price (with robust handling for rupee symbols and OCR quirks).
- **Data Review:** Preview and edit extracted data before submission.
- **Submission:** Send the structured data to the backend for storage or further processing.
- **Modern UI:** Clean, responsive design with React and CSS.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

```bash
cd frontend
npm install
# or
yarn install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

- `src/App.tsx` — Main React app, handles UI and workflow.
- `src/services/OcrService.ts` — Image preprocessing, OCR, and text parsing logic.
- `src/assets/` — Static assets and images.
- `src/App.css` — Main styles.

---

## Key Technologies

- **React 19** — UI library
- **TypeScript** — Type safety
- **Vite** — Fast build tool and dev server
- **Tesseract.js** — OCR in the browser
- **Axios** — HTTP requests

---

## OCR & Parsing Improvements

- Uses Tesseract.js worker API for better performance and control.
- Handles common OCR errors (e.g., rupee symbol misread as "2").
- Extracts price robustly from various receipt formats.

---

## Linting & Formatting

- ESLint is configured for TypeScript and React.
- Run `npm run lint` to check code quality.

---

## Customization

- Update parsing logic in `src/services/OcrService.ts` to handle new receipt formats or additional fields.
- Adjust styles in `src/App.css` as needed.

---

## License

This project is for demonstration and educational purposes.

---

**Questions or issues?**
Open an issue or contact the maintainer.
