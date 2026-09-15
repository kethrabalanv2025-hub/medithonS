const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');

/**
 * GET /api/health
 * Returns status of Node.js backend and Python ML environment.
 */
router.get('/', (req, res) => {
  const pythonCmd = process.env.PYTHON_PATH || 'python';

  execFile(pythonCmd, ['--version'], (err, stdout, stderr) => {
    const pythonAvailable = !err;
    const pythonVersion = (stdout || stderr || '').trim();

    return res.status(200).json({
      status: 'online',
      service: 'Medithon HealthGuard API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: {
        nodeVersion: process.version,
        pythonAvailable,
        pythonVersion: pythonAvailable ? pythonVersion : 'Not detected',
        platform: process.platform
      }
    });
  });
});

module.exports = router;
