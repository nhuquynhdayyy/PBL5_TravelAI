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
  CheckCircle,
  XCircle,
  Image as ImageIcon
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

  // Custom modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      const intervalId = setInterval(async () => {
        const updatedUser = await refreshPartnerStatus();
        if (updatedUser?.canCreateServices === true) {
          setCanCreateServices(true);
          window.dispatchEvent(new Event('userUpdated'));
        } else if (updatedUser?.canCreateServices === false) {
          setCanCreateServices(false);
        }
      }, 10000);

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showSuccessModal || showErrorModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSuccessModal, showErrorModal]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.spotId) {
      setErrorMessage('Vui lòng chọn địa điểm danh thắng cụ thể cho dịch vụ.');
      setShowErrorModal(true);
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

      setSuccessMessage(
        id
          ? '✅ Cập nhật dịch vụ thành công! Dịch vụ đã quay lại trạng thái chờ Admin xem xét phê duyệt.'
          : '✅ Tạo dịch vụ thành công! Dịch vụ sẽ chờ Admin duyệt trước khi hiển thị công khai trên hệ thống.'
      );
      setShowSuccessModal(true);
      
      // Delay navigation a bit for the modal view
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate(`/partner/services/${targetId}/manage`);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại!');
      setShowErrorModal(true);
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
        setSuccessMessage('✅ Hồ sơ doanh nghiệp của bạn đã được duyệt thành công! Bạn có thể đăng dịch vụ ngay bây giờ.');
        setShowSuccessModal(true);
        window.dispatchEvent(new Event('userUpdated'));
      } else {
        setErrorMessage('Hồ sơ của bạn vẫn chưa được duyệt phê duyệt. Vui lòng kiên nhẫn chờ Admin xem xét.');
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Không thể cập nhật trạng thái. Vui lòng kiểm tra lại kết nối mạng.');
      setShowErrorModal(true);
    } finally {
      setRefreshing(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
        <p className="font-bold text-slate-400 dark:text-slate-500">Đang tải dữ liệu dịch vụ...</p>
      </div>
    );
  }

  if (!canCreateServices) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-left">
        <div className="rounded-[2.5rem] border-2 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-3 text-3xl font-black text-amber-900 dark:text-amber-400">Hồ sơ đối tác chưa được duyệt</h2>
              <p className="font-medium leading-7 text-amber-800 dark:text-amber-300">
                Bạn cần hoàn thiện thông tin hồ sơ doanh nghiệp và chờ Quản trị viên hệ thống phê duyệt trước khi đăng hoặc cập nhật các dịch vụ.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/partner/profile')}
              className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-3.5 font-black transition-all active:scale-95 cursor-pointer shadow-md shadow-amber-500/10"
            >
              Về trang Hồ sơ Business
            </button>
            <button
              onClick={handleRefreshProfile}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-3.5 font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại trạng thái'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 text-left">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={20} /> Quay lại trang trước
        </button>
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
        <div className="bg-slate-900 dark:bg-slate-950 p-8 sm:p-10 text-white">
          <h2 className="mb-3 text-4xl font-black tracking-tight">
            {id ? 'CHỈNH SỬA DỊCH VỤ' : 'ĐĂNG DỊCH VỤ MỚI'}
          </h2>
          <p className="font-medium text-slate-450 leading-relaxed max-w-2xl">
            Mỗi dịch vụ cần được liên kết với một địa danh, điểm đến cụ thể trên TravelAI để tối ưu hiển thị và phân loại doanh thu chuẩn xác.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8 sm:p-10">
          <div>
            <label className="mb-2.5 block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Tên dịch vụ (Khách sạn / Tour du lịch)
            </label>
            <input
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 transition-colors"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nhập tên khách sạn, homestay hoặc tiêu đề tour du lịch..."
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2.5 block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Giá bán cơ bản gốc (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 transition-colors"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                placeholder="Ví dụ: 500000"
                required
              />
            </div>
            <div>
              <label className="mb-2.5 block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Loại hình dịch vụ
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-black text-blue-600 dark:text-blue-400 outline-none focus:border-blue-500 cursor-pointer"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              >
                <option value="0">KHÁCH SẠN / LƯU TRÚ</option>
                <option value="1">TOUR DU LỊCH / TRẢI NGHIỆM</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <MapPinned size={14} className="text-blue-500" /> Tỉnh / Thành phố (Điểm đến)
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                value={selectedDestinationId}
                onChange={(e) => {
                  setSelectedDestinationId(e.target.value);
                  setFormData((prev) => ({ ...prev, spotId: '' }));
                }}
                required
              >
                <option value="">Chọn điểm đến</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2.5 block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Địa danh / Thắng cảnh cụ thể
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
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
                    ? 'Hãy chọn Tỉnh/Thành phố trước'
                    : loadingSpots
                      ? 'Đang tải địa điểm danh thắng...'
                      : 'Chọn địa danh cụ thể'}
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
            <label className="mb-2.5 block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Mô tả chi tiết dịch vụ
            </label>
            <textarea
              className="h-40 w-full rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-medium text-slate-700 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 transition-colors"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập mô tả chi tiết, lịch trình tour, tiện ích phòng, giờ nhận/trả phòng..."
            />
          </div>

          <div>
            <label className="mb-2.5 block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Hình ảnh giới thiệu dịch vụ
            </label>
            <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20 p-6">
              <div className="flex flex-wrap gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      className="h-24 w-32 rounded-2xl border-2 border-white dark:border-slate-800 object-cover shadow-md"
                      alt={`Preview ${index}`}
                    />
                  </div>
                ))}
                <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-slate-900">
                  <Upload size={24} className="text-slate-400 dark:text-slate-500 mb-1" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">Tải ảnh lên</span>
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
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4.5 text-lg font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/10 dark:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Đang xử lý lưu thông tin...
              </>
            ) : (
              <>
                <Save size={20} />
                {id ? 'CẬP NHẬT THÔNG TIN DỊCH VỤ' : 'LƯU VÀ TIẾP TỤC'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center font-bold">
              <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Thành công!</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium whitespace-pre-line">
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors duration-300 cursor-pointer active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowErrorModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center font-bold">
              <div className="mx-auto w-20 h-20 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                <XCircle className="text-rose-600 dark:text-rose-400" size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Có lỗi xảy ra!</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
                {errorMessage}
              </p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors duration-300 cursor-pointer active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceForm;
