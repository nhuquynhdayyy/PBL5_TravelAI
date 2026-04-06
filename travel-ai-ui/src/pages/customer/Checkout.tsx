import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { 
    CreditCard, 
    ShieldCheck, 
    Calendar, 
    Users, 
    ArrowLeft, 
    Loader2, 
    Wallet, 
    CheckCircle2,
    Lock
} from 'lucide-react';

const Checkout = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                // Giả định bạn đã viết API GET /api/bookings/{id} ở Backend
                const res = await axiosClient.get(`/bookings/${bookingId}`);
                setBooking(res.data);
            } catch (err) {
                console.error(err);
                alert("Không tìm thấy thông tin đơn hàng!");
                navigate('/services');
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [bookingId]);

    const handlePayment = async () => {
        try {
            setPaying(true);
            const res = await axiosClient.post(`/bookings/${bookingId}/confirm`);
            
            if (res.data.success) {
                // KHÔNG DÙNG ALERT NỮA, CHUYỂN HƯỚNG THẲNG SANG TRANG BILL
                navigate(`/booking-success/${bookingId}`);
            }
        } catch (err) {
            alert("Giao dịch thất bại. Vui lòng thử lại!");
        } finally {
            setPaying(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-slate-400 font-bold">Đang tải thông tin thanh toán...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 text-left">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold mb-8 transition-colors">
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* BÊN TRÁI: PHƯƠNG THỨC THANH TOÁN (2 cột) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <CreditCard className="text-blue-600" /> Phương thức thanh toán
                        </h2>

                        <div className="space-y-4">
                            {/* Thẻ tín dụng */}
                            <div 
                                onClick={() => setPaymentMethod('card')}
                                className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm"><CreditCard className="text-blue-600"/></div>
                                    <div>
                                        <p className="font-black text-slate-800">Thẻ tín dụng / Ghi nợ</p>
                                        <p className="text-xs text-slate-400 font-medium">Visa, Mastercard, JCB...</p>
                                    </div>
                                </div>
                                {paymentMethod === 'card' && <CheckCircle2 className="text-blue-600" size={24} />}
                            </div>

                            {/* Ví điện tử */}
                            <div 
                                onClick={() => setPaymentMethod('wallet')}
                                className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between ${paymentMethod === 'wallet' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm"><Wallet className="text-pink-600"/></div>
                                    <div>
                                        <p className="font-black text-slate-800">Ví điện tử MoMo / VNPay</p>
                                        <p className="text-xs text-slate-400 font-medium">Thanh toán nhanh qua QR Code</p>
                                    </div>
                                </div>
                                {paymentMethod === 'wallet' && <CheckCircle2 className="text-blue-600" size={24} />}
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                            <ShieldCheck className="text-green-600 shrink-0" size={20} />
                            <p className="text-xs text-slate-500 leading-relaxed italic">
                                Dữ liệu thanh toán của bạn được mã hóa và bảo mật tuyệt đối theo tiêu chuẩn quốc tế. 
                                TravelAI không lưu trữ thông tin thẻ của khách hàng.
                            </p>
                        </div>
                    </div>
                </div>

                {/* BÊN PHẢI: TÓM TẮT ĐƠN HÀNG (1 cột) */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl text-white p-8 sticky top-32 overflow-hidden">
                        <Lock className="absolute -top-4 -right-4 size-32 text-white/5 rotate-12" />
                        
                        <h3 className="text-xl font-black mb-6 relative z-10">Tóm tắt đơn hàng</h3>
                        
                        <div className="space-y-4 mb-8 relative z-10">
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dịch vụ</p>
                                <p className="font-black text-lg text-blue-400 line-clamp-2">{booking.serviceName || "Dịch vụ du lịch"}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ngày đi</p>
                                    <div className="flex items-center gap-1.5 mt-1 font-bold">
                                        <Calendar size={14} className="text-blue-400"/>
                                        {new Date(booking.checkInDate).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Số lượng</p>
                                    <div className="flex items-center gap-1.5 mt-1 font-bold">
                                        <Users size={14} className="text-blue-400"/>
                                        {booking.quantity} khách
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8 relative z-10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-300">Tổng tiền thanh toán</span>
                                <span className="text-2xl font-black text-white">
                                    {new Intl.NumberFormat('vi-VN').format(booking.totalAmount)}₫
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 text-right">Đã bao gồm thuế và phí dịch vụ</p>
                        </div>

                        <button 
                            onClick={handlePayment}
                            disabled={paying}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
                        >
                            {paying ? <Loader2 className="animate-spin" /> : "XÁC NHẬN THANH TOÁN"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;