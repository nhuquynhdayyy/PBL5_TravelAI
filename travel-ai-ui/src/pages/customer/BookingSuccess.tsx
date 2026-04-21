// src/pages/customer/BookingSuccess.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { CheckCircle, Printer, Home, Calendar, Users, Loader2 } from 'lucide-react';

const BookingSuccess = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const res = await axiosClient.get(`/bookings/${bookingId}`);
                setBooking(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBill();
    }, [bookingId]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-2xl mx-auto py-16 px-4">
            <div className="text-center mb-10 animate-in zoom-in duration-500">
                <div className="inline-flex items-center justify-center size-20 bg-green-100 text-green-600 rounded-full mb-4 shadow-lg shadow-green-100">
                    <CheckCircle size={48} />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Thanh toán hoàn tất!</h1>
                <p className="text-slate-500 font-medium mt-2">Cảm ơn bạn đã tin tưởng dịch vụ của TravelAI</p>
            </div>

            {/* PHẦN TỜ HÓA ĐƠN (BILL) */}
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 relative animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Hiệu ứng dấu mộc ĐÃ THANH TOÁN */}
                <div className="absolute top-10 right-10 border-4 border-red-500/30 text-red-500/30 font-black text-2xl px-4 py-2 rounded-xl rotate-12 uppercase pointer-events-none">
                    PAID - ĐÃ XÁC NHẬN
                </div>

                <div className="p-10">
                    <div className="flex justify-between items-start border-b border-dashed pb-8 mb-8">
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã đơn hàng</p>
                            <p className="font-black text-xl text-blue-600">#BK-000{booking?.bookingId}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày giao dịch</p>
                            <p className="font-bold text-slate-700">{new Date().toLocaleDateString('vi-VN')}</p>
                        </div>
                    </div>

                    <div className="space-y-6 text-left">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thông tin dịch vụ</p>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{booking?.serviceName}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-50">
                            <div>
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <Calendar size={14}/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Ngày nhận</span>
                                </div>
                                <p className="font-bold text-slate-700">{new Date(booking?.checkInDate).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <Users size={14}/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Khách hàng</span>
                                </div>
                                <p className="font-bold text-slate-700">{booking?.quantity} người lớn</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Đơn giá tạm tính:</span>
                                <span className="font-bold text-slate-700">{new Intl.NumberFormat('vi-VN').format(booking?.totalAmount)}₫</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Thuế & Phí sàn:</span>
                                <span className="font-bold text-slate-700">Miễn phí</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <span className="text-lg font-black text-slate-900">TỔNG TIỀN:</span>
                                <span className="text-2xl font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(booking?.totalAmount)}₫</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer tờ hóa đơn với răng cưa mô phỏng */}
                <div className="h-4 bg-[radial-gradient(circle,transparent_8px,#f8fafc_8px)] bg-[length:24px_24px] bg-repeat-x -mt-2"></div>
            </div>

            {/* CÁC NÚT HÀNH ĐỘNG */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <button 
                    onClick={() => navigate('/my-bookings')}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                >
                    XEM BOOKINGS CUA TOI
                </button>
                <button 
                    onClick={() => navigate('/')}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                >
                    <Home size={18} /> VỀ TRANG CHỦ
                </button>
                <button 
                    onClick={() => window.print()} // Mẹo: Cho phép in hóa đơn nhanh
                    className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                >
                    <Printer size={18} /> IN HÓA ĐƠN
                </button>
            </div>
        </div>
    );
};

export default BookingSuccess;
