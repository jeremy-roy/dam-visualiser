import firebase_admin
from firebase_admin import credentials, storage
import json
import os
import traceback

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        cred = credentials.Certificate('firebase-key.json')
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'damvisualiser.firebasestorage.app'
            })
        print("Firebase initialized successfully")
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
        traceback.print_exc()

def upload_json_to_firebase(local_path, storage_path):
    """Upload a JSON file to Firebase Storage"""
    try:
        bucket = storage.bucket()
        print(f"Got bucket: {bucket.name}")
        
        blob = bucket.blob(storage_path)
        print(f"Created blob for path: {storage_path}")
        
        # Read and gzip the content
        import gzip
        import json
        with open(local_path, 'r') as f:
            content = f.read()
        
        # Compress content
        compressed = gzip.compress(content.encode('utf-8'))
        
        # Upload the compressed file
        print(f"Starting upload of {local_path}...")
        blob.upload_from_string(compressed)
        print(f"Completed upload of {local_path}")
        
        # Set metadata after upload
        blob.content_type = 'application/json'
        blob.content_encoding = 'gzip'
        blob.cache_control = 'public, max-age=3600'  # Cache for 1 hour
        blob.patch()  # Update the metadata
        
        # Make it publicly accessible
        blob.make_public()
        print(f"Made {storage_path} public with caching")
        
        url = blob.public_url
        print(f"Public URL: {url}")
        return url
    except Exception as e:
        print(f"Error in upload_json_to_firebase: {str(e)}")
        traceback.print_exc()
        raise

def upload_geojson():
    """Upload the GeoJSON file to Firebase Storage"""
    try:
        local_path = "output/Bulk_Water_Dams_Enriched.geojson"
        storage_path = "shapefiles/Bulk_Water_Dams_Enriched.geojson"
        
        if not os.path.exists(local_path):
            print(f"GeoJSON file not found: {local_path}")
            return
            
        public_url = upload_json_to_firebase(local_path, storage_path)
        print(f"Uploaded GeoJSON to {public_url}")
    except Exception as e:
        print(f"Error uploading GeoJSON: {str(e)}")

def upload_all_timeseries():
    """Upload all timeseries JSON files to Firebase Storage"""
    initialize_firebase()
    
    # Path to your JSON files
    input_dir = 'output/timeseries'
    
    if not os.path.exists(input_dir):
        print(f"Directory not found: {input_dir}")
        print(f"Current working directory: {os.getcwd()}")
        return
    
    # Upload each JSON file
    for filename in os.listdir(input_dir):
        if filename.endswith('.json'):
            local_path = os.path.join(input_dir, filename)
            storage_path = f'timeseries/{filename}'
            
            try:
                public_url = upload_json_to_firebase(local_path, storage_path)
                print(f'Uploaded {filename} to {public_url}')
            except Exception as e:
                print(f'Error uploading {filename}: {str(e)}')

if __name__ == '__main__':
    upload_all_timeseries()
    upload_geojson()
