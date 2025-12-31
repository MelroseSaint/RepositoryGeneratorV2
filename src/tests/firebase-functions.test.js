import { describe, it, expect } from 'vitest';
import {
  signInWithGoogle,
  signOutUser,
  addUserData,
  getUserData,
  addGeneratedRepo,
  onAuthStateChange,
  auth,
  db
} from '../firebase';

describe('Firebase Functions - Basic Tests', () => {
  it('should export all required Firebase functions', () => {
    expect(signInWithGoogle).toBeDefined();
    expect(signOutUser).toBeDefined();
    expect(addUserData).toBeDefined();
    expect(getUserData).toBeDefined();
    expect(addGeneratedRepo).toBeDefined();
    expect(onAuthStateChange).toBeDefined();
  });

  it('should export Firebase instances', () => {
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
  });

  it('should have Firebase functions with correct signatures', () => {
    // Check that functions are callable
    expect(typeof signInWithGoogle).toBe('function');
    expect(typeof signOutUser).toBe('function');
    expect(typeof addUserData).toBe('function');
    expect(typeof getUserData).toBe('function');
    expect(typeof addGeneratedRepo).toBe('function');
    expect(typeof onAuthStateChange).toBe('function');
  });

  it('should have Firebase instances with expected properties', () => {
    // Check basic Firebase instance properties
    expect(auth).toHaveProperty('currentUser');
    expect(db).toHaveProperty('app');
  });
});