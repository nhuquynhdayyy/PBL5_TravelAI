// src/pages/ServiceDetail.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { ArrowLeft, MapPin, Star, Loader2, Calendar, Users, Zap } from 'lucide-react';

const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [activeImg, setActiveImg] = useState(0);

    // --- STATE ĐẶT CHỖ ---
    const [selectedDate, setSelectedDate] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [actualPrice, setActualPrice] = useState<number>(service?.basePrice ?? 0);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/services/${id}`);
                setService(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchDetail();
    }, [id]);

    useEffect(() => {
        setActualPrice(service?.basePrice ?? 0);
    }, [service?.basePrice]);

    useEffect(() => {
        if (!service) {
            return;
        }

        if (!selectedDate) {
            setActualPrice(service.basePrice ?? 0);
            return;
        }

        let isActive = true;

        axiosClient.get(`/availability/check/${service.serviceId}`, {
            params: { date: selectedDate, qty: 1 }
        }).then(res => {
            if (!isActive) {
                return;
            }

            setActualPrice(res.data?.price ?? service.basePrice ?? 0);
        }).catch(() => {
            if (!isActive) {
                return;
            }

            setActualPrice(service.basePrice ?? 0);
        });

        return () => {
            isActive = false;
        };
    }, [selectedDate, service?.serviceId, service?.basePrice]);

    const handleBooking = async () => {
        if (!selectedDate) {
            alert("Vui lòng chọn ngày bạn muốn sử dụng dịch vụ!");
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để đặt chỗ!");
            navigate('/login');
            return;
        }

        try {
            setBookingLoading(true);
            const res = await axiosClient.post('/bookings/draft', {
                serviceId: service.serviceId,
                quantity: quantity,
                checkInDate: selectedDate
            });

            if (res.data.bookingId) {
                alert("Tạo đơn hàng thành công! Đang chuyển đến trang thanh toán...");
                navigate(`/checkout/${res.data.bookingId}`);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || "Ngày này đã hết chỗ, vui lòng chọn ngày khác!");
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
    if (!service) return <div className="text-center p-20 font-bold">Không tìm thấy dịch vụ.</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 mb-20">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 font-bold">
                <ArrowLeft size={20} /> Quay lại danh sách
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* BÊN TRÁI: HÌNH ẢNH & THÔNG TIN (2 cột) */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                        <img src={`http://localhost:5134${service.imageUrls[activeImg]}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {service.imageUrls?.map((img: string, i: number) => (
                            <img key={i} src={`http://localhost:5134${img}`} onClick={() => setActiveImg(i)} 
                                 className={`h-24 w-32 rounded-2xl object-cover cursor-pointer border-4 transition-all ${activeImg === i ? 'border-blue-500 scale-105' : 'border-transparent opacity-50'}`} />
                        ))}
                    </div>

                    <div className="text-left">
                        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">{service.name}</h1>
                        <div className="flex items-center gap-6 text-slate-500 font-bold mb-8">
                            <span className="flex items-center gap-1.5"><MapPin size={20} className="text-red-500"/> {service.spotName}</span>
                            <span className="flex items-center gap-1.5"><Star size={20} className="text-orange-400 fill-orange-400"/> {service.ratingAvg} Đánh giá</span>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm leading-relaxed text-slate-600 text-lg">
                            <h3 className="text-xl font-black text-slate-800 mb-4">Mô tả dịch vụ</h3>
                            {service.description}
                        </div>
                    </div>
                </div>

                {/* BÊN PHẢI: WIDGET ĐẶT CHỖ (1 cột) - ĐÂY LÀ CHỖ CHO CUSTOMER CHỌN */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 p-8 sticky top-32 text-left">
                        <div className="mb-6">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Giá mỗi lượt từ</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(actualPrice)}₫</span>
                                <span className="text-slate-400 font-bold text-sm">/ khách</span>
                            </div>
                        </div>

                        <div className="space-y-6 border-t pt-6">
                            {/* Chọn ngày */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase mb-3"><Calendar size={14}/> Chọn ngày sử dụng</label>
                                <input 
                                    type="date" 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày quá khứ
                                />
                            </div>

                            {/* Chọn số lượng */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase mb-3"><Users size={14}/> Số lượng người</label>
                                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-2">
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="size-10 flex items-center justify-center bg-white rounded-xl shadow-sm font-black text-xl hover:bg-blue-500 hover:text-white transition-all">-</button>
                                    <span className="flex-1 text-center font-black text-lg">{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} className="size-10 flex items-center justify-center bg-white rounded-xl shadow-sm font-black text-xl hover:bg-blue-500 hover:text-white transition-all">+</button>
                                </div>
                            </div>

                            {/* Tổng tiền */}
                            <div className="bg-blue-50 p-6 rounded-3xl">
                                <div className="flex justify-between items-center text-blue-900 font-bold mb-1">
                                    <span>Tổng cộng:</span>
                                    <span className="text-xl font-black">{new Intl.NumberFormat('vi-VN').format(actualPrice * quantity)}₫</span>
                                </div>
                                <p className="text-[10px] text-blue-400 font-bold uppercase">Đã bao gồm thuế và phí dịch vụ</p>
                            </div>

                            <button 
                                onClick={handleBooking}
                                disabled={bookingLoading}
                                className="w-full bg-slate-900 hover:bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {bookingLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor"/>}
                                ĐẶT CHỖ NGAY
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceDetail;
