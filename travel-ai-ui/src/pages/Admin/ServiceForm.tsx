import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  ArrowLeft,
  Loader2,
  MapPinned,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { refreshPartnerStatus, getUser } from '../../utils/userUtils';

type DestinationOption = {
  id: number;
  name: string;
};

type SpotOption = {
  spotId: number;
  destinationId: number;
  name: string;
};

const ServiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [canCreateServices, setCanCreateServices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [spots, setSpots] = useState<SpotOption[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    serviceType: '0',
    spotId: '',
  });
  const [images, setImages] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const user = getUser();
    if (user?.roleName?.toLowerCase() === 'partner') {
      // Refresh partner status và cập nhật localStorage
      refreshPartnerStatus()
        .then((updatedUser) => {
          if (updatedUser?.canCreateServices === false) {
            setCanCreateServices(false);
          }
          setProfileChecked(true);
        })
        .catch((err) => {
          console.error(err);
          setProfileChecked(true);
        });
    } else {
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    const user = getUser();
    if (user?.roleName?.toLowerCase() === 'partner' && !canCreateServices) {
      // Auto-refresh profile status every 10 seconds if not approved yet
      const intervalId = setInterval(async () => {
        const updatedUser = await refreshPartnerStatus();
        if (updatedUser?.canCreateServices === true) {
          setCanCreateServices(true);
          // Trigger re-render toàn bộ app
          window.dispatchEvent(new Event('userUpdated'));
        } else if (updatedUser?.canCreateServices === false) {
          setCanCreateServices(false);
        }
      }, 10000); // 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [canCreateServices]);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await axiosClient.get('/destinations');
        setDestinations(response.data?.data ?? []);
      } catch (err) {
        console.error(err);
      }
    };

    void fetchDestinations();
  }, []);

  useEffect(() => {
    if (!selectedDestinationId) {
      setSpots([]);
      return;
    }

    const fetchSpots = async () => {
      try {
        setLoadingSpots(true);
        const response = await axiosClient.get(`/spots/by-destination/${selectedDestinationId}`);
        const nextSpots = response.data?.data ?? [];
        setSpots(nextSpots);

        if (
          formData.spotId &&
          !nextSpots.some((spot: SpotOption) => spot.spotId.toString() === formData.spotId)
        ) {
          setFormData((prev) => ({ ...prev, spotId: '' }));
        }
      } catch (err) {
        console.error(err);
        setSpots([]);
      } finally {
        setLoadingSpots(false);
      }
    };

    void fetchSpots();
  }, [selectedDestinationId]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const fetchService = async () => {
      setFetching(true);
      try {
        const res = await axiosClient.get(`/services/${id}`);
        const data = res.data;

        setFormData({
          name: data.name || '',
          description: data.description || '',
          basePrice: data.basePrice?.toString() || '',
          serviceType: data.serviceType === 'Hotel' ? '0' : '1',
          spotId: data.spotId?.toString() || '',
        });

        if (data.spotId) {
          const spotResponse = await axiosClient.get(`/spots/${data.spotId}`);
          const spot = spotResponse.data?.data;
          if (spot?.destinationId) {
            setSelectedDestinationId(spot.destinationId.toString());
          }
        }

        if (data.imageUrls) {
          setPreviews(data.imageUrls.map((url: string) => `http://localhost:5134${url}`));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    void fetchService();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.spotId) {
      alert('Vui long chon dia diem cu the cho dich vu.');
      return;
    }

    setLoading(true);

    const payload = new FormData();
    payload.append('Name', formData.name);
    payload.append('Description', formData.description || '');
    payload.append('BasePrice', formData.basePrice);
    payload.append('ServiceType', formData.serviceType);
    payload.append('Latitude', '0');
    payload.append('Longitude', '0');
    payload.append('SpotId', formData.spotId);

    if (images && images.length > 0) {
      Array.from(images).forEach((file) => payload.append('Images', file));
    }

    try {
      let targetId = id;
      if (id) {
        await axiosClient.put(`/services/${id}`, payload);
      } else {
        const res = await axiosClient.post('/services', payload);
        targetId = res.data.serviceId;
      }

      alert(
        id
          ? 'Cap nhat thanh cong. Dich vu da quay lai trang thai cho admin duyet.'
          : 'Tao dich vu thanh cong. Dich vu se cho admin duyet truoc khi hien thi public.'
      );

      navigate(`/partner/services/${targetId}/manage`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Loi khi luu du lieu. Vui long kiem tra lai!');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      setRefreshing(true);
      const updatedUser = await refreshPartnerStatus();
      if (updatedUser?.canCreateServices === true) {
        setCanCreateServices(true);
        alert('Ho so cua ban da duoc duyet! Ban co the dang dich vu ngay bay gio.');
        // Trigger re-render toàn bộ app
        window.dispatchEvent(new Event('userUpdated'));
      } else {
        alert('Ho so cua ban van chua duoc duyet. Vui long cho admin xem xet.');
      }
    } catch (err) {
      console.error(err);
      alert('Khong the cap nhat trang thai. Vui long thu lai.');
    } finally {
      setRefreshing(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="font-bold text-slate-400">Dang tai du lieu...</p>
      </div>
    );
  }

  if (!canCreateServices) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[2.5rem] border border-amber-200 bg-amber-50 p-10 text-left">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-3 text-3xl font-black text-amber-900">Ho so partner chua duoc duyet</h2>
              <p className="font-medium leading-7 text-amber-800">
                Ban can hoan thien ho so doanh nghiep va cho admin phe duyet truoc khi dang hoac cap nhat dich vu.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/partner/profile')}
              className="rounded-2xl bg-amber-600 px-6 py-3 font-black text-white transition-all hover:bg-amber-700"
            >
              Ve trang Business
            </button>
            <button
              onClick={handleRefreshProfile}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-2xl bg-slate-600 px-6 py-3 font-black text-white transition-all hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Dang kiem tra...' : 'Kiem tra lai'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 font-bold text-slate-500 transition-all hover:text-blue-600"
        >
          <ArrowLeft size={20} /> Quay lai
        </button>
      </div>

      <div className="overflow-hidden rounded-[3rem] border border-slate-100 bg-white shadow-2xl">
        <div className="bg-slate-900 p-10 text-left text-white">
          <h2 className="mb-2 text-4xl font-black tracking-tighter">
            {id ? 'Chinh sua dich vu' : 'Dang dich vu moi'}
          </h2>
          <p className="font-medium italic text-slate-400">
            Dich vu bat buoc phai gan voi dia diem cu the de admin theo doi booking va doanh thu theo diem den.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 p-10 text-left">
          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              Ten khach san / Tour du lich
            </label>
            <input
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-700 outline-none focus:border-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                Gia co ban (VND)
              </label>
              <input
                type="number"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-bold"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                Loai hinh
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-black text-blue-600"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              >
                <option value="0">KHACH SAN</option>
                <option value="1">TOUR DU LICH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                <MapPinned size={14} /> Diem den
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-700 outline-none focus:border-blue-500"
                value={selectedDestinationId}
                onChange={(e) => {
                  setSelectedDestinationId(e.target.value);
                  setFormData((prev) => ({ ...prev, spotId: '' }));
                }}
                required
              >
                <option value="">Chon diem den</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                Dia diem cu the
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-bold text-slate-700 outline-none focus:border-blue-500 disabled:text-slate-400"
                value={formData.spotId}
                onChange={(e) => {
                  const nextSpotId = e.target.value;
                  const selectedSpot = spots.find((spot) => spot.spotId.toString() === nextSpotId);

                  setFormData((prev) => ({ ...prev, spotId: nextSpotId }));

                  if (selectedSpot) {
                    setSelectedDestinationId(selectedSpot.destinationId.toString());
                  }
                }}
                disabled={!selectedDestinationId || loadingSpots}
                required
              >
                <option value="">
                  {!selectedDestinationId
                    ? 'Chon diem den truoc'
                    : loadingSpots
                      ? 'Dang tai dia diem...'
                      : 'Chon dia diem'}
                </option>
                {spots.map((spot) => (
                  <option key={spot.spotId} value={spot.spotId}>
                    {spot.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              Mo ta chi tiet
            </label>
            <textarea
              className="h-40 w-full rounded-[2rem] border-2 border-slate-100 bg-slate-50 p-4 font-medium text-slate-600 outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              Hinh anh
            </label>
            <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8">
              <div className="mb-4 flex flex-wrap gap-4">
                {previews.map((preview, index) => (
                  <img
                    key={index}
                    src={preview}
                    className="h-24 w-32 rounded-2xl border-4 border-white object-cover shadow-md"
                  />
                ))}
                <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500">
                  <Upload size={24} className="text-slate-400" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        setImages(event.target.files);
                        setPreviews(Array.from(event.target.files).map((file) => URL.createObjectURL(file)));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-blue-600 py-5 text-xl font-black text-white shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            {id ? 'CAP NHAT DICH VU' : 'LUU VA TIEP TUC'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceForm;
