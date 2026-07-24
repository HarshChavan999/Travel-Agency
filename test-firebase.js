require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

console.log('Key contains literal \\n?', process.env.FIREBASE_PRIVATE_KEY.includes('\\n'));
console.log('Key contains actual newlines?', process.env.FIREBASE_PRIVATE_KEY.includes('\n'));

// Let's try parsing it manually
let finalKey = process.env.FIREBASE_PRIVATE_KEY;
if (finalKey.includes('\\n')) {
  finalKey = finalKey.replace(/\\n/g, '\n');
}
finalKey = finalKey.replace(/"/g, '');

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: finalKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase App Initialized successfully.');
  
  const db = admin.firestore();
  db.collection('admin').doc('config').get().then((doc) => {
    console.log('Doc exists?', doc.exists);
    process.exit(0);
  }).catch(e => {
    console.error('Firestore Error:', e.message);
    process.exit(1);
  });

} catch (e) {
  console.error('Init Error:', e.message);
}
