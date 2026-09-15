# Medithon HealthGuard — Full-Stack Web Application

A decoupled, full-stack cardiometabolic risk prediction platform demonstrating seamless end-to-end communication across **Vanilla Frontend**, **Node.js/Express Backend**, and a **Python Machine Learning** engine.

---

## Architecture Overview

The system strictly enforces separation of concerns across three isolated layers:

```
+-------------------------------------------------------------------------+
|                           1. FRONTEND (Client)                          |
|  - frontend/index.html   (Semantic UI, Presets, SVG Risk Meter)         |
|  - frontend/style.css    (Dark Slate Glassmorphism, Micro-Animations)   |
|  - frontend/script.js    (Form Validation, Fetch API, Dynamic Rendering)|
+------------------------------------+------------------------------------+
                                     |
                         HTTP POST /api/predict
                         Content-Type: application/json
                                     v
+-------------------------------------------------------------------------+
|                       2. BACKEND (Node.js & Express)                    |
|  - backend/server.js            (Express bootstrap, CORS, Static Serve) |
|  - backend/routes/predict.js    (Input Validation & Python IPC Spawner) |
|  - backend/routes/health.js     (Uptime & Python Health Probe)          |
+------------------------------------+------------------------------------+
                                     |
                           JSON via stdin / stdout
                           child_process.spawn('python', ['ml/predict.py'])
                                     v
+-------------------------------------------------------------------------+
|                   3. MACHINE LEARNING (Python Engine)                   |
|  - ml/model.py                  (Model definition, weights, training)   |
|  - ml/predict.py                (Inference CLI & feature attribution)   |
|  - ml/model/health_model.json   (Persisted model configuration)         |
|  - ml/requirements.txt          (Python dependencies)                   |
+-------------------------------------------------------------------------+
```

### Complete End-to-End Workflow:
1. **User Input**: The user enters biometric metrics into the frontend form or selects one of three 1-click presets (*Optimal*, *Borderline*, *Elevated*).
2. **HTTP Request**: Vanilla JavaScript validates the inputs and issues an asynchronous `fetch()` POST request to `/api/predict` with JSON payload.
3. **Backend Validation**: Express.js checks all values against realistic physiological boundaries.
4. **Inter-Process Communication**: Express spawns the Python prediction script (`ml/predict.py`) via `child_process.spawn`, piping the JSON payload into Python's `stdin`.
5. **ML Prediction**: The Python engine loads `ml/model/health_model.json`, calculates the composite risk score (0-100%), determines risk tier, confidence, top driving biomarkers, and tailored lifestyle recommendations.
6. **JSON Response**: Python writes the result JSON to `stdout`, Express captures it, attaches latency telemetry, and sends HTTP 200 JSON back to the client.
7. **Dynamic Display**: The frontend animates the circular SVG gauge, updates category badges, visualizes feature attribution progress bars, and reveals actionable guidance.

---

## Directory Structure

```
medithonS/
├── frontend/
│   ├── index.html          # Semantic HTML5 user interface
│   ├── style.css           # Vanilla CSS with glassmorphism design system
│   └── script.js           # Vanilla JS controller & fetch API integration
├── backend/
│   ├── server.js           # Main Express application entrypoint
│   ├── package.json        # Node.js dependencies & scripts
│   └── routes/
│       ├── predict.js      # Predict API route with Python process spawn
│       └── health.js       # Health check API route
├── ml/
│   ├── model.py            # HealthRiskModel architecture & bootstrap trainer
│   ├── predict.py          # Standalone inference CLI script
│   ├── requirements.txt    # Python dependencies
│   └── model/
│       └── health_model.json # Trained model weights and baselines
└── README.md               # Full setup and execution guide
```

---

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18+ or v20+ LTS recommended)
- **Python** (v3.9+ or v3.13)

---

## Installation & Setup

### 1. Set Up Machine Learning Component (Python)

Navigate to the `ml/` directory or project root and install the dependencies:

```bash
# Optional: create and activate a virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install requirements
pip install -r ml/requirements.txt
```

Verify that the ML model artifact is initialized and test inference:

```bash
# Test the model training script
python ml/model.py

# Test the prediction CLI with sample JSON
python ml/predict.py '{"age": 35, "systolic_bp": 120, "glucose": 90, "bmi": 23.5, "heart_rate": 70, "activity_level": "moderate", "smoking_status": "never"}'
```

### 2. Set Up Backend Component (Node.js & Express)

Navigate to the `backend/` directory and install dependencies:

```bash
cd backend
npm install
```

---

## Running the Application Locally

### Option A: Unified Full-Stack Mode (Recommended)

The Express backend automatically serves the frontend static files from `../frontend`. You can run the entire application with a single command:

```bash
cd backend
npm start
```

Or for automatic live reload during development:

```bash
cd backend
npm run dev
```

Once started, open your browser and navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

---

### Option B: Decoupled Independent Execution

If you prefer to serve the frontend separately (e.g., using Python `http.server` or Live Server):

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```
   Backend will listen on `http://localhost:5000`. CORS is fully enabled.

2. **Serve Frontend**:
   ```bash
   cd frontend
   python -m http.server 3000
   ```
   Open `http://localhost:3000`. The frontend JavaScript automatically routes requests to `http://localhost:5000/api`.

---

## API Documentation

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Returns server uptime and confirms Python executable availability.
- **Sample Response**:
  ```json
  {
    "status": "online",
    "service": "Medithon HealthGuard API",
    "uptimeSeconds": 142,
    "environment": {
      "nodeVersion": "v20.18.0",
      "pythonAvailable": true,
      "pythonVersion": "Python 3.13.14",
      "platform": "win32"
    }
  }
  ```

### 2. Risk Prediction
- **Endpoint**: `POST /api/predict`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "age": 52,
    "systolic_bp": 142,
    "glucose": 135,
    "bmi": 28.4,
    "heart_rate": 82,
    "activity_level": "low",
    "smoking_status": "current"
  }
  ```
- **Sample Response**:
  ```json
  {
    "status": "success",
    "latencyMs": 48,
    "result": {
      "risk_score": 81.4,
      "risk_category": "High Risk",
      "urgency": "Clinical Evaluation Recommended",
      "theme_color": "#ef4444",
      "confidence": 0.98,
      "primary_drivers": [
        {
          "factor": "Systolic Blood Pressure",
          "value": "142 mmHg",
          "score": 82.0,
          "impact": 23.0,
          "severity": "High"
        },
        {
          "factor": "Fasting Glucose",
          "value": "135 mg/dL",
          "score": 83.6,
          "impact": 20.9,
          "severity": "High"
        },
        {
          "factor": "Body Mass Index (BMI)",
          "value": "28.4 kg/m²",
          "score": 55.4,
          "impact": 10.0,
          "severity": "Moderate"
        }
      ],
      "recommendations": [
        "Monitor blood pressure twice weekly and consider reducing dietary sodium.",
        "Schedule an HbA1c test and favor low-glycemic complex carbohydrates.",
        "Incorporate 150 minutes of moderate aerobic exercise per week."
      ]
    }
  }
  ```

---

## Security & Best Practices

- **Zero Hardcoded Secrets**: No passwords, private keys, or credentials are hardcoded anywhere in the repository.
- **Input Sanitization**: Strict physiological bounding checks prevent command injection, buffer abuse, or malformed data reaching the ML engine.
- **Timeout Protection**: Child process execution is guarded with an 8-second circuit breaker to prevent hanging server threads.
- **Pure Separation**: Zero framework dependencies (no React, Angular, Vue, or TypeScript) ensuring maximum portability and transparency.