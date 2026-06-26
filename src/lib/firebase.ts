/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDxYfL48y9dhgsFZx2tNtFK35CvMTcCzzM",
  authDomain: "caramel-figure-5lrqd.firebaseapp.com",
  projectId: "caramel-figure-5lrqd",
  storageBucket: "caramel-figure-5lrqd.firebasestorage.app",
  messagingSenderId: "794299202454",
  appId: "1:794299202454:web:3c075cfb9f5367dc0dbbb7"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with databaseId from config
const db = initializeFirestore(app, {}, "ai-studio-691317e4-f6ed-4706-b3f6-71014523e5a6");

export { app, db };
