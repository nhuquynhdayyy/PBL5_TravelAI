import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, Sparkles, BarChart3 } from 'lucide-react';
import * as AI from '../api/ai';

type AiSuggestionDto = AI.AiSuggestionDto;

const AiSuggestionPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<AiSuggestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await AI.aiApi.getSuggestions();
        if (response.success) {
          setSuggestions(response.data);
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError('Đã có lỗi xảy ra khi tải gợi ý');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80';
    return url.startsWith('http') ? url : `http://localhost:5134${url}`;
  };

  const getScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    return Math.round(score * 100);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" size={14} className="text-yellow-400 fill-yellow-400" />);
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={14} className="text-gray-300" />);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded-full w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 rounded-full w-96 mx-auto"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="h-44 bg-slate-200"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-800">Gợi Ý Thông Minh</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Khám phá những địa điểm phù hợp nhất với sở thích của bạn
          </p>
        </div>

        {/* Suggestions Grid */}
        {suggestions.length === 0 ? (
          <div className="text-center py-16">
          <p className="text-slate-500 text-xl">Chưa có gợi ý nào. Vui lòng quay lại sau!</p>
        </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.spot.spotId}
              className="group relative bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
            >
              {/* Rank Badge */}
              {index < 3 && (
                <div className="absolute top-4 left-4 z-10 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-full px-4 py-1 text-sm shadow-lg">
                  #{index + 1}
                </div>
              )}

              {/* Image */}
              <div className="h-44 overflow-hidden relative">
                <img
                  src={getImageUrl(suggestion.spot.imageUrl)}
                  alt={suggestion.spot.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Score Badge */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-lg">
                  <div className="flex items-center gap-1">
                    <BarChart3 size={16} className={getScoreColor(suggestion.totalScore)} />
                    <span className={`font-bold text-lg ${getScoreColor(suggestion.totalScore)}`}>
                      {getScore(suggestion.totalScore)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-grow">
                <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {suggestion.spot.name}
                </h3>
                
                {/* Rating */}
                {suggestion.averageRating > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {renderStars(suggestion.averageRating)}
                    <span className="text-slate-600 text-sm ml-1">
                      {suggestion.averageRating.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Description */}
                <p className="text-slate-500 text-xs line-clamp-2 mb-4">
                  {suggestion.spot.description}
                </p>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1">
                    <span className="text-slate-600">Phong cách</span>
                    <span className={`font-bold ${getScoreColor(suggestion.styleMatchScore)}`}>
                      {getScore(suggestion.styleMatchScore)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1">
                    <span className="text-slate-600">Ngân sách</span>
                    <span className={`font-bold ${getScoreColor(suggestion.budgetMatchScore)}`}>
                      {getScore(suggestion.budgetMatchScore)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1">
                    <span className="text-slate-600">Tốc độ</span>
                    <span className={`font-bold ${getScoreColor(suggestion.paceMatchScore)}`}>
                      {getScore(suggestion.paceMatchScore)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1">
                    <span className="text-slate-600">Đánh giá</span>
                    <span className={`font-bold ${getScoreColor(suggestion.ratingScore)}`}>
                      {getScore(suggestion.ratingScore)}%
                    </span>
                  </div>
                </div>

                {/* Time & Button */}
                <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase mb-4">
                  <Clock size={12} className="mr-1" /> {suggestion.spot.avgTimeSpent || 60} phút
                </div>
                <Link
                  to={`/spots/${suggestion.spot.spotId}`}
                  className="block w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center rounded-2xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md active:scale-[0.98]"
                >
                  Khám phá ngay
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default AiSuggestionPage;
