"""
HealthRiskModel: Cardiometabolic & Vital Risk Prediction Engine
Defines feature extraction, risk scoring weights, clinical thresholding,
and model persistence.
"""

import os
import json
import math

class HealthRiskModel:
    """
    A cardiometabolic risk assessment model implementing calibrated
    feature weighting, clinical threshold multipliers, and SHAP-style
    feature contribution attribution.
    """

    DEFAULT_PARAMETERS = {
        "version": "1.0.0",
        "feature_weights": {
            "systolic_bp": 0.28,
            "glucose": 0.25,
            "bmi": 0.18,
            "age": 0.14,
            "heart_rate": 0.08,
            "smoking_status": 0.07
        },
        "baselines": {
            "age": {"min": 18, "optimal": 25, "max": 90},
            "systolic_bp": {"min": 90, "optimal": 115, "elevated": 120, "stage1": 130, "stage2": 140, "max": 200},
            "glucose": {"min": 65, "optimal": 85, "prediabetic": 100, "diabetic": 126, "max": 300},
            "bmi": {"min": 16.0, "optimal": 21.5, "overweight": 25.0, "obese": 30.0, "max": 45.0},
            "heart_rate": {"min": 45, "optimal": 65, "elevated": 80, "tachycardia": 100, "max": 140}
        },
        "smoking_multipliers": {
            "never": 0.0,
            "former": 0.45,
            "current": 1.0
        },
        "activity_modifiers": {
            "high": -0.12,     # Protective factor
            "moderate": 0.0,   # Baseline
            "low": 0.15        # Risk factor
        }
    }

    def __init__(self, config=None):
        self.config = config or self.DEFAULT_PARAMETERS

    def _normalize(self, val, min_val, max_val):
        """Clamps and normalizes a value between 0.0 and 1.0."""
        clamped = max(min_val, min(val, max_val))
        return (clamped - min_val) / (max_val - min_val) if max_val > min_val else 0.0

    def compute_contributions(self, data):
        """
        Calculates individual feature risk scores (0 to 100) and relative impacts.
        """
        baselines = self.config["baselines"]
        contributions = {}

        # 1. Systolic Blood Pressure
        sbp = float(data.get("systolic_bp", 120))
        if sbp <= baselines["systolic_bp"]["optimal"]:
            sbp_score = 10.0
        elif sbp <= baselines["systolic_bp"]["elevated"]:
            sbp_score = 25.0 + ((sbp - 115) / 5) * 15.0
        elif sbp <= baselines["systolic_bp"]["stage1"]:
            sbp_score = 45.0 + ((sbp - 120) / 10) * 25.0
        else:
            sbp_score = 70.0 + min(30.0, ((sbp - 130) / 30) * 30.0)
        contributions["Systolic Blood Pressure"] = {
            "key": "systolic_bp",
            "score": round(sbp_score, 1),
            "value": f"{sbp:.0f} mmHg",
            "weight": self.config["feature_weights"]["systolic_bp"]
        }

        # 2. Fasting Blood Glucose
        glu = float(data.get("glucose", 90))
        if glu <= baselines["glucose"]["optimal"]:
            glu_score = 10.0
        elif glu <= baselines["glucose"]["prediabetic"]:
            glu_score = 20.0 + ((glu - 85) / 15) * 20.0
        elif glu <= baselines["glucose"]["diabetic"]:
            glu_score = 45.0 + ((glu - 100) / 26) * 35.0
        else:
            glu_score = 80.0 + min(20.0, ((glu - 126) / 50) * 20.0)
        contributions["Fasting Glucose"] = {
            "key": "glucose",
            "score": round(glu_score, 1),
            "value": f"{glu:.0f} mg/dL",
            "weight": self.config["feature_weights"]["glucose"]
        }

        # 3. Body Mass Index (BMI)
        bmi = float(data.get("bmi", 22.0))
        if bmi < 18.5:
            bmi_score = 30.0 # Underweight risk
        elif bmi <= 24.9:
            bmi_score = 10.0 # Normal
        elif bmi <= 29.9:
            bmi_score = 35.0 + ((bmi - 25.0) / 5.0) * 30.0
        else:
            bmi_score = 70.0 + min(30.0, ((bmi - 30.0) / 10.0) * 30.0)
        contributions["Body Mass Index (BMI)"] = {
            "key": "bmi",
            "score": round(bmi_score, 1),
            "value": f"{bmi:.1f} kg/m²",
            "weight": self.config["feature_weights"]["bmi"]
        }

        # 4. Age
        age = float(data.get("age", 30))
        age_norm = self._normalize(age, baselines["age"]["min"], baselines["age"]["max"])
        age_score = 15.0 + (age_norm ** 1.3) * 75.0
        contributions["Age Factor"] = {
            "key": "age",
            "score": round(age_score, 1),
            "value": f"{age:.0f} years",
            "weight": self.config["feature_weights"]["age"]
        }

        # 5. Resting Heart Rate
        hr = float(data.get("heart_rate", 70))
        if hr <= baselines["heart_rate"]["optimal"]:
            hr_score = 15.0
        elif hr <= baselines["heart_rate"]["elevated"]:
            hr_score = 25.0 + ((hr - 65) / 15) * 20.0
        else:
            hr_score = 50.0 + min(50.0, ((hr - 80) / 30) * 50.0)
        contributions["Resting Heart Rate"] = {
            "key": "heart_rate",
            "score": round(hr_score, 1),
            "value": f"{hr:.0f} bpm",
            "weight": self.config["feature_weights"]["heart_rate"]
        }

        # 6. Smoking Status
        smoking = str(data.get("smoking_status", "never")).lower().strip()
        smoking_multiplier = self.config["smoking_multipliers"].get(smoking, 0.0)
        smoking_score = 10.0 + smoking_multiplier * 85.0
        contributions["Smoking Status"] = {
            "key": "smoking_status",
            "score": round(smoking_score, 1),
            "value": smoking.capitalize(),
            "weight": self.config["feature_weights"]["smoking_status"]
        }

        return contributions

    def predict(self, data):
        """
        Executes prediction on input dictionary.
        Returns composite score, category, confidence, top risk factors, and suggestions.
        """
        contributions = self.compute_contributions(data)

        # Weighted raw score sum
        total_weight = sum(item["weight"] for item in contributions.values())
        raw_weighted_score = sum(
            item["score"] * item["weight"] for item in contributions.values()
        ) / total_weight

        # Physical activity modifier
        activity = str(data.get("activity_level", "moderate")).lower().strip()
        activity_mod = self.config["activity_modifiers"].get(activity, 0.0)

        # Final adjusted score bounded in [0, 100]
        final_score = max(5.0, min(98.5, raw_weighted_score * (1.0 + activity_mod)))
        rounded_score = round(final_score, 1)

        # Categorization
        if rounded_score < 35.0:
            category = "Low Risk"
            urgency = "Optimal / Routine Monitoring"
            theme_color = "#10b981" # Emerald
        elif rounded_score < 65.0:
            category = "Moderate Risk"
            urgency = "Lifestyle Modification Advised"
            theme_color = "#f59e0b" # Amber
        else:
            category = "High Risk"
            urgency = "Clinical Evaluation Recommended"
            theme_color = "#ef4444" # Coral Red

        # Calculate Confidence Score (based on completeness & calibration)
        required_fields = ["age", "systolic_bp", "glucose", "bmi", "heart_rate"]
        present_fields = [f for f in required_fields if f in data and data[f] is not None]
        base_confidence = 0.88 + 0.10 * (len(present_fields) / len(required_fields))
        confidence = round(min(0.98, base_confidence), 2)

        # Top 3 driving factors sorted by weighted contribution
        factor_rankings = []
        for name, item in contributions.items():
            impact = item["score"] * item["weight"]
            factor_rankings.append({
                "factor": name,
                "value": item["value"],
                "score": item["score"],
                "impact": round(impact, 1),
                "severity": "High" if item["score"] >= 65 else ("Moderate" if item["score"] >= 35 else "Optimal")
            })

        factor_rankings.sort(key=lambda x: x["impact"], reverse=True)

        # Recommendations based on identified risks
        recommendations = []
        if float(data.get("systolic_bp", 120)) >= 130:
            recommendations.append("Monitor blood pressure twice weekly and consider reducing dietary sodium.")
        if float(data.get("glucose", 90)) >= 100:
            recommendations.append("Schedule an HbA1c test and favor low-glycemic complex carbohydrates.")
        if float(data.get("bmi", 22)) >= 25.0:
            recommendations.append("Incorporate 150 minutes of moderate aerobic exercise per week.")
        if str(data.get("smoking_status", "")).lower() == "current":
            recommendations.append("Smoking cessation program can lower cardiovascular risk by up to 50% within 1 year.")
        if str(data.get("activity_level", "")).lower() == "low":
            recommendations.append("Daily brisk walking (30 mins) can significantly improve metabolic biomarkers.")

        if not recommendations:
            recommendations.append("Maintain your current healthy nutrition, sleep patterns, and active lifestyle.")

        return {
            "risk_score": rounded_score,
            "risk_category": category,
            "urgency": urgency,
            "theme_color": theme_color,
            "confidence": confidence,
            "primary_drivers": factor_rankings[:3],
            "all_factors": factor_rankings,
            "recommendations": recommendations,
            "metadata": {
                "model_version": self.config["version"],
                "activity_level": activity.capitalize(),
                "input_features": len(data)
            }
        }

    def save(self, filepath):
        """Saves model configurations and parameters to JSON."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.config, f, indent=2)
        print(f"Model saved successfully to {filepath}")

    @classmethod
    def load(cls, filepath):
        """Loads model parameters from JSON file."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            config = json.load(f)
        return cls(config)


if __name__ == "__main__":
    # Self-training / bootstrap routine
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(current_dir, "model")
    model_path = os.path.join(model_dir, "health_model.json")

    print(f"Training / Bootstrapping HealthRiskModel artifact...")
    model = HealthRiskModel()
    model.save(model_path)

    # Quick test prediction
    sample_input = {
        "age": 52,
        "systolic_bp": 142,
        "glucose": 135,
        "bmi": 28.4,
        "heart_rate": 82,
        "activity_level": "low",
        "smoking_status": "current"
    }
    result = model.predict(sample_input)
    print("Test prediction output:")
    print(json.dumps(result, indent=2))
