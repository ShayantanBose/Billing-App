import Tesseract from 'tesseract.js';
import axios from 'axios';

// Function to process image with Tesseract.js
export const processImageWithOCR = async (image: File): Promise<string> => {
  const { data: { text } } = await Tesseract.recognize(image, 'eng');
  return text;
};

// Parse OCR text into structured data
export const parseOCRText = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const lines = text.split('\n');

    // Simple parsing logic (can be improved with more robust regex)
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