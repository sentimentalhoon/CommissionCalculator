import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCQ_czv1Zjl77Sb-MhWt_aKo3UrwoCM_94",
    authDomain: "commissioncalculator-46c7e.firebaseapp.com",
    projectId: "commissioncalculator-46c7e",
    storageBucket: "commissioncalculator-46c7e.firebasestorage.app",
    messagingSenderId: "615774860880",
    appId: "1:615774860880:web:7afc8b0353864b7072c355",
    measurementId: "G-8FHM9GGN48"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
