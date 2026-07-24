const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase App Initialized successfully.');
  
  const db = admin.firestore();
  db.collection('admin').doc('config').get().then((doc) => {
    console.log('Doc exists?', doc.exists);
    if (doc.exists) console.log(doc.data());
    process.exit(0);
  }).catch(e => {
    console.error('Firestore Error:', e.message);
    process.exit(1);
  });

} catch (e) {
  console.error('Init Error:', e.message);
}
