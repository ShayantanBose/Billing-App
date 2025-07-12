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
    // Debug: log all lines
    console.log('[DEBUG] All OCR lines:');
    lines.forEach((line, idx) => console.log(`[${idx}] '${line}'`));

    let foundPrice = null;

    // 0.1 Special case: Look for currency symbol stuck to number (e.g., 'R40', '₹40', 'Rs40')
    for (const line of lines) {
      // Ignore lines that look like dates
      if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}/i.test(line)) continue;
      // Only match currency symbol at start of line or with space before number
      const match = line.match(/^(₹|Rs\.?|INR|rupees?|R|I|P)\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/i);
      if (!match) {
        // Try stuck-together, e.g., 'R40', '₹40', 'Rs40' at start of line
        const stuckMatch = line.match(/^(₹|Rs\.?|INR|rupees?|R|I|P)([0-9]{1,6}(?:\.[0-9]{1,2})?)/i);
        if (stuckMatch && stuckMatch[2] && parseFloat(stuckMatch[2]) > 10 && parseFloat(stuckMatch[2]) < 10000) {
          foundPrice = stuckMatch[2];
          console.log('[DEBUG] foundPrice set by stuck currency symbol rule:', foundPrice);
          break;
        }
      } else if (match[2] && parseFloat(match[2]) > 10 && parseFloat(match[2]) < 10000) {
        foundPrice = match[2];
        console.log('[DEBUG] foundPrice set by currency symbol rule:', foundPrice);
        break;
      }
    }

    // 0. Special case: Look for numbers stuck to keywords (e.g., '40710BajajRECompact')
    if (!foundPrice) {
      for (const line of lines) {
        const match = line.match(/([0-9]{4,6})(Bajaj|RE|Compact)/i);
        if (match && match[1]) {
          // Insert decimal before last two digits
          const numStr = match[1];
          if (numStr.length >= 4 && numStr.length <= 6) {
            const priceWithDecimal = `${parseInt(numStr.slice(0, -2), 10)}.${numStr.slice(-2)}`;
            const priceNum = parseFloat(priceWithDecimal);
            if (priceNum > 10 && priceNum < 10000) {
              foundPrice = priceWithDecimal;
              console.log('[DEBUG] foundPrice set by stuck-to-keyword rule:', foundPrice);
              break;
            }
          }
        }
      }
    }

    // Address-related keywords to ignore lines
    const addressKeywords = [
      "Plot", "Road", "Colony", "Park", "Osmania", "University", "Amberpet", "Hyderabad",
      "India", "Telangana", "VST", "Lakshmi", "Narasimha", "Bharani"
    ];

    // 1. Prefer lines that are just a price (possibly with a currency symbol), with decimal
    if (!foundPrice) {
    for (const line of lines) {
      const trimmed = line.trim();
        // Skip lines that look like addresses
        if (addressKeywords.some(word => trimmed.includes(word))) continue;
        // Look for price with currency and decimal
        const match = trimmed.match(/(₹|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{2,6}\.[0-9]{2})/i);
      if (
        match &&
        match[2] &&
        parseFloat(match[2]) > 10 &&
        parseFloat(match[2]) < 10000
      ) {
        foundPrice = match[2];
        break;
        }
      }
    }

    // 2. Prefer lines with 'total', 'fare', 'amount', 'price' and a price, or the next line after such keywords
    if (!foundPrice) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/(total|fare|amount|price)/i.test(line)) {
          // Try to find a price in the same line
          const match = line.match(/(₹|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{2,6}\.[0-9]{2})/i);
          if (
            match &&
            match[2] &&
            parseFloat(match[2]) > 10 &&
            parseFloat(match[2]) < 10000
          ) {
            foundPrice = match[2];
            break;
          }
          // If not found, try the next line
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextMatch = nextLine.match(/(₹|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{2,6}\.[0-9]{2})/i);
            if (
              nextMatch &&
              nextMatch[2] &&
              parseFloat(nextMatch[2]) > 10 &&
              parseFloat(nextMatch[2]) < 10000
            ) {
              foundPrice = nextMatch[2];
              break;
            }
          }
        }
      }
    }

    // 3. If not found, use the previous logic (first valid price in any line, skip address lines)
    if (!foundPrice) {
      for (const line of lines) {
        if (/\bID\b/i.test(line) || /^[A-Z0-9\s-]+$/.test(line.trim())) continue;
        if (addressKeywords.some(word => line.includes(word))) continue;
        const match = line.match(/(₹|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/i);
        if (
          match &&
          match[2] &&
          match[2].length <= 6 &&
          parseFloat(match[2]) > 10 &&
          parseFloat(match[2]) < 10000
        ) {
          foundPrice = match[2];
          break;
        }
      }
    }

    // 3.1 Prefer numbers that appear alone on a line (not part of a date or address)
    if (!foundPrice) {
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip lines that look like dates or addresses
        if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}/i.test(trimmed)) continue;
        if (addressKeywords.some(word => trimmed.includes(word))) continue;
        // Match a line that is just a number, optionally with a currency symbol
        const match = trimmed.match(/^(₹|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)$/i);
        if (
          match &&
          match[2] &&
          parseFloat(match[2]) > 10 &&
          parseFloat(match[2]) < 10000
        ) {
          foundPrice = match[2];
          break;
        }
      }
    }

    // 3.2 Prioritize lines that are mostly numeric or have a currency symbol
    if (!foundPrice) {
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip lines that look like dates or addresses
        if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}/i.test(trimmed)) continue;
        if (addressKeywords.some(word => trimmed.includes(word))) continue;
        // If line is only a number (optionally with currency symbol)
        let match = trimmed.match(/^(₹|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)$/i);
        if (match && match[2] && parseFloat(match[2]) > 10 && parseFloat(match[2]) < 10000) {
          foundPrice = match[2];
          break;
        }
        // If line has a currency symbol and a number anywhere
        match = trimmed.match(/(₹|Rs\.?|INR|rupees?|R|I|P)\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/i);
        if (match && match[2] && parseFloat(match[2]) > 10 && parseFloat(match[2]) < 10000) {
          foundPrice = match[2];
          break;
        }
        // If line is short and at least 80% digits (e.g., '60', '40710')
        if (trimmed.length <= 6) {
          const digitCount = (trimmed.match(/\d/g) || []).length;
          if (digitCount / trimmed.length >= 0.8) {
            const numVal = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
            if (!isNaN(numVal) && numVal > 10 && numVal < 10000) {
              foundPrice = numVal.toString();
              break;
            }
          }
        }
      }
    }

    // 3.3 Context-aware extraction for payment receipts
    if (!foundPrice) {
      // 1. After 'Paid Successfully', check next 1-2 lines for a number (including OCR misreads)
      for (let i = 0; i < lines.length; i++) {
        if (/Paid\s*Successfully/i.test(lines[i])) {
          for (let j = 1; j <= 2; j++) {
            if (i + j < lines.length) {
              const nextLine = lines[i + j].trim();
              // Match ₹, I, l, or 1 as possible currency symbols
              const match = nextLine.match(/^([₹Il1]|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)$/i);
              if (match && match[2] && parseFloat(match[2]) > 10 && parseFloat(match[2]) < 10000) {
                foundPrice = match[2];
                break;
              }
              // Also try stuck-together, e.g., 'I50', 'l50', '150'
              const stuckMatch = nextLine.match(/^([Il1])([0-9]{1,6}(?:\.[0-9]{1,2})?)$/i);
              if (stuckMatch && stuckMatch[2] && parseFloat(stuckMatch[2]) > 10 && parseFloat(stuckMatch[2]) < 10000) {
                foundPrice = stuckMatch[2];
                break;
              }
            }
          }
        }
        if (foundPrice) break;
      }
    }
    // 2. If a line contains 'Rupees' and a number in words, check the previous line for a number
    if (!foundPrice) {
      for (let i = 1; i < lines.length; i++) {
        if (/Rupees/i.test(lines[i])) {
          const prevLine = lines[i - 1].trim();
          const match = prevLine.match(/^([₹Il1]|Rs\.?|INR|rupees?|R|P)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)$/i);
          if (match && match[2] && parseFloat(match[2]) > 10 && parseFloat(match[2]) < 10000) {
            foundPrice = match[2];
            break;
          }
          // Also try stuck-together, e.g., 'I50', 'l50', '150'
          const stuckMatch = prevLine.match(/^([Il1])([0-9]{1,6}(?:\.[0-9]{1,2})?)$/i);
          if (stuckMatch && stuckMatch[2] && parseFloat(stuckMatch[2]) > 10 && parseFloat(stuckMatch[2]) < 10000) {
            foundPrice = stuckMatch[2];
            break;
          }
        }
      }
    }

    // 3.4 Standalone number before 'Completed' (check up to 3 lines ahead)
    if (!foundPrice) {
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Only consider lines that are just a number
        if (!/^[0-9]{1,6}(?:\.[0-9]{1,2})?$/.test(trimmed)) continue;
        const priceNum = parseFloat(trimmed);
        if (priceNum > 10 && priceNum < 10000) {
          // Check if 'Completed' is in the next 1-3 lines
          let foundCompleted = false;
          for (let j = 1; j <= 3; j++) {
            if (lines[i + j] && /Completed/i.test(lines[i + j])) {
              foundCompleted = true;
              break;
            }
          }
          if (foundCompleted) {
            foundPrice = trimmed;
            break;
          }
        }
      }
    }

    // 3.5 Standalone number, then item, then 'Completed' (for UPI/Paytm/PhonePe bills)
    if (!foundPrice) {
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Debug: log candidate lines
        console.log(`[DEBUG] Checking line ${i}: '${trimmed}'`);
        if (/^[0-9]{1,6}(?:\.[0-9]{1,2})?$/.test(trimmed)) {
          const priceNum = parseFloat(trimmed);
          if (priceNum > 10 && priceNum < 10000) {
            // Look for the next non-empty line as item or 'Completed', then next non-empty line(s) for 'Completed'
            let itemLine = '';
            let foundCompleted = false;
            let j = i + 1;
            // Find item line or 'Completed' (skip empty lines)
            while (j < lines.length) {
              const candidate = lines[j] ? lines[j].trim() : '';
              if (candidate) {
                if (/Completed/i.test(candidate)) {
                  foundCompleted = true;
                  break;
                }
                if (!/^[0-9]{1,6}(?:\.[0-9]{1,2})?$/.test(candidate)) {
                  itemLine = candidate;
                  break;
                }
              }
              j++;
            }
            // Now look for 'Completed' in the next 4 non-empty lines after itemLine (if not already found)
            let completedChecks = 0;
            let k = j + 1;
            while (!foundCompleted && k < lines.length && completedChecks < 4) {
              const candidate = lines[k] ? lines[k].trim() : '';
              if (candidate) {
                completedChecks++;
                if (/Completed/i.test(candidate)) {
                  foundCompleted = true;
                  break;
                }
              }
              k++;
            }
            // Debug: log what was found
            console.log(`[DEBUG] Price candidate: ${trimmed}, itemLine: '${itemLine}', foundCompleted: ${foundCompleted}`);
            if (foundCompleted) {
              foundPrice = trimmed;
              console.log('[DEBUG] foundPrice set by standalone number + (item) + Completed rule:', foundPrice);
              break;
            }
          }
        }
      }
    }

    // 3.6 Context-aware price extraction: ignore dates, prefer numbers near 'Completed', 'To', or item names
    if (!foundPrice) {
      let priceCandidates = [];
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Ignore empty lines
        if (!trimmed) continue;
        // Ignore lines that look like dates
        if (/\d{1,2}[A-Za-z]{3,}[0-9]{4}/.test(trimmed) || /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(trimmed)) continue;
        // If line is just a 2-4 digit number
        if (/^\d{2,4}$/.test(trimmed)) {
          let foundContext = false;
          // Look ahead for 'Completed', 'To ...', or item name
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const next = lines[j].trim();
            if (!next) continue;
            if (/Completed/i.test(next) || /^To\b/i.test(next) || /^[A-Za-z ]+$/.test(next)) {
              foundContext = true;
              break;
            }
            // Stop if next is another number (could be a list of items)
            if (/^\d{2,4}$/.test(next)) break;
          }
          // Or look behind for 'To ...'
          if (!foundContext && i > 0 && /^To\b/i.test(lines[i-1].trim())) foundContext = true;
          if (foundContext) priceCandidates.push({ value: trimmed, index: i });
        }
      }
      // Prefer the first candidate (closest to top)
      if (priceCandidates.length > 0) {
        foundPrice = priceCandidates[0].value;
        console.log('[DEBUG] foundPrice set by context-aware candidate rule:', foundPrice);
      }
    }

    // 3.7 Check for numbers after 'SelectedPrice' and before address-like lines
    if (!foundPrice) {
      let afterSelectedPrice = false;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (/SelectedPrice/i.test(trimmed)) {
          afterSelectedPrice = true;
          continue;
        }
        // Stop if we hit an address-like line (comma-separated, long, or with city/state)
        if (afterSelectedPrice && (trimmed.split(',').length > 2 || /Hyderabad|India|Telangana|Adda|Colony|Road|Street|Area|City|State|Pin|Code|\d{6}/i.test(trimmed))) {
          break;
        }
        // If after 'SelectedPrice', and line is just a number in valid range
        if (afterSelectedPrice && /^\d{2,6}(?:\.\d{1,2})?$/.test(trimmed)) {
          const priceNum = parseFloat(trimmed);
          if (priceNum > 10 && priceNum < 10000) {
            foundPrice = trimmed;
            console.log('[DEBUG] foundPrice set by SelectedPrice-before-address rule:', foundPrice);
            break;
          }
        }
      }
    }

    if (foundPrice) {
      result['Selected Price'] = `₹ ${foundPrice}`;
      console.log('[DEBUG] Selected Price set in result:', result['Selected Price']);
    } else {
      // 4. Search for 'SelectedPrice' followed by a 1-6 digit number (with decimal)
      const selectedPriceRegex = /SelectedPrice\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/i;
      const priceMatch = text.replace(/\s/g, '').match(selectedPriceRegex);
      if (priceMatch) {
        result['Selected Price'] = `₹ ${priceMatch[1]}`;
      } else {
        // 5. Fuzzy: look for lines starting with '2' followed by 2-5 digits (lowest priority)
        const fuzzyRupeeRegex = /(?:^|\n)2([0-9]{2,5})\b/;
        const fuzzyMatch = text.match(fuzzyRupeeRegex);
        if (fuzzyMatch) {
          result['Selected Price (fuzzy)'] = `₹${fuzzyMatch[1]}`;
        } else {
          // 6. Fallback: extract the largest valid number in the text (not in address lines)
          let maxNum = null;
          for (const line of lines) {
            if (addressKeywords.some(word => line.includes(word))) continue;
            const nums = line.match(/[0-9]{3,6}/g);
            if (nums) {
              for (const n of nums) {
                const numVal = parseInt(n, 10);
                if (numVal > 10 && numVal < 10000 && (!maxNum || numVal > maxNum)) {
                  maxNum = numVal;
                }
              }
            }
          }
          if (maxNum) {
            result['Selected Price (max fallback)'] = `₹ ${maxNum}`;
            console.log('[DEBUG] Selected Price (max fallback) set in result:', result['Selected Price (max fallback)']);
          }
        }
      }
    }

    // 5. Continue with your existing line-by-line parsing for other fields
    lines.forEach(line => {
        // Improved date extraction
        const dateMatch = line.match(/(\d{1,2}[\-/ ]?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-/ ]?\d{2,4})|(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})|(\d{4}[\-/]\d{1,2}[\-/]\d{1,2})/i);
        if (dateMatch && !result['Date']) {
            result['Date'] = dateMatch[0];
        } else if (line.match(/date/i) && !result['Date']) {
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
    date: string,
    type: string,
    amount: string,
    image: File
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('date', date);
    formData.append('type', type);
    formData.append('amount', amount);
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