import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  AlertCircle,
  BarChart3,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type PartnerProfileGate = {
  verificationStatus?: string;
  reviewNote?: string | null;
  canCreateServices?: boolean;
};

const ManagePartnerServices = () => {
  const [myServices, setMyServices] = useState<any[]>([]);
  const [profile, setProfile] = useState<PartnerProfileGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesResponse, profileResponse] = await Promise.all([
        axiosClient.get('/services/my-services'),
        axiosClient.get('/partner/profile')
      ]);
      setMyServices(servicesResponse.data || []);
      setProfile(profileResponse.data || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    // Auto-refresh profile status every 10 seconds if not approved yet
    if (!profile?.canCreateServices) {
      const intervalId = setInterval(() => {
        axiosClient.get('/partner/profile')
          .then(response => {
            setProfile(response.data || null);
          })
          .catch(error => {
            console.error('Failed to refresh profile:', error);
          });
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [profile?.canCreateServices]);

  const canCreateServices = Boolean(profile?.canCreateServices);

  const handleDelete = async (id: number) => {
    if (window.confirm('Ban co chac chan muon xoa dich vu nay?')) {
      try {
        await axiosClient.delete(`/services/${id}`);
        setMyServices((previous) => previous.filter((service) => service.serviceId !== id));
        alert('Da xoa thanh cong!');
      } catch {
        alert('Loi khi xoa!');
      }
    }
  };

  const handleBlockedAction = () => {
    alert('Ho so doi tac chua duoc duyet. Vui long hoan thien va gui ho so trong trang Business.');
    navigate('/partner/profile');
  };

  const handleRefreshProfile = async () => {
    try {
      setRefreshing(true);
      const profileResponse = await axiosClient.get('/partner/profile');
      setProfile(profileResponse.data || null);
      
      if (profileResponse.data?.canCreateServices) {
        alert('Ho so cua ban da duoc duyet! Ban co the dang dich vu ngay bay gio.');
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      alert('Khong the cap nhat trang thai. Vui long thu lai.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-12 flex flex-col items-center justify-between gap-6 text-left md:flex-row">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">DICH VU CUA TOI</h1>
          <p className="font-medium text-slate-500">Quan ly va theo doi hieu qua kinh doanh cac Khach san/Tour cua ban.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/partner/dashboard')} className="flex items-center gap-2 rounded-[2rem] bg-slate-900 px-6 py-4 font-black text-white shadow-xl transition-all active:scale-95">
            <BarChart3 size={20} /> Xem dashboard
          </button>
          <button onClick={() => navigate('/partner/reviews')} className="rounded-[2rem] bg-slate-900 px-6 py-4 font-black text-white shadow-xl transition-all active:scale-95">
            Xem review
          </button>
          <button
            onClick={() => (canCreateServices ? navigate('/partner/services/add') : handleBlockedAction())}
            className={`flex items-center gap-2 rounded-[2rem] px-8 py-4 font-black shadow-xl transition-all active:scale-95 ${
              canCreateServices ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            <Plus size={22} /> Dang dich vu moi
          </button>
        </div>
      </div>

      {!canCreateServices && (
        <div className="mb-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 text-amber-600" size={18} />
            <div className="flex-grow">
              <p className="font-black text-amber-900">Tai khoan partner chua duoc phe duyet</p>
              <p className="mt-1 text-sm font-medium text-amber-800">
                Chi khi ho so o trang Business duoc admin duyet thi ban moi co the dang hoac cap nhat dich vu.
              </p>
              {profile?.reviewNote && (
                <p className="mt-2 text-sm font-semibold text-amber-900">Ghi chu admin: {profile.reviewNote}</p>
              )}
            </div>
            <button
              onClick={handleRefreshProfile}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-amber-700 disabled:opacity-50"
              title="Kiem tra lai trang thai duyet"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Dang kiem tra...' : 'Kiem tra lai'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-32"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
      ) : myServices.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {myServices.map((service) => (
            <div key={service.serviceId} className="flex h-full flex-col rounded-[2.5rem] border border-slate-50 bg-white p-6 shadow-xl transition-all duration-500 hover:shadow-2xl">
              <div className="relative mb-5 h-44 w-full overflow-hidden rounded-3xl">
                <img src={`http://localhost:5134${service.imageUrls?.[0]}`} className="h-full w-full object-cover" alt="" />
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase text-white ${service.isActive ? 'bg-green-500' : 'bg-amber-500'}`}>
                  {service.isActive ? 'Dang hien thi' : 'Cho duyet'}
                </span>
              </div>

              <div className="mb-6 flex-grow text-left">
                <h3 className="mb-1 line-clamp-1 text-xl font-black text-slate-800">{service.name}</h3>
                <p className="font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(service.basePrice)}VND</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => (canCreateServices ? navigate(`/partner/services/${service.serviceId}/manage`) : handleBlockedAction())}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black shadow-lg transition-all ${
                    canCreateServices ? 'bg-slate-900 text-white hover:bg-blue-600' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Settings2 size={18} /> QUAN LY CHI TIET
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => (canCreateServices ? navigate(`/partner/services/edit/${service.serviceId}`) : handleBlockedAction())}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold italic transition-colors ${
                      canCreateServices
                        ? 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    Sua
                  </button>
                  <button onClick={() => handleDelete(service.serviceId)} className="rounded-xl bg-red-50 p-2 text-red-400 transition-all hover:bg-red-500 hover:text-white">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[4rem] border-2 border-dashed border-slate-200 bg-slate-50 py-32 text-center">
          <p className="font-bold text-slate-400">Ban chua dang dich vu nao.</p>
        </div>
      )}
    </div>
  );
};

export default ManagePartnerServices;
