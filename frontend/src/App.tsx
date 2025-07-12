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
  const [showPreview, setShowPreview] = useState(false);

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
    setShowPreview(true);
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
          {showPreview && image && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <img src={URL.createObjectURL(image)} alt="Preview" style={{ maxWidth: 400, maxHeight: 400, display: 'block' }} />
            </div>
          )}
        </div>

        {status && <p className="status">{status}</p>}

        {ocrResult && (
          <div className="results-container" style={{
            marginTop: 24,
            maxWidth: 400,
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: 24,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
            border: '1px solid #e0e0e0',
          }}>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 20,
              color: '#222',
              letterSpacing: 0.2,
            }}>Extracted Data</h2>
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="extracted-amount" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#444' }}>Price</label>
                <input
                  id="extracted-amount"
                  type="text"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount"
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    borderRadius: 6,
                    border: '1px solid #bdbdbd',
                    background: '#f9f9f9',
                    color: '#222',
                    fontSize: 16,
                    fontWeight: 500,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="extracted-date" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#444' }}>Date</label>
                <input
                  id="extracted-date"
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  placeholder="Date"
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    borderRadius: 6,
                    border: '1px solid #bdbdbd',
                    background: '#f9f9f9',
                    color: '#222',
                    fontSize: 16,
                    fontWeight: 500,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
            </div>
              <button
                type="submit"
                style={{
                  padding: '12px 0',
                  width: '100%',
                  borderRadius: 6,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: 0.5,
                  marginTop: 8,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#1565c0')}
                onMouseOut={e => (e.currentTarget.style.background = '#1976d2')}
              >
                Submit Data
              </button>
            </form>
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
