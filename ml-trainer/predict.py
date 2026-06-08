import sys
import joblib
import numpy as np
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, 'property_valuation_model.pkl')
features_path = os.path.join(script_dir, 'feature_names.pkl')

# Check if model exists
if not os.path.exists(model_path):
    print("Error: Model not found. Please run train.py first.")
    sys.exit(1)

# Load model
model = joblib.load(model_path)

# Get features from command line
if len(sys.argv) < 2:
    print("Error: No features provided")
    sys.exit(1)

# Parse features
features = [float(x) for x in sys.argv[1:]]

# Check if we have the right number of features
try:
    feature_names = joblib.load(features_path)
    expected_features = len(feature_names)
    
    if len(features) != expected_features:
        print(f"Error: Expected {expected_features} features, got {len(features)}")
        sys.exit(1)
except:
    pass  # Continue without feature name check

# Make prediction
features_array = np.array(features).reshape(1, -1)
prediction = model.predict(features_array)[0]

# Output prediction
print(f"{prediction:.0f}")