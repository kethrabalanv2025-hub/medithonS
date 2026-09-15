const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const predictRoute = require('./routes/predict');
const healthRoute = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all incoming cross-origin requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files for seamless single-port full-stack execution
const frontendPath = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/predict', predictRoute);
app.use('/api/health', healthRoute);

// Fallback route for frontend client
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Medithon HealthGuard Full-Stack Server Running`);
  console.log(`  - Local:    http://localhost:${PORT}`);
  console.log(`  - API Base: http://localhost:${PORT}/api`);
  console.log(`  - Health:   http://localhost:${PORT}/api/health`);
  console.log(`  - Predict:  http://localhost:${PORT}/api/predict`);
  console.log(`====================================================`);
});

module.exports = { app, server };
