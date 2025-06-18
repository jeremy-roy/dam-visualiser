import os
import json
import numpy as np
from datetime import datetime
import pandas as pd
from meteostat import Point, Daily

def fetch_weather_data():
    """Fetch weather data for Cape Town using meteostat
    
    Returns:
        pandas.DataFrame: The weather data with temperature and precipitation
    """
    try:
        # Define Cape Town coordinates
        cape_town = Point(-33.9258, 18.4232)
        
        # Time range: last 20 years
        start = datetime(2000, 1, 1)
        end = datetime.today()
        
        print(f"Fetching weather data for Cape Town from {start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')}...")
        
        # Fetch daily weather data
        data = Daily(cape_town, start, end)
        data = data.fetch()
        
        # Filter for average temperature and precipitation
        df = data[['tavg', 'prcp']].copy()
        
        print("Successfully fetched weather data")
        return df
        
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        raise

def transform_weather_data(df):
    """Transform weather data into daily, monthly, and yearly timeseries
    
    Args:
        df (pandas.DataFrame): The weather data
    """
    try:
        # resample monthly
        monthly = df.resample('ME').mean()
        monthly['prcp'] = df['prcp'].resample('ME').sum()
        
        # resample yearly
        yearly = df.resample('YE').mean()
        yearly['prcp'] = df['prcp'].resample('YE').sum()
        
        # Add date columns for export
        df = df.copy()
        df = df.sort_index()
        df['date'] = df.index.strftime('%Y-%m-%d')
        daily_out = df.reset_index(drop=True)[['date', 'tavg', 'prcp']]
        
        monthly = monthly.copy()
        monthly['date'] = monthly.index.strftime('%Y-%m')
        monthly_out = monthly.reset_index(drop=True)[['date', 'tavg', 'prcp']]
        
        yearly = yearly.copy()
        yearly['date'] = yearly.index.strftime('%Y')
        yearly_out = yearly.reset_index(drop=True)[['date', 'tavg', 'prcp']]
        
        # Clean NaNs recursively
        def clean_nans(obj):
            if isinstance(obj, dict):
                return {k: clean_nans(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nans(v) for v in obj]
            elif isinstance(obj, float) and (np.isnan(v := obj)):
                return None
            return obj
        
        # Ensure output directory exists
        os.makedirs("output/timeseries", exist_ok=True)
        
        # Save the data
        with open("output/timeseries/cape_town_rainfall_daily.json", "w") as f:
            json.dump(clean_nans(daily_out.to_dict(orient='records')), f, indent=2)
        
        with open("output/timeseries/cape_town_rainfall_monthly.json", "w") as f:
            json.dump(clean_nans(monthly_out.to_dict(orient='records')), f, indent=2)
        
        with open("output/timeseries/cape_town_rainfall_yearly.json", "w") as f:
            json.dump(clean_nans(yearly_out.to_dict(orient='records')), f, indent=2)
        
        print("Successfully transformed and saved weather data")
        
    except Exception as e:
        print(f"Error transforming weather data: {e}")
        raise

if __name__ == "__main__":
    df = fetch_weather_data()
    transform_weather_data(df) 