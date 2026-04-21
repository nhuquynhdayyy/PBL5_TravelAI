import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Coffee,
    DollarSign,
    Download,
    Map,
    MapPin,
    Moon,
    Share2,
    Sparkles,
    Sun,
    Zap
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const parseLocalDate = (value?: string) => {
    if (!value) {
        return null;
    }

    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    if (!year || !month || !day)
    {
        return null;
    }

    return new Date(year, month - 1, day);
};

const formatDateLabel = (date: Date) =>
    new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);

const toInputDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Timeline: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [data] = useState<any>(location.state?.data || null);
    const [loading] = useState(false);

    const tripStartDate = parseLocalDate(data?.startDate ?? data?.start_date);
    const tripEndDate = parseLocalDate(data?.endDate ?? data?.end_date);

    const getActivityIcon = (index: number) => {
        if (index === 0) {
            return <Coffee className="size-5" />;
        }

        if (index === 1) {
            return <Sun className="size-5" />;
        }

        return <Moon className="size-5" />;
    };

    const getDayDate = (dayNumber: number) => {
        if (!tripStartDate) {
            return null;
        }

        const date = new Date(tripStartDate);
        date.setDate(date.getDate() + Math.max(dayNumber - 1, 0));
        return date;
    };

    const getServiceId = (activity: any) => activity?.serviceId ?? activity?.service_id ?? null;

    const openServiceDetail = (activity: any, dayDate: Date | null) => {
        const serviceId = getServiceId(activity);
        if (!serviceId) {
            return;
        }

        const query = dayDate ? `?date=${toInputDateValue(dayDate)}` : '';
        navigate(`/services/${serviceId}${query}`);
    };

    const firstBookableActivity = useMemo(() => {
        if (!data?.days?.length) {
            return null;
        }

        for (const day of data.days) {
            const dayDate = getDayDate(day.day);

            for (const activity of day.activities ?? []) {
                if (getServiceId(activity)) {
                    return { activity, dayDate };
                }
            }
        }

        return null;
    }, [data, tripStartDate]);

    const tripLastDayDate = tripStartDate
        ? getDayDate(Math.max(data?.days?.length ?? 1, 1))
        : (tripEndDate
            ? new Date(tripEndDate.getFullYear(), tripEndDate.getMonth(), tripEndDate.getDate() - 1)
            : null);

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login', { state: { from: '/itinerary/latest' }, replace: false });
            return;
        }

        try {
            const response = await axiosClient.post('/itinerary/save', data);
            if (response.data.success) {
                alert("🎉 Tuyệt vời! Lịch trình đã được lưu vào mục 'Chuyến đi của tôi'.");
                navigate('/profile');
            }
        } catch (error) {
            console.error(error);
            alert('Không thể lưu lịch trình lúc này.');
        }
    };

    if (loading) {
        return (
            <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
                <div className="size-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-slate-500">
                    AI đang vẽ lịch trình cho bạn...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
                <div className="text-6xl">🗺️</div>
                <h2 className="text-2xl font-black text-slate-800">Chưa có lịch trình nào</h2>
                <p className="max-w-sm text-slate-400">
                    Hãy chọn một điểm đến và để AI lên kế hoạch cho chuyến đi của bạn!
                </p>
                <button
                    onClick={() => navigate('/destinations')}
                    className="rounded-2xl bg-blue-600 px-8 py-4 font-black text-white hover:bg-blue-700"
                >
                    Khám phá điểm đến →
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto mb-20 max-w-5xl animate-in fade-in px-4 py-8 duration-1000">
            <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-blue-500"
                    >
                        <ArrowLeft size={18} /> QUAY LẠI
                    </button>
                    <h1 className="mb-2 text-5xl font-black italic tracking-tighter text-slate-900">
                        {data.tripTitle}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-slate-500">
                        <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                            <MapPin size={14} className="text-blue-500" /> {data.destination}
                        </span>
                        <span className="flex items-center gap-1 rounded-lg border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-green-600">
                            <DollarSign size={14} /> Tổng chi phí: {new Intl.NumberFormat('vi-VN').format(data.totalEstimatedCost)}₫
                        </span>
                        {tripStartDate && (
                            <span className="flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-600">
                                <Calendar size={14} />
                                {formatDateLabel(tripStartDate)}
                                {tripLastDayDate ? ` - ${formatDateLabel(tripLastDayDate)}` : ''}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:bg-slate-50">
                        <Download size={20} />
                    </button>
                    <button className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:bg-slate-50">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            <div className="space-y-16">
                {data.days.map((day: any) => {
                    const dayDate = getDayDate(day.day);

                    return (
                        <div key={day.day} className="relative">
                            <div className="sticky top-24 z-10 mb-10">
                                <div className="inline-flex -rotate-2 flex-col items-start gap-1 rounded-2xl bg-slate-900 px-6 py-3 text-white shadow-xl">
                                    <div className="inline-flex items-center gap-3">
                                        <Calendar size={20} className="text-blue-400" />
                                        <span className="text-xl font-black uppercase tracking-tighter">Ngày {day.day}</span>
                                    </div>
                                    {dayDate && (
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                                            {formatDateLabel(dayDate)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="relative ml-6 space-y-10 border-l-4 border-dashed border-slate-200 pl-10">
                                {(day.activities ?? []).map((activity: any, idx: number) => {
                                    const serviceId = getServiceId(activity);

                                    return (
                                        <div key={idx} className="group relative">
                                            <div className={`absolute -left-[58px] top-6 z-20 flex size-10 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition-all duration-500 group-hover:scale-125 ${
                                                idx === 0 ? 'bg-orange-400' : idx === 1 ? 'bg-blue-500' : 'bg-indigo-600'
                                            }`}>
                                                {getActivityIcon(idx)}
                                            </div>

                                            <div className="group/card relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
                                                <div className="absolute right-0 top-0 p-4 opacity-0 transition-opacity group-hover/card:opacity-100">
                                                    <Sparkles className="size-20 rotate-12 text-blue-500/20" />
                                                </div>

                                                <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row">
                                                    <div className="flex-1">
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                                {idx === 0 ? 'Buổi sáng' : idx === 1 ? 'Buổi chiều' : 'Buổi tối'}
                                                            </span>
                                                            {serviceId && (
                                                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                                    Dịch vụ thật
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="mb-3 text-2xl font-black leading-tight text-slate-800 transition-colors group-hover/card:text-blue-600">
                                                            {activity.title}
                                                        </h3>
                                                        <p className="mb-6 font-medium leading-relaxed text-slate-500">
                                                            {activity.description}
                                                        </p>

                                                        <div className="flex flex-wrap gap-4">
                                                            <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400">
                                                                <MapPin size={14} className="text-red-400" /> {activity.location}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400">
                                                                <Clock size={14} className="text-blue-400" /> {activity.duration}
                                                            </div>
                                                            {dayDate && (
                                                                <div className="flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
                                                                    <Calendar size={14} /> {formatDateLabel(dayDate)}
                                                                </div>
                                                            )}
                                                            {serviceId && (
                                                                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                                                                    service_id: {serviceId}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 items-end justify-end gap-3 md:flex-col">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                                            Chi phí dự kiến
                                                        </p>
                                                        <div className="rounded-2xl bg-slate-900 px-5 py-2.5 text-lg font-black text-white shadow-lg">
                                                            ~{new Intl.NumberFormat('vi-VN').format(activity.estimatedCost)}₫
                                                        </div>
                                                        {serviceId && (
                                                            <button
                                                                onClick={() => openServiceDetail(activity, dayDate)}
                                                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-emerald-400"
                                                            >
                                                                <Zap size={16} />
                                                                ĐẶT NGAY
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="relative mt-20 overflow-hidden rounded-[4rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-center shadow-2xl">
                <Map className="absolute -bottom-10 -left-10 size-64 -rotate-12 text-white/5" />
                <h3 className="relative z-10 mb-4 text-3xl font-black uppercase tracking-tighter text-white">
                    Sẵn sàng lên đường?
                </h3>
                <p className="relative z-10 mx-auto mb-10 max-w-lg leading-relaxed text-blue-100">
                    Mọi thứ đã được AI chuẩn bị sẵn sàng. Hãy lưu lại lịch trình này để làm hành trang cho chuyến đi sắp tới nhé!
                </p>
                <div className="relative z-10 flex flex-wrap justify-center gap-4">
                    <button
                        onClick={handleSave}
                        className="rounded-2xl bg-white px-10 py-4 font-black text-blue-600 shadow-lg transition-all hover:scale-105"
                    >
                        LƯU VÀO TÀI KHOẢN
                    </button>
                    <button
                        onClick={() => firstBookableActivity && openServiceDetail(firstBookableActivity.activity, firstBookableActivity.dayDate)}
                        disabled={!firstBookableActivity}
                        className="rounded-2xl border-2 border-white/20 bg-blue-500 px-10 py-4 font-black text-white transition-all hover:bg-blue-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        ĐẶT NGAY
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
