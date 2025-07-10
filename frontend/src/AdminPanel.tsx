import React, { useState, useEffect } from 'react';

const AdminPanel: React.FC = () => {
  const [status, setStatus] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<{date: string, type: string, amount: string}[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/images')
      .then(res => res.json())
      .then(setImages);
    fetch('http://localhost:3001/api/expenses')
      .then(res => res.json())
      .then(setExpenses);
  }, []);

  const downloadFile = async (type: 'excel' | 'word') => {
    setStatus('');
    try {
      let endpoint = '';
      if (type === 'excel') endpoint = 'http://localhost:3001/api/download/excel';
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('File not found or server error');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel' ? 'expenses.xlsx' : 'receipts.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus('Download started.');
    } catch (err) {
      setStatus('Failed to download file.');
    }
  };

  const generateAndDownloadWord = async () => {
    setStatus('');
    try {
      const response = await fetch('http://localhost:3001/api/generate-word');
      if (!response.ok) {
        throw new Error('File not found or server error');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipts.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus('Word file generated and download started.');
    } catch (err) {
      setStatus('Failed to generate/download Word file.');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Admin Panel</h2>
      <button style={{ marginBottom: 16, width: 180 }} onClick={() => downloadFile('excel')}>
        Download Excel File
      </button>
      <button style={{ marginBottom: 16, width: 220, marginLeft: 16 }} onClick={generateAndDownloadWord}>
        Generate & Download Word File
      </button>
      {status && <p style={{ color: status.startsWith('Failed') ? 'red' : 'green' }}>{status}</p>}
      <h3>Uploaded Images</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        {images.map(img => (
          <img key={img} src={`http://localhost:3001/images/${img}`} alt={img} style={{ width: 100, height: 100, objectFit: 'cover', border: '1px solid #ccc', borderRadius: 4 }} />
        ))}
        {images.length === 0 && <p>No images uploaded yet.</p>}
      </div>
      <h3>Expense Entries</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Date</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Type</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.date}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.type}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.amount}</td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: 16 }}>No entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanel; 