const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

/**
 * Validates health metrics input data.
 * Returns { isValid: boolean, errors: string[] }
 */
function validateHealthData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  const { age, systolic_bp, glucose, bmi, heart_rate, activity_level, smoking_status } = data;

  const numAge = Number(age);
  if (isNaN(numAge) || numAge < 1 || numAge > 120) {
    errors.push('Age must be a valid number between 1 and 120.');
  }

  const numBp = Number(systolic_bp);
  if (isNaN(numBp) || numBp < 60 || numBp > 260) {
    errors.push('Systolic Blood Pressure must be a valid number between 60 and 260 mmHg.');
  }

  const numGlucose = Number(glucose);
  if (isNaN(numGlucose) || numGlucose < 40 || numGlucose > 500) {
    errors.push('Fasting Glucose must be a valid number between 40 and 500 mg/dL.');
  }

  const numBmi = Number(bmi);
  if (isNaN(numBmi) || numBmi < 10 || numBmi > 70) {
    errors.push('BMI must be a valid number between 10.0 and 70.0.');
  }

  const numHr = Number(heart_rate);
  if (isNaN(numHr) || numHr < 30 || numHr > 220) {
    errors.push('Heart Rate must be a valid number between 30 and 220 bpm.');
  }

  const validActivities = ['low', 'moderate', 'high'];
  if (activity_level && !validActivities.includes(String(activity_level).toLowerCase().trim())) {
    errors.push(`Activity level must be one of: ${validActivities.join(', ')}.`);
  }

  const validSmoking = ['never', 'former', 'current'];
  if (smoking_status && !validSmoking.includes(String(smoking_status).toLowerCase().trim())) {
    errors.push(`Smoking status must be one of: ${validSmoking.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * POST /api/predict
 * Receives health metrics, executes Python ML inference script via stdin/stdout IPC,
 * and responds with prediction results.
 */
router.post('/', (req, res) => {
  const startTime = Date.now();
  const inputData = req.body;

  // 1. Validate payload
  const validation = validateHealthData(inputData);
  if (!validation.isValid) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      errors: validation.errors
    });
  }

  // 2. Prepare Python process invocation
  const pythonScript = path.resolve(__dirname, '..', '..', 'ml', 'predict.py');
  const pythonCmd = process.env.PYTHON_PATH || 'python';

  let stdoutData = '';
  let stderrData = '';
  let isResponded = false;

  const pythonProcess = spawn(pythonCmd, [pythonScript], {
    env: process.env,
    windowsHide: true
  });

  // Timeout guard (8 seconds)
  const timeoutId = setTimeout(() => {
    if (!isResponded) {
      isResponded = true;
      pythonProcess.kill();
      return res.status(504).json({
        status: 'error',
        message: 'Prediction process timed out after 8 seconds.'
      });
    }
  }, 8000);

  // Send input data via stdin as JSON
  pythonProcess.stdin.write(JSON.stringify(inputData));
  pythonProcess.stdin.end();

  pythonProcess.stdout.on('data', (chunk) => {
    stdoutData += chunk.toString();
  });

  pythonProcess.stderr.on('data', (chunk) => {
    stderrData += chunk.toString();
  });

  pythonProcess.on('error', (err) => {
    clearTimeout(timeoutId);
    if (isResponded) return;
    isResponded = true;

    return res.status(500).json({
      status: 'error',
      message: `Failed to start Python prediction process: ${err.message}`,
      suggestion: 'Ensure Python is installed and accessible in the system PATH.'
    });
  });

  pythonProcess.on('close', (code) => {
    clearTimeout(timeoutId);
    if (isResponded) return;
    isResponded = true;

    const latencyMs = Date.now() - startTime;

    if (code !== 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Python prediction script exited with an error.',
        exitCode: code,
        details: stderrData.trim() || stdoutData.trim() || 'Unknown error occurred in ML script.'
      });
    }

    try {
      const parsedOutput = JSON.parse(stdoutData.trim());
      return res.status(200).json({
        status: 'success',
        latencyMs,
        result: parsedOutput.data || parsedOutput
      });
    } catch (parseErr) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to parse JSON response from Python ML process.',
        rawOutput: stdoutData.trim(),
        parseError: parseErr.message
      });
    }
  });
});

module.exports = router;
