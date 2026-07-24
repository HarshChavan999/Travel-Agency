import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface FooterProps {
  onNavigate?: (section: string) => void;
}

export default function Footer({ onNavigate }: FooterProps = {}) {
  return (
    <footer className="w-full bg-[#111827] text-white relative z-10">
      {/* Top thin bar */}
      <div className="w-full h-8 bg-[#1f2937] border-t-2 border-blue-500"></div>
      
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1 */}
          <div>
            <h3 className="text-base font-bold mb-4">Get to Know us</h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">About us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Career</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Press Release</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="text-base font-bold mb-4">Get in touch with us</h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">Facebook</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Twitter</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Instagram</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">YouTube</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact us</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="text-base font-bold mb-4">Earn with us</h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li><Link href="#" className="hover:text-white transition-colors">Join as Travel Agent</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Become an Affiliate</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Join as an Influencer</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="text-base font-bold mb-4">Let Us Help You</h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <a href="#" onClick={(e) => { if(onNavigate) { e.preventDefault(); onNavigate('profile'); } }} className="hover:text-white transition-colors cursor-pointer">
                  My Account
                </a>
              </li>
              <li><Link href="#" className="hover:text-white transition-colors">Upcoming Tour</Link></li>
              <li>
                <a href="#" onClick={(e) => { if(onNavigate) { e.preventDefault(); onNavigate('chat'); } }} className="hover:text-white transition-colors cursor-pointer">
                  My Chat
                </a>
              </li>
              <li><Link href="#" className="hover:text-white transition-colors">Talk to our Customer care</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <Link href="/policies/conditions-of-use" className="hover:text-white transition-colors">Condition of Use and Sale</Link>
            <Link href="/policies/privacy-notice" className="hover:text-white transition-colors">Privacy Notice</Link>
            <Link href="/policies/internet-based-policy" className="hover:text-white transition-colors">Internet-Based Policy</Link>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-1 font-extrabold tracking-tight bg-white px-3 py-1.5 rounded-xl shadow-sm">
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 sm:h-12 w-auto object-contain" />
          </div>
        </div>
      </div>
    </footer>
  );
}
