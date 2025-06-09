// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGr0vOA1F_gxhdut1L9lNLXjNoEGNmTm0",
  authDomain: "damvisualiser.firebaseapp.com",
  projectId: "damvisualiser",
  storageBucket: "damvisualiser.firebasestorage.app",
  messagingSenderId: "618454062599",
  appId: "1:618454062599:web:8dc48a5f9f7bc6bb547354"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

// Helper function to fetch JSON from Firebase Storage
export async function fetchFromStorage(path) {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    
    // Try to get from cache first
    const cache = await caches.open('dam-data-cache');
    let response = await cache.match(url);
    
    if (!response) {
      console.log(`Cache miss for ${path}, fetching from network...`);
      // If not in cache, fetch from network
      response = await fetch(url, {
        headers: {
          'Accept-Encoding': 'gzip',
          'Accept': 'application/json'
        }
      });
      
      // Clone the response before caching (because response body can only be used once)
      const responseToCache = response.clone();
      await cache.put(url, responseToCache);
    } else {
      console.log(`Loading ${path} from cache`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    throw error;
  }
}
