import { Metadata } from 'next';
import HomeClient from './HomeClient';
import { parseFirestoreDocument } from '@/lib/firestoreParser';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const revalidate = 60;

async function getApprovedListings() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const query = {
      structuredQuery: {
        from: [{ collectionId: "listings" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "approved" },
            op: "EQUAL",
            value: { booleanValue: true }
          }
        },
        limit: 50
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!res.ok) {
      console.error("Error fetching listings from REST API:", await res.text());
      return [];
    }

    const data = await res.json();
    
    // runQuery returns an array of { document: { name, fields, ... } }
    const listings = data
      .filter((item: any) => item.document)
      .map((item: any) => parseFirestoreDocument(item.document));
      
    return listings;
  } catch (error) {
    console.error("Exception fetching listings:", error);
    return [];
  }
}

export const metadata: Metadata = {
  title: "TripDM: Direct Message. Better Travel.",
  description: "TripDM connects travelers directly with trusted travel agents through instant messaging. Browse top travel packages.",
};

import { Suspense } from 'react';

export default async function HomePage() {
  // Fetch initial data on the server for pure HTML SSR
  const initialListings = await getApprovedListings();

  // Render the client component monolith, passing the server-fetched data as initial state
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClient initialListings={initialListings} routeMode="user" />
    </Suspense>
  );
}
