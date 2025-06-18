import os
from datetime import datetime
import requests
import pandas as pd
import geopandas as gpd
import json
import numpy as np
from shapely.geometry import Point

def fetch_dam_levels():
    """Fetch dam levels CSV from ArcGIS and return as pandas DataFrame
    
    Returns:
        pandas.DataFrame: The dam levels data
    """
    
    # ArcGIS URL for dam levels data
    url = "https://www.arcgis.com/sharing/rest/content/items/96a8ba830f7d46cf81cdc9169c5eef08/data"
    
    try:
        # Fetch the data
        print(f"Fetching dam levels data from ArcGIS...")
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for bad status codes
        
        # Read directly into pandas DataFrame
        df = pd.read_csv(pd.io.common.BytesIO(response.content), encoding="ISO-8859-1")
        df['DATE'] = df['DATE'].str.replace('Sept', 'Sep', regex=False)
        df['DATE'] = pd.to_datetime(df['DATE'], format='%d-%b-%y')
        
        # Clean column names
        df.columns = df.columns.str.strip().str.replace(r"\s+", "", regex=True).str.lower()
        
        print("Successfully fetched and processed dam levels data")
        return df
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        raise

def transform_dam_levels(df, data_dir):
    """Transform dam levels data and save to output folder
    
    Args:
        df (pandas.DataFrame): The dam levels data
        data_dir (str): Path to the data directory (unused, kept for compatibility)
    """
    
    # Mapping from NAME in GeoJSON to CSV prefix (lowercase, no spaces)
    dam_name_mapping = {
        "Woodhead": "woodhead",
        "Hely-Hutchinson": "hely-hutchinson",
        "Lewis Gay": "lewisgay",
        "Kleinplaats": "kleinplaats",
        "Victoria": "victoria",
        "Alexandra": "alexandra",
        "De Villiers": "devilliers",
        "Steenbras Lower": "steenbraslower",
        "Steenbras Upper": "steenbrasupper",
        "Voëlvlei": "voëlvlei",
        "Wemmershoek": "wemmershoek",
        "Theewaterskloof": "theewaterskloof",
        "Berg River": "bergriver",
        "Land-en-Zeezicht Dam": "land-enzeezicht",
        "Big 5 Total": "totalstored-big5",
        "Big 6 Total": "totalstored-big6"
    }
    
    def build_timeseries(prefix):
        # Find all columns related to this dam (that start with the prefix)
        prefix_cols = [col for col in df.columns if col.startswith(prefix)]
        
        def find_col(keyword):
            # Look for a column that contains the keyword (case-insensitive)
            matches = [col for col in prefix_cols if keyword in col]
            return matches[0] if matches else None
        
        # Find matching columns
        height_col = find_col("height")
        storage_col = find_col("storage")
        current_col = find_col("current")
        last_year_col = find_col("lastyear")
        
        # If we find no relevant columns, return empty
        if not any([height_col, storage_col, current_col, last_year_col]):
            return [], None
        
        # Build DataFrame
        cols = {'date': 'date'}
        if height_col: cols[height_col] = 'height_m'
        if storage_col: cols[storage_col] = 'storage_ml'
        if current_col: cols[current_col] = 'percent_full'
        if last_year_col: cols[last_year_col] = 'last_year_percent_full'
        
        col_keys = list(cols.keys())
        if 'date' not in col_keys:
            col_keys = ['date'] + col_keys
        ts = df[col_keys].copy()
        ts.rename(columns=cols, inplace=True)
        
        # Ensure numeric columns are truly numeric
        for col in ['height_m', 'storage_ml', 'percent_full', 'last_year_percent_full']:
            if col in ts.columns:
                ts[col] = pd.to_numeric(ts[col], errors='coerce')
        
        # format nulls
        ts = ts.where(pd.notnull(ts), None)
        
        return ts
    
    # Create output containers
    dam_ts_daily = {}
    dam_ts_monthly = {}
    dam_ts_yearly = {}
    
    for dam_name, prefix in dam_name_mapping.items():
        df_ts = build_timeseries(prefix)
        if df_ts is None or df_ts.empty:
            print(f'No data set found for {dam_name}')
            continue
        
        df_ts['date'] = pd.to_datetime(df_ts['date'])
        
        # DAILY
        df_ts_sorted = df_ts.sort_values('date')
        df_ts_sorted = df_ts_sorted.round(2)
        df_ts_sorted['date'] = df_ts_sorted['date'].dt.strftime('%Y-%m-%d')
        dam_ts_daily[prefix] = df_ts_sorted.where(pd.notnull(df_ts_sorted), None).to_dict(orient='records')
        
        # MONTHLY
        monthly = df_ts.resample('ME', on='date').mean(numeric_only=True).reset_index()
        monthly = monthly.round(2)
        monthly['date'] = monthly['date'].dt.strftime('%Y-%m')
        dam_ts_monthly[prefix] = monthly.where(pd.notnull(monthly), None).to_dict(orient='records')
        
        # YEARLY
        yearly = df_ts.resample('YE', on='date').mean(numeric_only=True).reset_index()
        yearly = yearly.round(2)
        yearly['date'] = yearly['date'].dt.strftime('%Y')
        dam_ts_yearly[prefix] = yearly.where(pd.notnull(yearly), None).to_dict(orient='records')
    
    # Clean NaNs recursively
    def clean_nans(obj):
        if isinstance(obj, dict):
            return {k: clean_nans(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_nans(v) for v in obj]
        elif isinstance(obj, float) and (np.isnan(v := obj)):
            return None
        return obj
    
    # Save Timeseries data
    os.makedirs("output/timeseries", exist_ok=True)
    
    with open("output/timeseries/dam_levels_daily.json", "w") as f:
        json.dump(clean_nans(dam_ts_daily), f, indent=2)
    
    with open("output/timeseries/dam_levels_monthly.json", "w") as f:
        json.dump(clean_nans(dam_ts_monthly), f, indent=2)
    
    with open("output/timeseries/dam_levels_yearly.json", "w") as f:
        json.dump(clean_nans(dam_ts_yearly), f, indent=2)
    
    print("Successfully transformed and saved dam levels data")

if __name__ == "__main__":
    df = fetch_dam_levels()
    transform_dam_levels(df, None)  # data_dir is no longer needed
