import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  AlertCircle,
  BarChart3,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshPartnerStatus } from '../../utils/userUtils';

type PartnerProfileGate = {
  verificationStatus?: string;
  reviewNote?: string | null;
  canCreateServices?: boolean;
};

const ManagePartnerServices = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['partner-services-page'],
    queryFn: async () => {
      await refreshPartnerStatus();
      const [servicesResponse, profileResponse] = await Promise.all([
        axiosClient.get('/services/my-services'),
        axiosClient.get('/partner/profile'),
      ]);
      return {
        services: servicesResponse.data ?? [],
        profile: profileResponse.data ?? null,
      };
    },
  });

  const myServices: any[] = data?.services ?? [];
  const profile: PartnerProfileGate | null = data?.profile ?? null;

  // Auto-refresh profile every 10s if not approved yet
  useEffect(() => {
    if (profile?.canCreateServices) return;

    const intervalId = setInterval(async () => {
      const updatedUser = await refreshPartnerStatus();
      await queryClient.invalidateQueries({ queryKey: ['partner-services-page'] });
      if (updatedUser?.canCreateServices) {
        window.dispatchEvent(new Event('userUpdated'));
      }
    }, 10_000);

    return () => clearInterval(intervalId);
  }, [profile?.canCreateServices, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/services/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partner-services-page'] });
    },
    onError: () => {
      alert('Lỗi khi xóa dịch vụ!');
    },
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const canCreateServices = Boolean(profile?.canCreateServices);

  const handleDelete = (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBlockedAction = () => {
    alert('Hồ sơ đối tác chưa được duyệt. Vui lòng hoàn thiện và gửi hồ sơ tại trang Hồ sơ doanh nghiệp.');
    navigate('/partner/profile');
  };

  const handleRefreshProfile = async () => {
    try {
      setIsRefreshing(true);
      const updatedUser = await refreshPartnerStatus();
      await queryClient.invalidateQueries({ queryKey: ['partner-services-page'] });
      if (updatedUser?.canCreateServices) {
        alert('Hồ sơ của bạn đã được duyệt! Bạn có thể đăng dịch vụ ngay bây giờ.');
        window.dispatchEvent(new Event('userUpdated'));
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 text-left">
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">DỊCH VỤ CỦA TÔI</h1>
          <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">Quản lý và theo dõi hiệu quả kinh doanh các Khách sạn/Tour của bạn.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/partner/dashboard')} 
            className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-5 py-3 font-bold text-sm text-white transition-all hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 cursor-pointer"
          >
            <BarChart3 size={16} /> Bảng điều khiển
          </button>
          <button 
            onClick={() => navigate('/partner/reviews')} 
            className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-5 py-3 font-bold text-sm text-white transition-all hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 cursor-pointer"
          >
            <MessageSquare size={16} /> Xem đánh giá
          </button>
          <button
            onClick={() => (canCreateServices ? navigate('/partner/services/add') : handleBlockedAction())}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
              canCreateServices 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Plus size={18} /> Đăng dịch vụ mới
          </button>
        </div>
      </div>

      {!canCreateServices && (
        <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 text-amber-600 dark:text-amber-400" size={18} />
            <div className="flex-grow">
              <p className="font-black text-amber-900 dark:text-amber-300">Tài khoản đối tác chưa được phê duyệt</p>
              <p className="mt-1 text-sm font-medium text-amber-800 dark:text-amber-400">
                Chỉ khi hồ sơ doanh nghiệp được quản trị viên duyệt thì bạn mới có thể đăng hoặc cập nhật dịch vụ.
              </p>
              {profile?.reviewNote && (
                <p className="mt-2 text-sm font-semibold text-amber-900 dark:text-amber-300">Ghi chú admin: {profile.reviewNote}</p>
              )}
            </div>
            <button
              onClick={handleRefreshProfile}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              title="Kiểm tra lại trạng thái duyệt"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-32"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
      ) : myServices.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {myServices.map((service) => (
            <div key={service.serviceId} className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                {service.imageUrls?.[0] ? (
                  <img 
                    src={`http://localhost:5134${service.imageUrls[0]}`} 
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" 
                    alt={service.name} 
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <ImageIcon size={32} className="stroke-[1.5]" />
                    <span className="text-[10px] font-black uppercase mt-1">Chưa có ảnh</span>
                  </div>
                )}
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[9px] font-black uppercase text-white shadow-sm ${service.isActive ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                  {service.isActive ? 'Đang hiển thị' : 'Chờ duyệt'}
                </span>
              </div>

              <div className="mb-4 flex-grow text-left">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  {service.serviceType === 'Hotel' ? 'Khách sạn' : 'Tour du lịch'}
                </span>
                <h3 className="mb-1 line-clamp-1 text-lg font-black text-slate-800 dark:text-white leading-snug">{service.name}</h3>
                <p className="font-black text-blue-600 dark:text-blue-400 text-base">{new Intl.NumberFormat('vi-VN').format(service.basePrice)}₫</p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => (canCreateServices ? navigate(`/partner/services/${service.serviceId}/manage`) : handleBlockedAction())}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all cursor-pointer active:scale-95 duration-200 ${
                    canCreateServices 
                      ? 'bg-slate-900 dark:bg-slate-700 hover:bg-blue-600 dark:hover:bg-blue-600 text-white' 
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Settings2 size={14} /> QUẢN LÝ CHI TIẾT
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => (canCreateServices ? navigate(`/partner/services/edit/${service.serviceId}`) : handleBlockedAction())}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border cursor-pointer active:scale-95 duration-200 ${
                      canCreateServices
                        ? 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
                    }`}
                  >
                    Chỉnh sửa
                  </button>
                  <button 
                    onClick={() => handleDelete(service.serviceId)} 
                    className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-2 text-rose-500 hover:bg-rose-600 hover:text-white transition-all cursor-pointer active:scale-95 duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 py-32 text-center">
          <p className="font-bold text-slate-400 dark:text-slate-500">Bạn chưa đăng dịch vụ nào.</p>
        </div>
      )}
    </div>
  );
};

export default ManagePartnerServices;
