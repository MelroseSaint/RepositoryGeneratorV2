import { describe, it, expect, vi, beforeAll } from 'vitest';
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Mock Firebase configuration for testing
const mockFirebaseConfig = {
  apiKey: "test-api-key",
  authDomain: "test-project.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test-project.appspot.com",
  messagingSenderId: "test-sender-id",
  appId: "test-app-id"
};

describe('Firebase Integration Tests', () => {
  let firebaseApp;
  let auth;
  let db;

  beforeAll(() => {
    // Initialize Firebase with test configuration
    firebaseApp = initializeApp(mockFirebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  });

  it('should initialize Firebase app successfully', () => {
    expect(firebaseApp).toBeDefined();
    expect(firebaseApp.name).toBe("[DEFAULT]");
  });

  it('should initialize Firebase Auth successfully', () => {
    expect(auth).toBeDefined();
    expect(auth.app.name).toBe("[DEFAULT]");
  });

  it('should initialize Firestore successfully', () => {
    expect(db).toBeDefined();
    expect(db.app.name).toBe("[DEFAULT]");
  });

  it('should create Google Auth Provider', () => {
    const provider = new GoogleAuthProvider();
    expect(provider).toBeDefined();
    expect(provider.providerId).toBe("google.com");
  });

  it('should have correct Firebase configuration', () => {
    expect(firebaseApp.options.apiKey).toBe(mockFirebaseConfig.apiKey);
    expect(firebaseApp.options.projectId).toBe(mockFirebaseConfig.projectId);
    expect(firebaseApp.options.authDomain).toBe(mockFirebaseConfig.authDomain);
  });
});