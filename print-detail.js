const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'travel-agent-management-29c27'
});

const db = admin.firestore();

async function print() {
  const ids = ['04INNv7vvljnVbi8rduy', 'GxUn3t7rL9N3tCzRJ4mK'];
  for (const id of ids) {
    const doc = await db.collection('listings').doc(id).get();
    if (doc.exists) {
      console.log(`\n================ ID: ${id} ================`);
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  }
  process.exit(0);
}

print();
