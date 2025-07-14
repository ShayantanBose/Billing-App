import React, { useState, useEffect } from 'react';

interface ExpenseData {
  date: string;
  type: string;
  amount: string;
  imageUrl?: string;
  imageName?: string;
  uploadTime?: string;
  status?: string;
}

interface SheetsStatus {
  isReady: boolean;
  hasSheet: boolean;
  spreadsheetId?: string;
}

const AdminPanel: React.FC = () => {
  const [status, setStatus] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus>({ isReady: false, hasSheet: false });
  const [sheetsUrl, setSheetsUrl] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:3001/api/images')
      .then(res => res.json())
      .then(setImages);
    fetch('http://localhost:3001/api/expenses')
      .then(res => res.json())
      .then(setExpenses);
    fetch('http://localhost:3001/api/sheets/status')
      .then(res => res.json())
      .then(setSheetsStatus);
    fetch('http://localhost:3001/api/sheets/url')
      .then(res => res.json())
      .then(data => setSheetsUrl(data.url))
      .catch(() => setSheetsUrl(''));
  }, []);

  const createNewSheet = async () => {
    setStatus('');
    try {
      const response = await fetch('http://localhost:3001/api/sheets/create', {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        setSheetsUrl(data.url);
        setSheetsStatus({ ...sheetsStatus, hasSheet: true, spreadsheetId: data.spreadsheetId });
        setStatus('Google Sheet created successfully!');
      } else {
        setStatus('Failed to create Google Sheet: ' + data.message);
      }
    } catch (err) {
      setStatus('Failed to create Google Sheet.');
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to delete all data? This cannot be undone.')) return;
    setStatus('Clearing data...');
    try {
      const res = await fetch('http://localhost:3001/api/sheets/clear', { method: 'POST' });
      if (res.ok) {
        setStatus('All data cleared.');
        // Refresh data
        fetch('http://localhost:3001/api/expenses')
          .then(res => res.json())
          .then(setExpenses);
        fetch('http://localhost:3001/api/images')
          .then(res => res.json())
          .then(setImages);
      } else {
        setStatus('Failed to clear data.');
      }
    } catch {
      setStatus('Failed to clear data.');
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Admin Panel</h2>
      
      {/* Google Sheets Status */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: sheetsStatus.isReady ? '#e8f5e8' : '#fff3cd', borderRadius: 8, border: `1px solid ${sheetsStatus.isReady ? '#4caf50' : '#ffc107'}` }}>
        <h3 style={{ margin: '0 0 12px 0', color: sheetsStatus.isReady ? '#2e7d32' : '#856404' }}>
          Google Sheets Status
        </h3>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>API Status:</strong> {sheetsStatus.isReady ? '✅ Connected' : '❌ Not Connected'}
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Sheet Status:</strong> {sheetsStatus.hasSheet ? '✅ Created' : '❌ Not Created'}
        </p>
        {sheetsUrl && (
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Sheet URL:</strong> <a href={sheetsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Open Google Sheet</a>
          </p>
        )}
        {!sheetsStatus.hasSheet && sheetsStatus.isReady && (
          <button 
            onClick={createNewSheet}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: 'pointer',
              marginTop: 8
            }}
          >
            Create New Google Sheet
          </button>
        )}
      </div>

      {status && <p style={{ color: status.startsWith('Failed') ? 'red' : 'green' }}>{status}</p>}
      
      <button
        onClick={handleClearData}
        style={{
          background: '#d32f2f',
          color: 'white',
          padding: '8px 16px',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          marginBottom: 16,
          fontWeight: 600
        }}
      >
        Clear All Data
      </button>

      <h3>Uploaded Images</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        {images.map(img => (
          <img key={img} src={`http://localhost:3001/images/${img}`} alt={img} style={{ width: 100, height: 100, objectFit: 'cover', border: '1px solid #ccc', borderRadius: 4 }} />
        ))}
        {images.length === 0 && <p>No images uploaded yet.</p>}
      </div>
      
      <h3>Expense Entries</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8, backgroundColor: '#f5f5f5' }}>Date</th>
            <th style={{ border: '1px solid #ccc', padding: 8, backgroundColor: '#f5f5f5' }}>Type</th>
            <th style={{ border: '1px solid #ccc', padding: 8, backgroundColor: '#f5f5f5' }}>Amount</th>
            <th style={{ border: '1px solid #ccc', padding: 8, backgroundColor: '#f5f5f5' }}>Image</th>
            <th style={{ border: '1px solid #ccc', padding: 8, backgroundColor: '#f5f5f5' }}>Upload Time</th>
            <th style={{ border: '1px solid #ccc', padding: 8, backgroundColor: '#f5f5f5' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.date}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.type}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.amount}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>
                {row.imageUrl ? (
                  <a href={row.imageUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>
                    View Image
                  </a>
                ) : '-'}
              </td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.uploadTime || '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.status || 'Active'}</td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16 }}>No entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanel; 