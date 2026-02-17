// Import the functions you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration (already here)
const firebaseConfig = {
  apiKey: "AIzaSyB7duBzy68Q11eXaelE5eoREhxZHUtpNPI",
  authDomain: "villahermia-management-system.firebaseapp.com",
  projectId: "villahermia-management-system",
  storageBucket: "villahermia-management-system.firebasestorage.app",
  messagingSenderId: "180979198172",
  appId: "1:180979198172:web:775ef1f36e9be27086ec19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you plan to use
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
