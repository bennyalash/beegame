// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCvmGTDeotUonaWGhxCk2u-DWXj9HaqtO0",
    authDomain: "go-bee.firebaseapp.com",
    projectId: "go-bee",
    storageBucket: "go-bee.firebasestorage.app",
    messagingSenderId: "177168630318",
    appId: "1:177168630318:web:ebe2965f174a1825d1d5bf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };