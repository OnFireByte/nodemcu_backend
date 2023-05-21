import { createClient } from "@vercel/kv";
import express from "express";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    orderBy,
    limit,
    doc,
    setDoc,
    where,
} from "firebase/firestore";

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const data = await kv.zrange("rawdata", 0, -1);
console.log(data.length);

// writebulk to firestore
let i = 0;
for (const item of data) {
    console.log(i++);
    await addDoc(collection(db, "rawdata"), item);
}
