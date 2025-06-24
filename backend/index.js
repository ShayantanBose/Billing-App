const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001; // Port for the backend server

app.use(cors());
app.use(bodyParser.json());

// Endpoint to handle form submission
app.post('/api/submit', (req, res) => {
  const { name, email, category, data } = req.body;

  // In a real app, you would:
  // 1. Sanitize and validate the input
  // 2. Store the data in a database (e.g., MongoDB, PostgreSQL)
  // 3. Generate a CSV/Excel file
  // 4. Email the file to the user

  console.log('Received data:');
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Category:', category);
  console.log('Extracted Data:', data);

  // For now, just send a success response
  res.status(200).json({ message: 'Data received successfully!' });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
}); 