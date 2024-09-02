import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

var serviceAccount = require("../../firebase_service_key.json");

const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

export { firebaseApp };

