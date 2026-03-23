import React from 'react';
import { Plane, Facebook, Instagram, Twitter, Mail, Phone, MapPin, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Plane className="text-blue-400 size-6" />
              <span className="text-xl font-bold">TravelAI</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Smart travel planning powered by AI. Discover hidden gems and book your dream trip seamlessly.
            </p>
            <div className="flex gap-4">
              <Facebook className="size-5 hover:text-blue-400 cursor-pointer" />
              <Instagram className="size-5 hover:text-pink-400 cursor-pointer" />
              <Twitter className="size-5 hover:text-blue-300 cursor-pointer" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Explore</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Popular Destinations</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">AI Trip Planner</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Tour Guides</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Special Offers</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6">Support</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Refund Policy</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-bold mb-6">Contact Us</h4>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="size-4 text-blue-400" />
              <span>123 AI Street, Tech City, VN</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="size-4 text-blue-400" />
              <span>+84 123 456 789</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="size-4 text-blue-400" />
              <span>support@travelai.com</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} TravelAI System. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs">
            <Globe className="size-4" />
            <span>Vietnam (Tiếng Việt)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;