import { Platform } from 'react-native';

// In a real app, we would use Tesseract.js or a backend service for OCR
// This is a mock implementation for demonstration purposes

// Mock function to process image with OCR
export const processImageWithOCR = async (imageUri: string): Promise<string> => {
  // In a real implementation, we would:
  // 1. Either use Tesseract.js directly if on web
  // 2. Or send the image to a backend service for processing
  
  return new Promise((resolve, reject) => {
    // Simulate processing delay
    setTimeout(() => {
      try {
        // This is where actual OCR would happen
        // For demo purposes, we'll return mock data
        const mockOCRResult = 
          "Sl. No. 14\n" +
          "Date: 24/05/2025\n" +
          "Station: Chicago\n" +
          "Mode of Travel: Flight\n" +
          "Purpose: Conference\n" +
          "Travel Expenses: 450.00\n" +
          "Food: 75.25\n" +
          "Miscellaneous: 30.00\n" +
          "Total Amount: 555.25";
          
        resolve(mockOCRResult);
      } catch (error) {
        reject(new Error('OCR processing failed'));
      }
    }, 2000);
  });
};

// Parse OCR text into structured data
export const parseOCRText = (text: string): Record<string, string> => {
  const lines = text.split('\n');
  const result: Record<string, string> = {};
  
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      result[key] = value;
    } else if (line.includes('Sl. No.')) {
      const slNoParts = line.split('Sl. No.');
      if (slNoParts.length >= 2) {
        result['Sl. No.'] = slNoParts[1].trim();
      }
    }
  });
  
  return result;
};

// Send data to backend for Excel update
export const saveToExcel = async (data: Record<string, string>, userName: string, phoneNumber: string): Promise<boolean> => {
  // In a real app, this would make an API call to a backend service
  
  return new Promise((resolve, reject) => {
    // Simulate API call
    setTimeout(() => {
      try {
        // This is where we would send data to the backend
        console.log('Saving data to Excel:', { data, userName, phoneNumber });
        
        // Simulate successful save
        resolve(true);
      } catch (error) {
        reject(new Error('Failed to save data to Excel'));
      }
    }, 1500);
  });
};