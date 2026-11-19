// Shop ERP settings.
//
// 1. firebaseConfig: copy it from Firebase console → Project settings → General → Your apps.
//    It is not a secret: access to the data is protected by the rules in firestore.rules.
// 2. ownerEmails: the people who manage the shop (up to three). Only they can add or remove staff.
//    The first one invoices with letter A, the second with B, the third with C.
//    Use the same emails in firestore.rules.

export const firebaseConfig = {
  apiKey: "AIzaSyAcwwTJyVCiv9N0T5KZz-5AMNPQhkA3LUg",
  authDomain: "osseilygroup.firebaseapp.com",
  projectId: "osseilygroup",
  storageBucket: "osseilygroup.firebasestorage.app",
  messagingSenderId: "940300258452",
  appId: "1:940300258452:web:afe73f4bf831c1bbe0f881"
};

export const ownerEmails = ["osseilyali@gmail.com", "mansour.s.samer@gmail.com"];
