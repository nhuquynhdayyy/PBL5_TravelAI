import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar } from 'lucide-react';

const HeroSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [checkInDate, setCheckInDate] = useState('');

  const handleSearch = () => {
    if (!location.trim()) {
      alert('Vui lòng nhập điểm đến');
      return;
    }

    // Navigate to services page with search params
    const params = new URLSearchParams();
    params.set('location', location);
    if (checkInDate) {
      params.set('checkIn', checkInDate);
    }
    
    navigate(`/services?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {/* Location Input */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <MapPin size={20} />
        </div>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Bạn muốn đi đâu?"
          className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Date Input */}
      <div className="relative sm:w-48">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Calendar size={20} />
        </div>
        <input
          type="date"
          value={checkInDate}
          onChange={(e) => setCheckInDate(e.target.value)}
          onKeyDown={handleKeyDown}
          min={today}
          className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 font-black text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
      >
        <Search size={20} />
        <span>Tìm kiếm</span>
      </button>
    </div>
  );
};

export default HeroSearchBar;
