import React from 'react';
import { 
  Compass, 
  Palmtree, 
  Castle, 
  Coins, 
  Wallet, 
  Gem, 
  Coffee, 
  Zap, 
  Timer,
  UtensilsCrossed 
} from 'lucide-react';

interface PrefFormProps {
  formData: {
    travelStyle: string;
    budgetLevel: number;
    travelPace: number;
    cuisinePref: string;
  };
  onChange: (data: any) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

const PrefForm: React.FC<PrefFormProps> = ({ formData, onChange, onSave, saving }) => {
  
  // Lưu trực tiếp Component Icon vào mảng (không dùng dấu < /> ở đây)
  const styles = [
    { id: 'Thám hiểm', label: 'Thám hiểm', icon: Compass, desc: 'Leo núi, băng rừng' },
    { id: 'Nghỉ dưỡng', label: 'Nghỉ dưỡng', icon: Palmtree, desc: 'Chill, biển, spa' },
    { id: 'Văn hóa', label: 'Văn hóa', icon: Castle, desc: 'Bảo tàng, di tích' },
  ];

  const budgets = [
    { id: 0, label: 'Tiết kiệm', icon: Wallet, desc: 'Giá rẻ nhất' },
    { id: 1, label: 'Cân bằng', icon: Coins, desc: 'Hợp túi tiền' },
    { id: 2, label: 'Sang chảnh', icon: Gem, desc: 'Trải nghiệm cao cấp' },
  ];

  const paces = [
    { id: 0, label: 'Thong thả', icon: Coffee, desc: 'Ngủ nướng, đi ít' },
    { id: 1, label: 'Cân bằng', icon: Timer, desc: 'Vừa chơi vừa nghỉ' },
    { id: 2, label: 'Dày đặc', icon: Zap, desc: 'Đi hết các điểm' },
  ];

  const updateField = (field: string, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={onSave} className="space-y-10 text-left">
      {/* 1. Phong cách du lịch */}
      <div>
        <label className="block text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
          Bạn thích đi kiểu gì?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {styles.map((s) => (
            <div
              key={s.id}
              onClick={() => updateField('travelStyle', s.id)}
              className={`cursor-pointer p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                formData.travelStyle === s.id 
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xl shadow-blue-100 scale-[1.02]' 
                : 'border-slate-100 hover:border-blue-200 text-slate-500 bg-white'
              }`}
            >
              <div className={formData.travelStyle === s.id ? 'text-blue-600' : 'text-slate-400'}>
                <s.icon size={32} strokeWidth={2.5} />
              </div>
              <span className="font-bold">{s.label}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Ngân sách & Nhịp độ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
            Túi tiền (Budget)
          </label>
          <div className="space-y-3">
            {budgets.map((b) => (
              <div
                key={b.id}
                onClick={() => updateField('budgetLevel', b.id)}
                className={`cursor-pointer p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                  formData.budgetLevel === b.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-100 hover:bg-slate-50 bg-white'
                }`}
              >
                <div className={formData.budgetLevel === b.id ? 'text-blue-600' : 'text-slate-400'}>
                  <b.icon size={24} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${formData.budgetLevel === b.id ? 'text-blue-700' : 'text-slate-700'}`}>{b.label}</p>
                  <p className="text-xs text-slate-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
            Nhịp độ chuyến đi
          </label>
          <div className="space-y-3">
            {paces.map((p) => (
              <div
                key={p.id}
                onClick={() => updateField('travelPace', p.id)}
                className={`cursor-pointer p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                  formData.travelPace === p.id 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-slate-100 hover:bg-slate-50 bg-white'
                }`}
              >
                <div className={formData.travelPace === p.id ? 'text-orange-600' : 'text-slate-400'}>
                  <p.icon size={24} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${formData.travelPace === p.id ? 'text-orange-700' : 'text-slate-700'}`}>{p.label}</p>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Ẩm thực */}
      <div>
        <label className="block text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <UtensilsCrossed size={20} className="text-red-500" />
          Ghi chú ẩm thực
        </label>
        <textarea
          className="w-full p-4 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all h-32 placeholder:text-slate-300 bg-slate-50/50"
          placeholder="Ví dụ: Thích ăn đồ biển, không ăn được cay, mê quán vỉa hè..."
          value={formData.cuisinePref || ''}
          onChange={(e) => updateField('cuisinePref', e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-slate-300"
      >
        {saving ? (
          <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <span className="text-lg">LƯU CẤU HÌNH CỦA TÔI</span>
        )}
      </button>
    </form>
  );
};

export default PrefForm;