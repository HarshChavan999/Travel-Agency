import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#111827] text-white">
      {/* Top thin bar */}
      <div className="w-full h-8 bg-[#1f2937] border-t-2 border-blue-500"></div>
      
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1 */}
          <div>
            <h3 className="text-sm font-bold mb-4">Get to Know us</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">About us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Career</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Press Release</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="text-sm font-bold mb-4">Get in touch with us</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">Facebook</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Twitter</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Instagram</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">YouTube</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact us</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="text-sm font-bold mb-4">Earn with us</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">Join as Travel Agent</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Become an Affiliate</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Join as an Influencer</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="text-sm font-bold mb-4">Let Us Help You</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">My Account</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Upcoming Tour</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">My Cancellation</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Talk to our Customer care</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex flex-wrap gap-4 text-[11px] text-gray-300">
            <Link href="#" className="hover:text-white">Condition of Use and Sale</Link>
            <Link href="#" className="hover:text-white">Privacy Notice</Link>
            <Link href="#" className="hover:text-white">Interest-Based Ads</Link>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-1 font-extrabold tracking-tight">
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-12 sm:h-14 w-auto object-contain" />
          </div>
        </div>
      </div>
    </footer>
  );
}
