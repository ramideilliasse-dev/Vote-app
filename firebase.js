import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvVeNIygIE6GNtuMrhJabmO3ffL3Fz6WA",
  authDomain: "vote-app-cfdf3.firebaseapp.com",
  projectId: "vote-app-cfdf3",
  storageBucket: "vote-app-cfdf3.firebasestorage.app",
  messagingSenderId: "1069813496162",
  appId: "1:1069813496162:web:c3f839104237cdc395143b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); 
