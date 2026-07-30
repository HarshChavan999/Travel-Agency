import { Metadata } from 'next';
import PackageClientView from './PackageClientView';
import { parseFirestoreDocument } from '@/lib/firestoreParser';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings?pageSize=1000`;
    const res = await fetch(url);
    if (!res.ok) return [{ id: 'default' }];
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      return [{ id: 'default' }];
    }
    const paths = data.documents.map((doc: any) => {
      const parts = doc.name.split('/');
      return { id: parts[parts.length - 1] };
    });
    return paths.length > 0 ? paths : [{ id: 'default' }];
  } catch {
    return [{ id: 'default' }];
  }
}

async function getListing(id: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings/${id}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    const listing = parseFirestoreDocument(data);
    listing.id = id;

    return listing;
  } catch (error) {
    console.error("Error fetching listing:", error);
    return null;
  }
}



export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const listing = await getListing(resolvedParams.id);

  if (!listing) {
    return {
      title: 'Package Not Found | TripDM',
      description: 'The requested travel package could not be found.',
    };
  }

  const title = listing.title || 'Travel Package';
  const description = listing.description || `Discover this amazing travel package to ${listing.countryName || listing.stateName || 'your next destination'}.`;
  
  let imageUrl = '';
  if (listing.photos && listing.photos.length > 0) {
    imageUrl = listing.photos[0];
  } else if (listing.placesCovered && listing.placesCovered.length > 0 && listing.placesCovered[0].imageUrls && listing.placesCovered[0].imageUrls.length > 0) {
    imageUrl = listing.placesCovered[0].imageUrls[0];
  }

  return {
    title: `${title} | TripDM`,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    }
  };
}

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const listing = await getListing(resolvedParams.id);

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Package Not Found</h1>
          <p className="text-gray-500 mb-6">The travel package you are looking for does not exist or has been removed.</p>
          <a href="/" className="px-6 py-2 bg-[#FF9900] text-white rounded-lg font-bold">Return Home</a>
        </div>
      </div>
    );
  }

  return <PackageClientView listing={listing} />;
}
