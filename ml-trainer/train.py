import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os
import glob

# Find the most recent CSV file
exports_dir = "../exports"
csv_files = glob.glob(os.path.join(exports_dir, "dataset_*.csv"))

if not csv_files:
    print("No CSV files found. Please run: npx ts-node src/ml/generateDataset.ts")
    exit(1)

# Get the most recent file
latest_file = max(csv_files, key=os.path.getctime)
print(f"Loading: {latest_file}")

# Load dataset
data = pd.read_csv(latest_file)

print(f"Rows: {len(data)}")
print(f"Columns: {len(data.columns)}")

# Remove invalid rows
data = data.dropna()
print(f"Rows after dropping NA: {len(data)}")

if len(data) < 10:
    print(f"Warning: Only {len(data)} samples. Need at least 10 for meaningful training.")
    print("Please generate more synthetic data first.")

# Ensure label exists
if "label" not in data.columns:
    raise Exception("Missing label column")

# Split features/target
X = data.drop("label", axis=1)
y = data["label"]

# Convert everything to numeric
X = X.apply(pd.to_numeric, errors="coerce")
X = X.fillna(0)
y = pd.to_numeric(y, errors="coerce")
y = y.fillna(0)

n_samples = len(data)
print(f"Number of samples for training: {n_samples}")

if n_samples < 5:
    raise Exception(f"Insufficient data: Only {n_samples} samples")

# Split data
test_size = 0.2 if n_samples >= 20 else 0.3
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=test_size, random_state=42
)

print(f"Training samples: {len(X_train)}")
print(f"Test samples: {len(X_test)}")

# Train model
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=10,
    min_samples_split=2,
    random_state=42
)

model.fit(X_train, y_train)

# Evaluate
if len(X_test) > 0:
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    
    print(f"\nModel Performance:")
    print(f"MAE: {mae:,.0f} RWF")
    print(f"R² Score: {r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))

# Save model
model_path = "property_valuation_model.pkl"
joblib.dump(model, model_path)
print(f"\nModel saved successfully to {model_path}")

# Also save feature names
feature_names_path = "feature_names.pkl"
joblib.dump(list(X.columns), feature_names_path)
print(f"Feature names saved to {feature_names_path}")

print("\n✅ Training complete! Model is ready for use.")