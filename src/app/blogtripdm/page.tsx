import { Metadata } from 'next';
import BlogAdminClient from './BlogAdminClient';

export const metadata: Metadata = {
  title: 'Blog Admin | TripDM',
  description: 'Blog management dashboard for TripDM administrators',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BlogAdminPage() {
  return <BlogAdminClient />;
}
