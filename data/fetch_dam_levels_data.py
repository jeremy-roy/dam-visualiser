import os
from datetime import datetime
import requests

def fetch_dam_levels():
    """Fetch dam levels CSV from ArcGIS and save to dated folder"""
    
    # Create dated folder name
    today = datetime.now().strftime('%Y-%m-%d')
    output_dir = f"dam-data/{today}"
    
    # Create directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # ArcGIS URL for dam levels data
    url = "https://www.arcgis.com/sharing/rest/content/items/96a8ba830f7d46cf81cdc9169c5eef08/data"
    
    try:
        # Fetch the data
        print(f"Fetching dam levels data from ArcGIS...")
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for bad status codes
        
        # Save to file
        output_file = f"{output_dir}/Dam_Levels_from_2012.csv"
        with open(output_file, 'wb') as f:
            f.write(response.content)
        
        print(f"Successfully saved dam levels data to {output_file}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        raise

if __name__ == "__main__":
    fetch_dam_levels()
