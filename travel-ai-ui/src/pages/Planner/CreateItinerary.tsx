import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { getTodayVietnam } from '../../utils/dateUtils';

interface Destination {
  id: number;           // backend returns 'id', NOT 'destinationId'
  name: string;
  country: string;
  imageUrl?: string;
}

const CreateItinerary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [destinationId, setDestinationId] = useState<string>('');
  const [startDate, setStartDate] = useState(getTodayVietnam());
  const [numberOfDays, setNumberOfDays] = useState(3);
  const [guests, setGuests] = useState(2);
  const [budgetLevel, setBudgetLevel] = useState('medium');

  // Store preselected values from navigation state
  const [preselectedDestId, setPreselectedDestId] = useState<string | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchDestinations();
    
    // Get preselected values from navigation state immediately
    const state = location.state as any;
    if (state?.preselectedDestinationId) {
      setPreselectedDestId(String(state.preselectedDestinationId));
    }
    if (state?.preselectedDate) {
      setPreselectedDate(state.preselectedDate);
      setStartDate(state.preselectedDate);
    }
  }, [location.state]);

  useEffect(() => {
    // After destinations are loaded, apply preselected destination if any
    if (preselectedDestId && destinations.length > 0) {
      const destExists = destinations.some(
        d => String(d.id) === preselectedDestId
      );
      if (destExists) {
        setDestinationId(preselectedDestId);
      }
    }
  }, [destinations, preselectedDestId]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/destinations');
      const data = response.data.data || response.data || [];
      console.log('Fetched destinations:', data);
      setDestinations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destinationId || destinationId === '') {
      alert('Vui lòng chọn điểm đến');
      return;
    }

    if (!startDate) {
      alert('Vui lòng chọn ngày bắt đầu');
      return;
    }

    try {
      setGenerating(true);

      const destId = parseInt(destinationId, 10);
      
      // Validate before sending
      if (!destinationId || destinationId === '' || isNaN(destId) || destId === 0) {
        alert('Vui lòng chọn điểm đến hợp lệ');
        setGenerating(false);
        return;
      }

      // camelCase to match backend JSON serializer config (same as DestinationDetail)
      const requestBody = {
        destinationId: destId,
        numberOfDays: numberOfDays,
        startDate: startDate,
      };

      console.log('Sending request to API:', requestBody);

      const response = await axiosClient.post('/itinerary/generate', requestBody);

      console.log('✅ API Response:', response.data);


      // API /itinerary/generate trả về result trực tiếp (không có wrapper {success, data})
      // Giống cách DestinationDetail xử lý: response.data.data || response.data
      const itinerary = response.data?.data || response.data;

      if (itinerary) {
        // Navigate to timeline with generated itinerary
        navigate('/itinerary/latest', {
          state: { data: itinerary },
          replace: false
        });
      } else {
        alert('API trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
      }
    } catch (error: any) {
      console.error('Error generating itinerary:', error);
      
      // Extract detailed error message
      let errorMsg = 'Không thể tạo lịch trình. Vui lòng thử lại.';
      
      if (error.response?.data) {
        const data = error.response.data;
        console.error('Backend error data:', data);
        
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.message) {
          errorMsg = data.message;
        } else if (data.errors) {
          // Validation errors from ASP.NET
          errorMsg = Object.values(data.errors).flat().join(', ');
        } else if (data.title) {
          errorMsg = data.title;
        }
      }
      
      console.error('Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        parsedMessage: errorMsg
      });
      
      alert(`Lỗi: ${errorMsg}\n\nVui lòng kiểm tra:\n- Đã đăng nhập chưa?\n- Điểm đến có hợp lệ?\n- Ngày bắt đầu đã chọn?\n\nXem Console (F12) để biết chi tiết.`);
    } finally {
      setGenerating(false);
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';
    return url.startsWith('http') ? url : `http://localhost:5134${url}`;
  };

  const selectedDestination = destinationId 
    ? destinations.find(d => d.id === parseInt(destinationId, 10))
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4">
            <Sparkles size={16} />
            AI Travel Planner
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4">
            Tạo Lịch Trình Du Lịch
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Để AI giúp bạn lập kế hoạch chuyến đi hoàn hảo chỉ trong vài giây
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-900 mb-6">Thông tin chuyến đi</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Destination */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <MapPin size={16} className="text-blue-600" />
                  Điểm đến
                </label>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="animate-spin text-blue-600" />
                  </div>
                ) : (
                  <select
                    value={destinationId}
                    onChange={(e) => {
                      const selectedOption = e.target.options[e.target.selectedIndex];
                      const value = selectedOption.value;
                      const text = selectedOption.text;
                      
                      setDestinationId(value);
                    }}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  >
                    <option value="" key="empty">Chọn điểm đến...</option>
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name}{dest.country ? `, ${dest.country}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Calendar size={16} className="text-blue-600" />
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  required
                />
              </div>

              {/* Number of Days */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Calendar size={16} className="text-blue-600" />
                  Số ngày ({numberOfDays} ngày)
                </label>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={numberOfDays}
                  onChange={(e) => setNumberOfDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                  <span>1 ngày</span>
                  <span>14 ngày</span>
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Users size={16} className="text-blue-600" />
                  Số người ({guests} người)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                  <span>1 người</span>
                  <span>10+ người</span>
                </div>
              </div>

              {/* Budget Level */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <DollarSign size={16} className="text-blue-600" />
                  Mức ngân sách
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'low', label: 'Tiết kiệm', emoji: '💰' },
                    { value: 'medium', label: 'Trung bình', emoji: '💵' },
                    { value: 'high', label: 'Cao cấp', emoji: '💎' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBudgetLevel(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                        budgetLevel === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={generating || !destinationId}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Đang tạo lịch trình...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Tạo lịch trình với AI
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview/Info */}
          <div className="space-y-6">
            {/* Preview Card */}
            {destinationId && selectedDestination && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img
                    src={getImageUrl(selectedDestination.imageUrl)}
                    alt={selectedDestination.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {selectedDestination.name}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Chuyến đi {numberOfDays} ngày · {guests} người
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-bold">
                    <Sparkles size={16} />
                    Sẵn sàng lập kế hoạch!
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 text-white">
              <h3 className="text-2xl font-black mb-4">✨ AI sẽ giúp bạn:</h3>
              <ul className="space-y-3">
                {[
                  'Đề xuất địa điểm phù hợp với sở thích',
                  'Sắp xếp lộ trình tối ưu',
                  'Gợi ý dịch vụ khách sạn, tour',
                  'Ước tính chi phí chính xác',
                  'Tạo timeline chi tiết từng ngày'
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateItinerary;
