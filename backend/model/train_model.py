import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import joblib

# 1. Train Classification Model (for Alerts)
# Features: [gasPPM, gasDetected (0 or 1), temperature, humidity]
# Target: 0 (Normal), 1 (Hazard)
data_clf = {
    'gasPPM': [200, 300, 800, 1200, 400, 250, 1500, 100, 50, 600],
    'gasDetected': [0, 0, 1, 1, 0, 0, 1, 0, 0, 1],
    'temperature': [25, 26, 35, 40, 28, 24, 45, 22, 21, 30],
    'humidity': [50, 55, 30, 20, 45, 60, 15, 65, 70, 40],
    'hazard': [0, 0, 1, 1, 0, 0, 1, 0, 0, 1]
}
df_clf = pd.DataFrame(data_clf)
X_clf = df_clf[['gasPPM', 'gasDetected', 'temperature', 'humidity']]
y_clf = df_clf['hazard']

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_clf, y_clf)
joblib.dump(clf, 'rf_model.pkl')
print("Classifier model saved as rf_model.pkl")

# 2. Train Regression Model (for Forecasting)
# Predict NEXT minute's Gas and Temp based on CURRENT Gas, Temp, Humidity
# Synthetic Time-Series Data Generation
n_samples = 1000
current_gas = np.random.uniform(0, 500, n_samples)
current_temp = np.random.uniform(20, 35, n_samples)
current_hum = np.random.uniform(30, 70, n_samples)

# Logic: 
# - Gas tends to drift or spike randomly but correlates with previous
# - Temp changes slowly
next_gas = []
next_temp = []

for i in range(n_samples):
    # Simulate Physics
    # If gas is high, it might stay high or increase
    g = current_gas[i]
    if g > 300:
         g_next = g + np.random.uniform(-10, 20) # Tendency to rise
    else:
         g_next = g + np.random.uniform(-5, 5) # Stable
    
    next_gas.append(max(0, g_next))
    
    # Temp
    t_next = current_temp[i] + np.random.uniform(-0.1, 0.1)
    next_temp.append(t_next)

df_reg = pd.DataFrame({
    'gasPPM': current_gas,
    'temperature': current_temp,
    'humidity': current_hum,
    'next_gas': next_gas,
    'next_temp': next_temp
})

X_reg = df_reg[['gasPPM', 'temperature', 'humidity']]
y_reg = df_reg[['next_gas', 'next_temp']]

reg = RandomForestRegressor(n_estimators=100, random_state=42)
reg.fit(X_reg, y_reg)
joblib.dump(reg, 'forecast_model.pkl')
print("Regressor forecast model saved as forecast_model.pkl")
