import requests
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import time

def geocode_location(location: str, area: str) -> Optional[Dict[str, float]]:
    """
    Geocode a location using Google Maps Geocoding API
    Returns a dictionary with lat and lng if successful, None otherwise
    """
    try:
        # Load API key from environment or config
        api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not api_key:
            print("Warning: GOOGLE_MAPS_API_KEY not found in environment variables")
            return None
            
        # Combine location and area for better results
        search_text = f"{location}, {area}"
        
        # Prepare the request
        base_url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": search_text,
            "key": api_key,
            "region": "za"  # Bias results to South Africa
        }
        
        # Make the request
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        
        # Parse the response
        result = response.json()
        
        if result["status"] == "OK" and result["results"]:
            location = result["results"][0]["geometry"]["location"]
            return {
                "lat": location["lat"],
                "lng": location["lng"]
            }
        
        return None
        
    except Exception as e:
        print(f"Error geocoding location '{location}, {area}': {str(e)}")
        return None

def fetch_service_alerts():
    """Fetch both planned and unplanned service alerts from the CCT Data Science API"""
    
    # URLs for the service alerts
    urls = {
        'unplanned': 'https://service-alerts.cct-datascience.xyz/coct-service_alerts-current-unplanned.json',
        'planned': 'https://service-alerts.cct-datascience.xyz/coct-service_alerts-current-planned.json'
    }
    
    # Dictionary to store our results
    alerts_data = {}
    
    # Fetch data from both endpoints
    for alert_type, url in urls.items():
        try:
            print(f"Fetching {alert_type} service alerts...")
            response = requests.get(url)
            response.raise_for_status()  # Raise an exception for bad status codes
            
            alerts_data[alert_type] = response.json()
            print(f"Successfully fetched {alert_type} service alerts")
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {alert_type} service alerts: {str(e)}")
            alerts_data[alert_type] = None
    
    return alerts_data

def load_existing_alerts(alert_type):
    """Load the most recent alerts file of a given type"""
    output_dir = Path('service-alerts-data')
    if not output_dir.exists():
        return []
    
    # Find the most recent file for this alert type
    pattern = f'service_alerts_{alert_type}_*.json'
    files = list(output_dir.glob(pattern))
    
    if not files:
        return []
        
    # Get the most recent file
    latest_file = max(files)
    
    try:
        with open(latest_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading existing {alert_type} alerts: {str(e)}")
        return []

def add_coordinates_to_alert(alert: Dict) -> Dict:
    """Add coordinates to an alert if they don't exist"""
    if "coordinates" not in alert:
        if alert["location"] and alert["area"]:
            coords = geocode_location(alert["location"], alert["area"])
            if coords:
                alert["coordinates"] = coords
            else:
                alert["coordinates"] = {"lat": None, "lng": None}
            # Add a small delay to avoid hitting API rate limits
            time.sleep(0.1)
        else:
            # If location or area is missing, set null coordinates
            alert["coordinates"] = {"lat": None, "lng": None}
    return alert

def merge_alerts(existing_alerts: List[Dict], new_alerts: List[Dict]) -> List[Dict]:
    """Merge new alerts with existing alerts based on Id and add coordinates if missing"""
    if not new_alerts:
        return existing_alerts
        
    # Create a dictionary of existing alerts by Id
    alerts_dict = {alert["Id"]: alert for alert in existing_alerts}
    
    # Update with new alerts
    for alert in new_alerts:
        alerts_dict[alert["Id"]] = alert
    
    # Add coordinates to any alerts that don't have them
    for alert_id, alert in alerts_dict.items():
        if "coordinates" not in alert:
            alerts_dict[alert_id] = add_coordinates_to_alert(alert)
    
    # Convert back to list and sort by Id
    merged_alerts = list(alerts_dict.values())
    merged_alerts.sort(key=lambda x: x["Id"], reverse=True)
    
    return merged_alerts

def cleanup_old_files(output_dir: Path, alert_type: str, keep_file: Path):
    """Remove all files for the given alert type except the one to keep"""
    pattern = f'service_alerts_{alert_type}_*.json'
    for file in output_dir.glob(pattern):
        if file != keep_file:
            try:
                file.unlink()
                print(f"Removed old file: {file}")
            except Exception as e:
                print(f"Error removing file {file}: {str(e)}")

def save_alerts_to_file(alerts_data):
    """Save the merged alerts data to JSON files, keeping only the latest version"""
    output_dir = Path('service-alerts-data')
    output_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    
    for alert_type, new_alerts in alerts_data.items():
        if new_alerts is not None:
            # Load existing alerts
            existing_alerts = load_existing_alerts(alert_type)
            
            # Merge with new alerts
            merged_alerts = merge_alerts(existing_alerts, new_alerts)
            
            # Save merged alerts to new file
            filename = output_dir / f"service_alerts_{alert_type}_{timestamp}.json"
            try:
                with open(filename, 'w') as f:
                    json.dump(merged_alerts, f, indent=2)
                print(f"Saved merged {alert_type} alerts to {filename}")
                
                # Clean up old files after successful save
                cleanup_old_files(output_dir, alert_type, filename)
            except Exception as e:
                print(f"Error saving {alert_type} alerts: {str(e)}")

if __name__ == '__main__':
    # Fetch the alerts
    alerts = fetch_service_alerts()
    
    # Save them to files
    save_alerts_to_file(alerts)
