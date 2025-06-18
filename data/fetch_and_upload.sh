#!/bin/bash

# Activate the local jupyter-env
echo "Activating jupyter-env..."
source jupyter-env/bin/activate

# Run the data fetching scripts
echo "Fetching dam levels data..."
python3 fetch_dam_levels_data.py

echo "Fetching weather data..."
python3 fetch_weather_data.py

echo "Fetching service alerts data..."
python3 fetch_service_alerts.py

# Run the upload script
echo "Uploading data to Firebase..."
python3 upload_to_firebase.py

# Deactivate the virtual environment
echo "Deactivating jupyter-env..."
deactivate

echo "All done!" 