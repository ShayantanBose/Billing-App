import { createWorker } from 'tesseract.js';
// @ts-ignore
import { PSM } from 'tesseract.js'; // Try to import PSM if available
import axios from 'axios';

// Preprocess image: convert to grayscale using canvas
export const preprocessImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Convert to grayscale
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
        imageData.data[i] = avg;
        imageData.data[i+1] = avg;
        imageData.data[i+2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob!);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  });
};

// Function to process image with Tesseract.js using the worker API (v6+)
export const processImageWithOCR = async (image: File): Promise<string> => {
  const preprocessed = await preprocessImage(image);
  const worker = await createWorker('eng'); // Set language here
  try {
    await worker.load();
    const params: Record<string, any> = {
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ₹:/.,',
    };
    if (typeof PSM !== 'undefined' && PSM.SPARSE_TEXT) {
      params.tessedit_pageseg_mode = PSM.SPARSE_TEXT;
    }
    await worker.setParameters(params);
    const { data: { text } } = await worker.recognize(preprocessed);
    await worker.terminate();
    console.log(text);
    return text;
  } catch (err) {
    await worker.terminate();
    throw err;
  }
};

// Parse OCR text into structured data
export const parseOCRText = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const lines = text.split('\n');

    // Regex to match rupees in various formats
    const rupeesRegex = /(₹|Rs\.?|INR|rupees?)\s*([0-9,]+(?:\.\d{1,2})?)/i;
    const selectedPriceRegex = /SelectedPrice\s*([0-9]{2,})/i;
    const fuzzyRupeeRegex = /(?:^|\n)2([0-9]{2,})/;

    // 1. Search for 'SelectedPrice' followed by a number
    const priceMatch = text.replace(/\s/g, '').match(selectedPriceRegex);
    if (priceMatch) {
      result['Selected Price'] = priceMatch[1];
    } else {
      // 2. Fuzzy: look for lines starting with '2' followed by a number (common OCR rupee error)
      const fuzzyMatch = text.match(fuzzyRupeeRegex);
      if (fuzzyMatch) {
        result['Selected Price (fuzzy)'] = fuzzyMatch[1];
      } else {
        // 3. Fallback: look for rupees in various formats
        const match = text.match(rupeesRegex);
        if (match) {
          result['Selected Price'] = match[2].replace(/,/g, '');
        }
      }
    }

    // 4. Continue with your existing line-by-line parsing for other fields
    lines.forEach(line => {
        if (line.match(/date/i)) {
            result['Date'] = line.split(/date[:\s]+/i)[1] || '';
        } else if (line.match(/total/i)) {
            result['Total Amount'] = line.match(/\d+\.\d{2}/)?.[0] || '';
        }
    });

    // Fallback if specific keywords aren't found
    if (Object.keys(result).length === 0) {
        // A very basic parser, assuming "key: value" or "key value"
        lines.forEach(line => {
            const parts = line.split(/[:\s]+/);
            if (parts.length >= 2) {
                const key = parts[0];
                const value = parts.slice(1).join(' ');
                if (key && value) {
                    result[key] = value;
                }
            }
        });
    }

    return result;
};

// Send data to backend for processing
export const saveData = async (
    name: string, 
    email: string, 
    category: string, 
    data: Record<string, string>
): Promise<boolean> => {
  try {
    await axios.post('http://localhost:3001/api/submit', {
      name,
      email,
      category,
      data,
    });
    return true;
  } catch (error) {
    console.error('Failed to save data:', error);
    return false;
  }
}; 