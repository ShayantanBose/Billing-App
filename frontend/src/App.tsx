import React, { useState } from 'react';
import './App.css';
import { processImageWithOCR, parseOCRText, saveData } from './services/OcrService';
import AdminPanel from './AdminPanel';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

function MainApp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [category, setCategory] = useState('Food');
  const [ocrResult, setOcrResult] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
      setOcrResult(null);
      setDate('');
      setAmount('');
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
      setDate(data['Date'] || '');
      setAmount(data['Selected Price'] || data['Total Amount'] || '');
      setStatus('OCR processing complete. Review and submit.');
    } catch (error) {
      setStatus('Error processing image. Please try again.');
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!image || !date || !amount) {
      setStatus('Please process an image and review the extracted fields.');
      return;
    }
    setStatus('Saving data...');
    const success = await saveData(date, category, amount, image);
    if (success) {
      setStatus('Data saved successfully!');
      setImage(null);
      setOcrResult(null);
      setDate('');
      setAmount('');
    } else {
      setStatus('Failed to save data. Please check the console.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bill OCR App</h1>
        <p>Upload a bill/receipt to extract information.</p>
        <Link to="/admin" style={{ color: 'white', textDecoration: 'underline', position: 'absolute', right: 20, top: 20 }}>Admin Panel</Link>
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
            <div style={{ margin: '1rem 0' }}>
              <label>Date:&nbsp;
                <input type="text" value={date} onChange={e => setDate(e.target.value)} placeholder="Date" />
              </label>
              <br />
              <label>Amount:&nbsp;
                <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
              </label>
            </div>
            <button onClick={handleSubmit}>Submit Data</button>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
