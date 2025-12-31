// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'test-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'test-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'test-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'test-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'test-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'test-app-id',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'test-measurement-id'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let analytics;

// Initialize analytics only in production
if (import.meta.env.PROD) {
  analytics = getAnalytics(app);
}

// Authentication providers
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    // The signed-in user info.
    const user = result.user;
    return { user, token };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore functions
export const addUserData = async (userId, data) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error adding user data:", error);
    throw error;
  }
};

export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

export const addGeneratedRepo = async (userId, repoData) => {
  try {
    const reposCollection = collection(db, "users", userId, "repos");
    const docRef = await addDoc(reposCollection, {
      ...repoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding generated repo:", error);
    throw error;
  }
};

export const getUserRepos = async (userId) => {
  try {
    const reposCollection = collection(db, "users", userId, "repos");
    const reposQuery = query(reposCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(reposQuery);
    
    const repos = [];
    querySnapshot.forEach((doc) => {
      repos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return repos;
  } catch (error) {
    console.error("Error getting user repos:", error);
    throw error;
  }
};

// Export Firebase instances
export { auth, db, app };