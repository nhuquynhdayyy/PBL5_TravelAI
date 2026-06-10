import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const HeroSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [destinations, setDestinations] = useState<any[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Fetch destinations for autocomplete
    const fetchDestinations = async () => {
      try {
        const response = await axiosClient.get('/destinations');
        const data = response.data?.data || response.data || [];
        setDestinations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching destinations:', error);
        setDestinations([]);
      }
    };
    
    fetchDestinations();
  }, []);

  useEffect(() => {
    // Filter destinations based on input
    if (location.trim()) {
      const keyword = location.toLowerCase().trim();
      const filtered = destinations.filter(dest => 
        dest.name?.toLowerCase().includes(keyword)
      ).slice(0, 5); // Limit to 5 suggestions
      setFilteredDestinations(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredDestinations([]);
      setShowSuggestions(false);
    }
  }, [location, destinations]);

  const handleSearch = () => {
    if (!location.trim()) {
      alert('Vui lòng nhập điểm đến');
      return;
    }

    // Navigate to destinations page with search query
    navigate(`/destinations?search=${encodeURIComponent(location.trim())}`);
    setShowSuggestions(false);
  };

  const handleSelectDestination = (dest: any) => {
    setLocation(dest.name);
    setShowSuggestions(false);
    // Navigate to destinations page with search query
    navigate(`/destinations?search=${encodeURIComponent(dest.name)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {/* Location Input with Autocomplete */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <MapPin size={20} />
        </div>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredDestinations.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay to allow clicking on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="Bạn muốn đi đâu?"
          className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        
        {/* Autocomplete Suggestions */}
        {showSuggestions && filteredDestinations.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border-2 border-slate-200 bg-white shadow-xl">
            {filteredDestinations.map((dest) => (
              <button
                key={dest.id || dest.destinationId}
                type="button"
                onClick={() => handleSelectDestination(dest)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50"
              >
                <MapPin size={16} className="text-blue-500" />
                <div>
                  <div className="font-semibold text-slate-900">{dest.name}</div>
                  {dest.country && (
                    <div className="text-xs text-slate-500">{dest.country}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
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
