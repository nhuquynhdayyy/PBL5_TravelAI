import React from 'react';
import { Link } from 'react-router-dom';
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
              Lập kế hoạch du lịch thông minh với AI. Khám phá những điểm đến độc đáo và đặt chuyến đi mơ ước của bạn.
            </p>
            <div className="flex gap-4">
              <Facebook className="size-5 hover:text-blue-400 cursor-pointer" />
              <Instagram className="size-5 hover:text-pink-400 cursor-pointer" />
              <Twitter className="size-5 hover:text-blue-300 cursor-pointer" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Khám phá</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/destinations" className="hover:text-blue-400 transition-colors">Điểm đến phổ biến</Link></li>
              <li><Link to="/planner" className="hover:text-blue-400 transition-colors">Lập kế hoạch du lịch AI</Link></li>
              <li><Link to="/tours" className="hover:text-blue-400 transition-colors">Tour du lịch</Link></li>
              <li><Link to="/services" className="hover:text-blue-400 transition-colors">Dịch vụ</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6">Hỗ trợ</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Trung tâm hỗ trợ</Link></li>
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Điều khoản dịch vụ</Link></li>
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Chính sách hoàn tiền</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-bold mb-6">Liên hệ</h4>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="size-4 text-blue-400" />
              <span>Số 123 Đường ABC, Đà Nẵng, VN</span>
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
            © {new Date().getFullYear()} TravelAI System. Tất cả các quyền được bảo lưu.
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