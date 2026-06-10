import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CreditCard,
  FileBadge2,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ReceiptText,
  Save,
  ShieldCheck
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDateTime } from '../../utils/dateTimeUtils';
import { refreshPartnerStatus } from '../../utils/userUtils';

type PartnerProfileForm = {
  businessName: string;
  taxCode: string;
  bankAccount: string;
  address: string;
  description: string;
  contactPhone: string;
};

type PartnerProfileResponse = PartnerProfileForm & {
  businessLicenseUrl?: string | null;
  verificationStatus?: string;
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  canCreateServices?: boolean;
};

const emptyForm: PartnerProfileForm = {
  businessName: '',
  taxCode: '',
  bankAccount: '',
  address: '',
  description: '',
  contactPhone: ''
};

const API_BASE_URL = 'http://localhost:5134';

const PartnerProfile = () => {
  const [formData, setFormData] = useState<PartnerProfileForm>(emptyForm);
  const [profileMeta, setProfileMeta] = useState<PartnerProfileResponse | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Refresh partner status và cập nhật localStorage
      await refreshPartnerStatus();
      
      const response = await axiosClient.get('/partner/profile');
      const data = response.data ?? {};
      setFormData({
        businessName: data.businessName ?? '',
        taxCode: data.taxCode ?? '',
        bankAccount: data.bankAccount ?? '',
        address: data.address ?? '',
        description: data.description ?? '',
        contactPhone: data.contactPhone ?? ''
      });
      setProfileMeta(data);
    } catch (error) {
      console.error('Lỗi lấy thông tin doanh nghiệp:', error);
      alert('Không thể tải thông tin doanh nghiệp lúc này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  useEffect(() => {
    // Auto-refresh profile status every 10 seconds if not approved yet
    if (profileMeta && !profileMeta.canCreateServices) {
      const intervalId = setInterval(async () => {
        // Refresh partner status và cập nhật localStorage
        const updatedUser = await refreshPartnerStatus();
        
        const response = await axiosClient.get('/partner/profile');
        const data = response.data ?? {};
        setProfileMeta(data);
        
        // Update form data if needed
        if (data.businessName) {
          setFormData({
            businessName: data.businessName ?? '',
            taxCode: data.taxCode ?? '',
            bankAccount: data.bankAccount ?? '',
            address: data.address ?? '',
            description: data.description ?? '',
            contactPhone: data.contactPhone ?? ''
          });
        }
        
        // Nếu đã được duyệt, trigger re-render toàn bộ app
        if (updatedUser?.canCreateServices) {
          window.dispatchEvent(new Event('userUpdated'));
        }
      }, 10000); // 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [profileMeta?.canCreateServices]);

  const handleChange = (field: keyof PartnerProfileForm, value: string) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.businessName.trim()) {
      alert('Vui lòng nhập tên doanh nghiệp.');
      return;
    }

    if (!formData.contactPhone.trim()) {
      alert('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    if (!licenseFile && !profileMeta?.businessLicenseUrl) {
      alert('Vui lòng tải lên giấy phép kinh doanh.');
      return;
    }

    try {
      setSaving(true);
      const payload = new FormData();
      payload.append('BusinessName', formData.businessName);
      payload.append('TaxCode', formData.taxCode);
      payload.append('BankAccount', formData.bankAccount);
      payload.append('Address', formData.address);
      payload.append('Description', formData.description);
      payload.append('ContactPhone', formData.contactPhone);
      if (licenseFile) {
        payload.append('BusinessLicenseFile', licenseFile);
      }

      const response = await axiosClient.put('/partner/profile', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = response.data ?? {};
      setFormData({
        businessName: data.businessName ?? '',
        taxCode: data.taxCode ?? '',
        bankAccount: data.bankAccount ?? '',
        address: data.address ?? '',
        description: data.description ?? '',
        contactPhone: data.contactPhone ?? ''
      });
      setProfileMeta(data);
      setLicenseFile(null);
      alert('Hồ sơ đã được gửi cho quản trị viên kiểm duyệt.');
    } catch (error: any) {
      console.error('Lỗi cập nhật thông tin doanh nghiệp:', error);
      alert(error.response?.data?.message ?? 'Không thể cập nhật thông tin doanh nghiệp lúc này.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      setRefreshing(true);
      
      // Refresh partner status và cập nhật localStorage
      const updatedUser = await refreshPartnerStatus();
      
      const response = await axiosClient.get('/partner/profile');
      const data = response.data ?? {};
      setProfileMeta(data);
      setFormData({
        businessName: data.businessName ?? '',
        taxCode: data.taxCode ?? '',
        bankAccount: data.bankAccount ?? '',
        address: data.address ?? '',
        description: data.description ?? '',
        contactPhone: data.contactPhone ?? ''
      });
      
      if (data.canCreateServices) {
        alert('Hồ sơ của bạn đã được duyệt! Bạn có thể đăng dịch vụ ngay bây giờ.');
        // Trigger re-render toàn bộ app
        window.dispatchEvent(new Event('userUpdated'));
      } else {
        alert('Trạng thái đã được cập nhật.');
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    } finally {
      setRefreshing(false);
    }
  };

  const statusConfig = useMemo(() => {
    switch ((profileMeta?.verificationStatus ?? 'Pending').toLowerCase()) {
      case 'approved':
        return {
          label: 'Đã phê duyệt',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
          message: 'Hồ sơ đã được duyệt. Bạn có thể đăng và cập nhật dịch vụ của mình.'
        };
      case 'rejected':
        return {
          label: 'Từ chối',
          className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50',
          message: 'Hồ sơ đã bị từ chối. Vui lòng xem ghi chú từ admin và gửi lại thông tin.'
        };
      case 'needmoreinfo':
        return {
          label: 'Cần bổ sung thông tin',
          className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
          message: 'Quản trị viên yêu cầu bổ sung thông tin. Vui lòng cập nhật hồ sơ và gửi lại.'
        };
      default:
        return {
          label: 'Đang chờ duyệt',
          className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50',
          message: 'Hồ sơ đang chờ quản trị viên kiểm duyệt. Bạn chưa thể đăng dịch vụ mới lúc này.'
        };
    }
  }, [profileMeta?.verificationStatus]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/30 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
            <Building2 size={14} /> Xác thực đối tác
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">HỒ SƠ ĐỐI TÁC</h1>
          <p className="mt-3 max-w-3xl font-medium text-slate-500 dark:text-slate-400">
            Hoàn thiện giấy phép kinh doanh, thông tin liên hệ và tài khoản thanh toán để admin kiểm duyệt đối tác.
          </p>
        </div>

        <button
          onClick={handleRefreshProfile}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-800 px-6 py-3 text-sm font-black text-white shadow-lg transition-all duration-300 hover:bg-blue-600 dark:hover:bg-blue-600 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Đang cập nhật...' : 'Tải lại trạng thái'}
        </button>
      </div>

      <div className="mb-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Trạng thái kiểm duyệt</p>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black border ${statusConfig.className}`}>
              <BadgeCheck size={16} /> {statusConfig.label}
            </div>
            <p className="mt-3 font-medium text-slate-600 dark:text-slate-300">{statusConfig.message}</p>
          </div>

          <div className="rounded-[1.5rem] bg-slate-50 dark:bg-slate-900/50 px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-100/50 dark:border-slate-800">
            <p>Có thể đăng dịch vụ: <span className="font-black text-slate-900 dark:text-white">{profileMeta?.canCreateServices ? 'Có' : 'Chưa'}</span></p>
            <p className="mt-1">Lần gửi gần nhất: <span className="font-black text-slate-900 dark:text-white">{profileMeta?.submittedAt ? formatVietnameseDateTime(profileMeta.submittedAt) : 'Chưa gửi'}</span></p>
          </div>
        </div>

        {profileMeta?.reviewNote && (
          <div className="mt-5 rounded-[1.5rem] border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-amber-600 dark:text-amber-400" size={18} />
              <div>
                <p className="font-black text-amber-900 dark:text-amber-300">Ghi chú từ quản trị viên</p>
                <p className="mt-1 text-sm font-medium leading-6 text-amber-800 dark:text-amber-400">{profileMeta.reviewNote}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <Building2 size={16} className="text-blue-500" /> Tên doanh nghiệp
              </span>
              <input
                value={formData.businessName}
                onChange={(event) => handleChange('businessName', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Công ty du lịch ABC"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <ReceiptText size={16} className="text-emerald-500" /> Mã số thuế
              </span>
              <input
                value={formData.taxCode}
                onChange={(event) => handleChange('taxCode', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Nhập mã số thuế"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <Phone size={16} className="text-violet-500" /> Số điện thoại liên hệ
              </span>
              <input
                value={formData.contactPhone}
                onChange={(event) => handleChange('contactPhone', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Nhập số điện thoại"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <CreditCard size={16} className="text-amber-500" /> Tài khoản ngân hàng
              </span>
              <input
                value={formData.bankAccount}
                onChange={(event) => handleChange('bankAccount', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Số tài khoản / tên ngân hàng"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <MapPin size={16} className="text-rose-500" /> Địa chỉ doanh nghiệp
              </span>
              <input
                value={formData.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Nhập địa chỉ doanh nghiệp"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <ShieldCheck size={16} className="text-indigo-500" /> Mô tả doanh nghiệp
              </span>
              <textarea
                value={formData.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Giới thiệu ngắn gọn về doanh nghiệp, thế mạnh và loại dịch vụ của bạn"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <FileBadge2 size={16} className="text-blue-500" /> Giấy phép kinh doanh
              </span>
              <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-5">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setLicenseFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm font-medium text-slate-600 dark:text-slate-400"
                />
                <p className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                  Chấp nhận PDF, JPG, JPEG, PNG. Tải lại file mới sẽ gửi lại hồ sơ cho admin.
                </p>
                {(licenseFile || profileMeta?.businessLicenseUrl) && (
                  <div className="mt-4 rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-600">
                    Tài liệu hiện tại: {licenseFile?.name ?? 'Đã tải lên hệ thống'}
                    {profileMeta?.businessLicenseUrl && !licenseFile && (
                      <a
                        href={`${API_BASE_URL}${profileMeta.businessLicenseUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 font-black text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Xem tài liệu
                      </a>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg transition-all duration-300 hover:bg-blue-500 active:scale-95 disabled:bg-slate-300 cursor-pointer"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Gửi hồ sơ kiểm duyệt
            </button>
          </div>
        </form>

        <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
            Điều kiện để duyệt
          </p>
          <h2 className="mb-4 text-2xl font-black leading-tight">
            Chỉ đối tác đã được duyệt mới có thể đăng dịch vụ
          </h2>
          <p className="text-sm font-medium leading-7 text-slate-200">
            Quản trị viên sẽ kiểm tra giấy phép kinh doanh, thông tin liên hệ và tài khoản thanh toán. Nếu cần bổ sung thông tin, hồ sơ sẽ được trả về kèm lý do cụ thể.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Quy trình kiểm duyệt</p>
              <p className="font-bold text-white">Chờ duyệt → Phê duyệt / Từ chối / Cần bổ sung</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Yêu cầu bắt buộc</p>
              <p className="font-bold text-white">Giấy phép hợp lệ, SĐT liên hệ, Tài khoản thanh toán</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Trạng thái hiện tại</p>
              <p className="font-bold text-white">{statusConfig.label}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerProfile;
