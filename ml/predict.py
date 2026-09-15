#!/usr/bin/env python3
"""
predict.py - Inference CLI interface for HealthRiskModel.
Receives input JSON from stdin or command-line arguments,
computes cardiometabolic risk predictions, and writes JSON to stdout.
"""

import sys
import os
import json
import ast
from model import HealthRiskModel

def load_or_init_model():
    """Loads the model artifact or initializes it if missing."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "model", "health_model.json")

    if not os.path.exists(model_path):
        model = HealthRiskModel()
        model.save(model_path)
        return model
    return HealthRiskModel.load(model_path)

def get_input_payload():
    """Reads and parses input JSON payload from arguments or standard input."""
    raw_text = ""
    if len(sys.argv) > 1 and sys.argv[1].strip():
        # Joined arguments in case spaces were split
        raw_text = " ".join(sys.argv[1:]).strip()
    else:
        raw_text = sys.stdin.read().strip()

    if not raw_text:
        raise ValueError("No input data provided. Please pass JSON string via stdin or argument.")

    # Try standard json first
    try:
        return json.loads(raw_text)
    except Exception:
        pass

    # Fallback to ast literal_eval in case shell stripped quotes
    try:
        parsed = ast.literal_eval(raw_text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Clean up single quotes to double quotes if applicable
    cleaned = raw_text.replace("'", '"')
    return json.loads(cleaned)

def main():
    try:
        data = get_input_payload()
        model = load_or_init_model()
        prediction = model.predict(data)

        print(json.dumps({
            "status": "success",
            "data": prediction
        }))
        sys.exit(0)

    except json.JSONDecodeError as e:
        print(json.dumps({
            "status": "error",
            "message": f"Invalid JSON input: {str(e)}"
        }), file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
