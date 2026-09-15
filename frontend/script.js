/**
 * Medithon HealthGuard - Frontend Application Logic
 * Pure Vanilla JavaScript (No frameworks)
 * Handles state, preset selection, API calls to Express.js, and dynamic ML visualization.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Determine API base URL (works both when served from Express or opened directly)
  const isDirectFile = window.location.protocol === 'file:';
  const API_BASE = isDirectFile ? 'http://localhost:5000/api' : '/api';

  // DOM Elements
  const form = document.getElementById('prediction-form');
  const btnSubmit = document.getElementById('btn-submit-predict');
  const btnSpinner = document.getElementById('btn-spinner-icon');
  const btnReset = document.getElementById('btn-reset-form');
  const alertBox = document.getElementById('form-alert-box');

  const statusContainer = document.getElementById('system-status-container');
  const statusPulse = document.getElementById('status-pulse-dot');
  const statusLabel = document.getElementById('status-text-label');

  const idleState = document.getElementById('results-idle-state');
  const activeState = document.getElementById('results-active-state');

  // Result Card Elements
  const resultLatency = document.getElementById('result-latency-pill');
  const gaugeProgress = document.getElementById('gauge-progress-circle');
  const gaugeScore = document.getElementById('gauge-score-value');
  const categoryBadge = document.getElementById('risk-category-badge');
  const urgencyLabel = document.getElementById('risk-urgency-text');
  const confidencePercent = document.getElementById('confidence-percentage');
  const confidenceFill = document.getElementById('confidence-fill-bar');
  const factorsContainer = document.getElementById('factors-list-container');
  const recommendationsContainer = document.getElementById('recommendations-list-container');
  const rawJsonOutput = document.getElementById('raw-json-output');
  const resultIconBadge = document.getElementById('result-icon-badge');

  const btnToggleJson = document.getElementById('btn-toggle-json');
  const inspectorContent = document.getElementById('inspector-content-box');

  // Presets Data Dictionary
  const PRESETS = {
    low: {
      age: 26,
      systolic_bp: 115,
      glucose: 84,
      bmi: 21.5,
      heart_rate: 64,
      activity_level: 'high',
      smoking_status: 'never'
    },
    moderate: {
      age: 48,
      systolic_bp: 128,
      glucose: 106,
      bmi: 26.8,
      heart_rate: 76,
      activity_level: 'moderate',
      smoking_status: 'former'
    },
    high: {
      age: 58,
      systolic_bp: 152,
      glucose: 145,
      bmi: 32.4,
      heart_rate: 88,
      activity_level: 'low',
      smoking_status: 'current'
    }
  };

  /**
   * Health Check: polls backend and updates live connection badge
   */
  async function checkBackendHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        statusPulse.className = 'status-pulse online';
        const pythonStatus = data.environment?.pythonAvailable ? 'Python ML Ready' : 'Python Offline';
        statusLabel.textContent = `Express Online • ${pythonStatus}`;
      } else {
        throw new Error('Health check responded with non-200');
      }
    } catch (err) {
      statusPulse.className = 'status-pulse error';
      statusLabel.textContent = 'Backend Offline (Start server on :5000)';
    }
  }

  // Run initial health check and refresh periodically
  checkBackendHealth();
  setInterval(checkBackendHealth, 15000);

  /**
   * Populates form inputs with a given preset profile
   */
  function applyPreset(presetKey) {
    const data = PRESETS[presetKey];
    if (!data) return;

    document.getElementById('input-age').value = data.age;
    document.getElementById('input-systolic-bp').value = data.systolic_bp;
    document.getElementById('input-glucose').value = data.glucose;
    document.getElementById('input-bmi').value = data.bmi;
    document.getElementById('input-heart-rate').value = data.heart_rate;

    const actRadio = document.querySelector(`input[name="activity_level"][value="${data.activity_level}"]`);
    if (actRadio) actRadio.checked = true;

    const smkRadio = document.querySelector(`input[name="smoking_status"][value="${data.smoking_status}"]`);
    if (smkRadio) smkRadio.checked = true;

    hideAlert();
  }

  // Attach click listeners to preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetType = btn.getAttribute('data-preset');
      applyPreset(presetType);
    });
  });

  /**
   * Form Reset Handler
   */
  btnReset.addEventListener('click', () => {
    form.reset();
    hideAlert();
    idleState.classList.remove('hidden');
    activeState.classList.add('hidden');
  });

  /**
   * Developer JSON Inspector Toggle
   */
  btnToggleJson.addEventListener('click', () => {
    btnToggleJson.classList.toggle('open');
    inspectorContent.classList.toggle('hidden');
  });

  /**
   * UI Alert Helpers
   */
  function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `form-alert ${type}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    alertBox.classList.add('hidden');
    alertBox.textContent = '';
  }

  /**
   * Sets loading state on submit button
   */
  function setLoading(isLoading) {
    if (isLoading) {
      btnSubmit.disabled = true;
      btnSpinner.classList.remove('hidden');
      btnSubmit.querySelector('.btn-text').textContent = 'Consulting Python ML...';
      btnSubmit.querySelector('.btn-arrow').style.display = 'none';
    } else {
      btnSubmit.disabled = false;
      btnSpinner.classList.add('hidden');
      btnSubmit.querySelector('.btn-text').textContent = 'Generate ML Prediction';
      btnSubmit.querySelector('.btn-arrow').style.display = 'block';
    }
  }

  /**
   * Collects and validates inputs from the DOM
   */
  function getFormData() {
    const age = parseFloat(document.getElementById('input-age').value);
    const systolic_bp = parseFloat(document.getElementById('input-systolic-bp').value);
    const glucose = parseFloat(document.getElementById('input-glucose').value);
    const bmi = parseFloat(document.getElementById('input-bmi').value);
    const heart_rate = parseFloat(document.getElementById('input-heart-rate').value);

    const activity_level = document.querySelector('input[name="activity_level"]:checked')?.value || 'moderate';
    const smoking_status = document.querySelector('input[name="smoking_status"]:checked')?.value || 'never';

    if (isNaN(age) || isNaN(systolic_bp) || isNaN(glucose) || isNaN(bmi) || isNaN(heart_rate)) {
      throw new Error('Please fill in all numerical biometric fields before submitting.');
    }

    return {
      age,
      systolic_bp,
      glucose,
      bmi,
      heart_rate,
      activity_level,
      smoking_status
    };
  }

  /**
   * Renders the ML prediction output into the visual dashboard
   */
  function renderPredictionResults(predictionData, latencyMs) {
    const result = predictionData.result || predictionData;

    // 1. Switch views from idle to active
    idleState.classList.add('hidden');
    activeState.classList.remove('hidden');

    // 2. Set Latency
    resultLatency.textContent = `${latencyMs}ms`;

    // 3. Update Circular SVG Gauge
    // Circumference for r=68 is 2 * Math.PI * 68 = ~427.26
    const circumference = 427.26;
    const score = Math.max(0, Math.min(100, result.risk_score || 0));
    const offset = circumference - (score / 100) * circumference;

    gaugeProgress.style.strokeDashoffset = offset;
    gaugeScore.textContent = `${score.toFixed(1)}%`;

    // 4. Update Risk Tier Badge & Urgency
    const category = (result.risk_category || 'Low Risk').toLowerCase();
    categoryBadge.textContent = result.risk_category;
    urgencyLabel.textContent = result.urgency || 'Routine health maintenance';

    // Theme coloring
    if (category.includes('high')) {
      categoryBadge.className = 'tier-badge high';
      gaugeProgress.style.stroke = '#f43f5e';
      resultIconBadge.className = 'card-icon';
      resultIconBadge.style.color = '#f43f5e';
      resultIconBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
      resultIconBadge.style.borderColor = 'rgba(244, 63, 94, 0.35)';
    } else if (category.includes('mod')) {
      categoryBadge.className = 'tier-badge moderate';
      gaugeProgress.style.stroke = '#f59e0b';
      resultIconBadge.className = 'card-icon';
      resultIconBadge.style.color = '#f59e0b';
      resultIconBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
      resultIconBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    } else {
      categoryBadge.className = 'tier-badge low';
      gaugeProgress.style.stroke = '#10b981';
      resultIconBadge.className = 'card-icon icon-emerald';
      resultIconBadge.style.color = '#10b981';
      resultIconBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
      resultIconBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    }

    // 5. Model Confidence
    const confValue = Math.round((result.confidence || 0.95) * 100);
    confidencePercent.textContent = `${confValue}%`;
    confidenceFill.style.width = `${confValue}%`;

    // 6. Primary Risk Drivers
    factorsContainer.innerHTML = '';
    const drivers = result.primary_drivers || result.all_factors?.slice(0, 3) || [];

    drivers.forEach(driver => {
      const itemEl = document.createElement('div');
      itemEl.className = 'factor-item';

      const barColor = driver.severity === 'High' ? '#f43f5e' : (driver.severity === 'Moderate' ? '#f59e0b' : '#10b981');
      const barWidth = Math.min(100, Math.max(10, driver.score));

      itemEl.innerHTML = `
        <div class="factor-header">
          <span class="factor-name">${driver.factor}</span>
          <span class="factor-value-tag">${driver.value} (${driver.severity})</span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="width: ${barWidth}%; background-color: ${barColor};"></div>
        </div>
      `;
      factorsContainer.appendChild(itemEl);
    });

    // 7. Recommendations
    recommendationsContainer.innerHTML = '';
    const recs = result.recommendations || ['Maintain standard healthy nutrition and regular exercise.'];
    recs.forEach(rec => {
      const li = document.createElement('li');
      li.textContent = rec;
      recommendationsContainer.appendChild(li);
    });

    // 8. Raw JSON output
    rawJsonOutput.textContent = JSON.stringify(predictionData, null, 2);
  }

  /**
   * Form Submission Event Handler
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    let payload;
    try {
      payload = getFormData();
    } catch (valErr) {
      showAlert(valErr.message, 'error');
      return;
    }

    setLoading(true);
    const startReqTime = performance.now();

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const latencyMs = Math.round(performance.now() - startReqTime);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.errors ? data.errors.join(' ') : (data.message || 'Server returned an error.');
        showAlert(`Error (${response.status}): ${errorMsg}`, 'error');
        return;
      }

      renderPredictionResults(data, latencyMs);
    } catch (networkErr) {
      console.error('Fetch error:', networkErr);
      showAlert(
        `Connection failure: Unable to reach Node.js backend at ${API_BASE}. Ensure the backend server is running with 'npm start' in the backend/ directory.`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  });

  // Pre-load default preset into form for convenience
  applyPreset('low');
});
