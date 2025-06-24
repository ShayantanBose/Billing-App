import React, { useState } from 'react';
import './App.css';
import { processImageWithOCR, parseOCRText, saveData } from './services/OcrService';

function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [category, setCategory] = useState('Food');
  const [ocrResult, setOcrResult] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState(''); // To show messages like 'Processing...' or 'Saved!'

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
      setOcrResult(null); // Reset previous results
    }
  };

  const handleProcessImage = async () => {
    if (!image) {
      setStatus('Please select an image first.');
      return;
    }
    setStatus('Processing OCR...');
    try {
      const text = await processImageWithOCR(image);
      const data = parseOCRText(text);
      setOcrResult(data);
      setStatus('OCR processing complete. Review and submit.');
    } catch (error) {
      setStatus('Error processing image. Please try again.');
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email || !ocrResult) {
      setStatus('Please fill in all fields and process an image.');
      return;
    }
    setStatus('Saving data...');
    const success = await saveData(name, email, category, ocrResult);
    if (success) {
      setStatus('Data saved successfully!');
      // Reset form
      setName('');
      setEmail('');
      setImage(null);
      setOcrResult(null);
    } else {
      setStatus('Failed to save data. Please check the console.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bill OCR App</h1>
        <p>Upload a bill/receipt to extract information.</p>
      </header>
      <main>
        <div className="form-container">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          <button onClick={handleProcessImage} disabled={!image}>
            Process Image
          </button>
        </div>

        {status && <p className="status">{status}</p>}

        {ocrResult && (
          <div className="results-container">
            <h2>Extracted Data</h2>
            <pre>{JSON.stringify(ocrResult, null, 2)}</pre>
            <button onClick={handleSubmit}>Submit Data</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
