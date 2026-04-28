import React from 'react';
import { Clock, MapPin, DollarSign, Info, Sparkles } from 'lucide-react';

interface Props {
  data: any; 
}

const AIItineraryResult: React.FC<Props> = ({ data }) => {
  console.log("Component AI nhận được data:", data);
  if (!data || !data.days || data.days.length === 0) {
    return (
      <div className="mt-10 p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
        <Info className="mx-auto text-slate-400 mb-2" size={32} />
        <p className="text-slate-500 font-medium">AI chưa thể tạo lịch trình vào lúc này. Vui lòng thử lại.</p>
      </div>
    );
  }

  const getVal = (obj: any, camelKey: string, snakeKey: string) => {
    return obj[camelKey] !== undefined ? obj[camelKey] : obj[snakeKey];
  };

  const tripTitle = getVal(data, 'tripTitle', 'trip_title');
  const destination = data.destination || 'Điểm đến';
  const totalCost = getVal(data, 'totalEstimatedCost', 'total_estimated_cost') || 0;

  return (
    <div className="mt-12 space-y-10 animate-in fade-in zoom-in duration-1000">
      {/* HEADER KẾT QUẢ */}
      <div className="text-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-4">
            <Sparkles size={32} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">
          {tripTitle}
        </h2>
        <p className="text-slate-500 font-medium text-lg">Lịch trình tối ưu tại {destination}</p>
        
        <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-200">
          <DollarSign size={20} /> 
          Dự kiến: {new Intl.NumberFormat('vi-VN').format(totalCost)} VNĐ
        </div>
      </div>

      {/* TIMELINE CHI TIẾT */}
      <div className="grid grid-cols-1 gap-12 relative">
        {data.days.map((day: any, idx: number) => (
          <div key={idx} className="relative pl-10 border-l-4 border-blue-500/10 ml-4">
            {/* Dot đánh dấu ngày */}
            <div className="absolute -left-[18px] top-0 size-8 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center text-white font-black text-sm">
              {day.day}
            </div>
            
            <h3 className="text-2xl font-black text-blue-600 uppercase tracking-tighter mb-8 flex items-center gap-2">
               Ngày {day.day}
            </h3>

            <div className="grid grid-cols-1 gap-6">
              {day.activities && day.activities.map((act: any, aIdx: number) => {
                const actTitle = getVal(act, 'title', 'title');
                const actCost = getVal(act, 'estimatedCost', 'estimated_cost') || 0;

                return (
                  <div key={aIdx} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="size-2 bg-blue-500 rounded-full"></div>
                             <h4 className="font-black text-xl text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight">
                                {actTitle}
                             </h4>
                        </div>
                        <p className="text-slate-500 leading-relaxed text-base font-medium">
                            {act.description}
                        </p>
                      </div>
                      
                      <div className="flex flex-col md:items-end justify-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                          <MapPin size={16} className="text-red-400"/> {act.location}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                          <Clock size={16} className="text-blue-400"/> {act.duration}
                        </div>
                        <div className="mt-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-sm shadow-md">
                           ~{new Intl.NumberFormat('vi-VN').format(actCost)}₫
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* FOOTER KẾT QUẢ */}
      <div className="bg-blue-600 p-10 rounded-[3rem] text-white text-center shadow-2xl shadow-blue-200">
          <h3 className="text-2xl font-black mb-2">Bạn hài lòng với lịch trình này chứ?</h3>
          <p className="text-blue-100 mb-6 font-medium">Hãy lưu lại để bắt đầu chuyến đi của mình ngay nhé!</p>
          <div className="flex flex-wrap justify-center gap-4">
              <button className="px-8 py-3 bg-white text-blue-600 rounded-2xl font-black hover:bg-slate-100 transition-all active:scale-95">LƯU LỊCH TRÌNH</button>
              <button className="px-8 py-3 bg-blue-700 text-white rounded-2xl font-black hover:bg-blue-800 transition-all active:scale-95">TẢI FILE PDF</button>
          </div>
      </div>
    </div>
  );
};
export default AIItineraryResult;
