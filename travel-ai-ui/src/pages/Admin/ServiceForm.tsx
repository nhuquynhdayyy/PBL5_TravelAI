import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload
} from 'lucide-react';

const ServiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [canCreateServices, setCanCreateServices] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    serviceType: '0',
    spotId: ''
  });
  const [images, setImages] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.roleName?.toLowerCase() === 'partner') {
      axiosClient.get('/partner/profile')
        .then((res) => {
          if (res.data?.canCreateServices === false) {
            setCanCreateServices(false);
          }
        })
        .catch((err) => console.error(err));
    }
  }, []);

  useEffect(() => {
    if (id) {
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
            spotId: data.spotId?.toString() || ''
          });
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
    }
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const payload = new FormData();
    payload.append('Name', formData.name);
    payload.append('Description', formData.description || '');
    payload.append('BasePrice', formData.basePrice);
    payload.append('ServiceType', formData.serviceType);
    payload.append('Latitude', '0');
    payload.append('Longitude', '0');

    if (formData.spotId) {
      payload.append('SpotId', formData.spotId);
    }

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
          ? 'Cập nhật thành công. Dịch vụ đã quay lại trạng thái chờ admin duyệt.'
          : 'Tạo dịch vụ thành công. Dịch vụ sẽ chờ admin duyệt trước khi hiển thị public.'
      );

      navigate(`/partner/services/${targetId}/manage`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="font-bold text-slate-400">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!canCreateServices) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[2.5rem] border border-amber-200 bg-amber-50 p-10 text-left">
          <h2 className="mb-3 text-3xl font-black text-amber-900">Hồ sơ partner chưa được duyệt</h2>
          <p className="font-medium leading-7 text-amber-800">
            Bạn cần hoàn thiện hồ sơ doanh nghiệp và chờ admin phê duyệt trước khi đăng hoặc cập nhật dịch vụ.
          </p>
          <button
            onClick={() => navigate('/partner/profile')}
            className="mt-6 rounded-2xl bg-amber-600 px-6 py-3 font-black text-white"
          >
            Về trang Business
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-bold text-slate-500 transition-all hover:text-blue-600">
          <ArrowLeft size={20} /> Quay lại
        </button>
      </div>

      <div className="overflow-hidden rounded-[3rem] border border-slate-100 bg-white shadow-2xl">
        <div className="bg-slate-900 p-10 text-left text-white">
          <h2 className="mb-2 text-4xl font-black tracking-tighter">
            {id ? 'Chỉnh sửa dịch vụ' : 'Đăng dịch vụ mới'}
          </h2>
          <p className="font-medium italic text-slate-400">
            Vui lòng điền đầy đủ để AI có thể gợi ý lịch trình chính xác hơn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 p-10 text-left">
          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              Tên khách sạn / Tour du lịch
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
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">Giá cơ bản (VNĐ)</label>
              <input
                type="number"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-bold"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">Loại hình</label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 font-black text-blue-600"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              >
                <option value="0">KHÁCH SẠN</option>
                <option value="1">TOUR DU LỊCH</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">Mô tả chi tiết</label>
            <textarea
              className="h-40 w-full rounded-[2rem] border-2 border-slate-100 bg-slate-50 p-4 font-medium text-slate-600 outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">Hình ảnh</label>
            <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8">
              <div className="mb-4 flex flex-wrap gap-4">
                {previews.map((preview, index) => (
                  <img key={index} src={preview} className="h-24 w-32 rounded-2xl border-4 border-white object-cover shadow-md" />
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

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-blue-600 py-5 text-xl font-black text-white shadow-xl">
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            {id ? 'CẬP NHẬT DỊCH VỤ' : 'LƯU VÀ TIẾP TỤC'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceForm;
