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
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData && imageData.data) {
          const data = imageData.data as Uint8ClampedArray;
          for (let i = 0; i < data.length; i += 4) {
            if (
              typeof data[i] !== 'undefined' &&
              typeof data[i+1] !== 'undefined' &&
              typeof data[i+2] !== 'undefined'
            ) {
              const avg = Number((data[i] + data[i+1] + data[i+2]) / 3);
              data[i] = avg;
              data[i+1] = avg;
              data[i+2] = avg;
            }
          }
          if (ctx && imageData) {
            ctx.putImageData(imageData, 0, 0);
          }
        }
      }

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
    // await worker.load(); // Removed as it's deprecated in v6+
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

    // Log the raw OCR output for debugging
    console.log('RAW OCR:', text);
    console.log('[DEBUG] All OCR lines:');
    lines.forEach((line, idx) => console.log(`[${idx}] '${line}'`));

    let foundPrice = null;
    let maxCurrencyPrice = 0;
    let maxStandalonePrice = 0;
    let contextPrice = null;
    let contextPriceValue = 0;
    let bestDecimal = 0;

    // Context keywords
    const contextKeywords = /total|amount|paid|completed|fare|price|grand|final|net|received|charged|payment/i;
    // Currency patterns
    const currencyPattern = /(₹|Rs\.?|INR)\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/i;
    // Standalone number pattern
    const standalonePattern = /^([0-9]{2,6}(?:\.[0-9]{1,2})?)$/;

    // Step 1: Look for context lines with currency and amount
    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        if (typeof rawLine !== 'string') continue;
        const line = rawLine.trim();
        if (!line) continue;
        // If line has context keyword and a currency amount
        if (contextKeywords.test(line) && currencyPattern.test(line)) {
            const match = line.match(currencyPattern);
            if (match && match[2]) {
                const price = parseFloat(match[2]);
                if (price > contextPriceValue && price >= 10 && price <= 10000) {
                    contextPrice = match[2];
                    contextPriceValue = price;
                }
            }
        }
        // If line has context keyword and a standalone number
        if (contextKeywords.test(line) && standalonePattern.test(line)) {
            const match = line.match(standalonePattern);
            if (match && match[1]) {
                const price = parseFloat(match[1]);
                if (price > contextPriceValue && price >= 10 && price <= 10000) {
                    contextPrice = match[1];
                    contextPriceValue = price;
                }
            }
        }
    }

    // Step 2: Find the largest number with a currency symbol
    for (const line of lines) {
        const match = line.match(currencyPattern);
        if (match && match[2]) {
            const price = parseFloat(match[2]);
            if (price > maxCurrencyPrice && price >= 10 && price <= 10000) {
                maxCurrencyPrice = price;
            }
        }
    }

    // Step 3: Find the largest standalone number (not part of IDs, phone, or time)
    for (const line of lines) {
        const trimmed = line.trim();
        // Ignore lines that look like IDs, phone numbers, or times
        if (/\d{10,}/.test(trimmed) || /\d{1,2}:\d{2}/.test(trimmed)) continue;
        const match = trimmed.match(standalonePattern);
        if (match && match[1]) {
            const price = parseFloat(match[1]);
            if (price > maxStandalonePrice && price >= 10 && price <= 10000) {
                maxStandalonePrice = price;
            }
        }
    }

    // Step 4: Choose the best candidate
    if (contextPrice) {
        foundPrice = contextPrice;
        console.log('[DEBUG] Found price by context:', foundPrice);
    } else if (maxCurrencyPrice > 0) {
        foundPrice = maxCurrencyPrice.toString();
        console.log('[DEBUG] Found price by currency:', foundPrice);
    } else if (maxStandalonePrice > 0) {
        foundPrice = maxStandalonePrice.toString();
        console.log('[DEBUG] Found price by standalone:', foundPrice);
    }

    // Step 4b: Fallback - extract numbers embedded in text (prefer decimals)
    if (!foundPrice) {
        for (const line of lines) {
            // Ignore lines that look like IDs, phone numbers, or times
            if (/\d{10,}/.test(line) || /\d{1,2}:\d{2}/.test(line)) continue;
            // Find all numbers with optional decimals
            const matches = line.match(/([0-9]{2,6}(?:\.[0-9]{1,2})?)/g);
            if (matches) {
                for (const m of matches) {
                    const price = parseFloat(m);
                    if (price >= 10 && price <= 10000) {
                        if (m.includes('.') && price > bestDecimal) {
                            bestDecimal = price;
                        } else if (!m.includes('.') && price > bestDecimal) {
                            bestDecimal = price;
                        }
                    }
                }
            }
        }
    }

    // Step 4c: Try to fix missing decimal in price stuck to vehicle/model words
    if (!foundPrice || (foundPrice && !foundPrice.includes('.'))) {
        let fixedPrice = 0;
        for (const line of lines) {
            // Look for a 4-6 digit number stuck to a vehicle/model word (partial match, case-insensitive)
            const match = line.match(/([0-9]{4,6})(Bajaj|Compact|Wagon|Auto|Maruti|Suzuki|Ride|RE|Com|mpact|Go|Autor|Autoride|Cab|Car|Bike)/i);
            if (match) {
                const numStr = match[1];
                if (typeof numStr === 'string' && numStr.length >= 4) {
                    const price = parseFloat(numStr.slice(0, -2) + '.' + numStr.slice(-2));
                    if (price >= 10 && price <= 10000 && price > fixedPrice) {
                        fixedPrice = price;
                    }
                }
            }
        }
        if (fixedPrice > 0) {
            foundPrice = fixedPrice.toString();
            console.log('[DEBUG] Fixed price by inserting decimal:', foundPrice);
        }
    }

    // Set the found price in result
    if (foundPrice) {
        result['Selected Price'] = `₹ ${foundPrice}`;
        console.log('[DEBUG] Final Selected Price:', result['Selected Price']);
    }

    // --- DO NOT CHANGE DATE LOGIC ---
    for (const line of lines) {
        const dateMatch = line.match(/(\d{1,2}[\-/ ]?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-/ ]?\d{2,4})|(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})|(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/i);
        if (dateMatch && !result['Date']) {
            result['Date'] = dateMatch[0];
            break;
        }
    }

    return result;
};

// Send data to backend for processing
export const saveData = async (
    date: string,
    from: string,
    to: string,
    modeOfTravel: string,
    purpose: string,
    travelExpenses: string,
    foodS1: string,
    foodS2: string,
    foodS3: string,
    foodS4: string,
    foodS5: string,
    foodS6: string,
    misc: string,
    amount: string,
    billDetails: string,
    remarks: string,
    budgetHead: string,
    image: File
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('date', date);
    formData.append('from', from);
    formData.append('to', to);
    formData.append('modeOfTravel', modeOfTravel);
    formData.append('purpose', purpose);
    formData.append('travelExpenses', travelExpenses);
    formData.append('foodS1', foodS1);
    formData.append('foodS2', foodS2);
    formData.append('foodS3', foodS3);
    formData.append('foodS4', foodS4);
    formData.append('foodS5', foodS5);
    formData.append('foodS6', foodS6);
    formData.append('misc', misc);
    formData.append('amount', amount);
    formData.append('billDetails', billDetails);
    formData.append('remarks', remarks);
    formData.append('budgetHead', budgetHead);
    formData.append('image', image);
    await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      body: formData,
    });
    return true;
  } catch (error) {
    console.error('Failed to save data:', error);
    return false;
  }
}; 