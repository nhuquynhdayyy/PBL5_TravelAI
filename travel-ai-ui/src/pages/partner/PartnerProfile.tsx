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

  const fetchProfile = async () => {
    try {
      setLoading(true);
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
      console.error('Loi lay thong tin doanh nghiep:', error);
      alert('Khong the tai thong tin doanh nghiep luc nay.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const handleChange = (field: keyof PartnerProfileForm, value: string) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.businessName.trim()) {
      alert('Vui long nhap ten doanh nghiep.');
      return;
    }

    if (!formData.contactPhone.trim()) {
      alert('Vui long nhap so dien thoai lien he.');
      return;
    }

    if (!licenseFile && !profileMeta?.businessLicenseUrl) {
      alert('Vui long tai len giay phep kinh doanh.');
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
      alert('Ho so da duoc gui cho admin kiem duyet.');
    } catch (error: any) {
      console.error('Loi cap nhat thong tin doanh nghiep:', error);
      alert(error.response?.data?.message ?? 'Khong the cap nhat thong tin doanh nghiep luc nay.');
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = useMemo(() => {
    switch ((profileMeta?.verificationStatus ?? 'Pending').toLowerCase()) {
      case 'approved':
        return {
          label: 'Approved',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          message: 'Ho so da duoc duyet. Ban co the dang va cap nhat dich vu.'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-red-50 text-red-700 border border-red-200',
          message: 'Ho so da bi tu choi. Vui long xem ghi chu va gui lai thong tin.'
        };
      case 'needmoreinfo':
        return {
          label: 'Need More Info',
          className: 'bg-amber-50 text-amber-700 border border-amber-200',
          message: 'Admin can bo sung thong tin. Vui long cap nhat ho so va gui lai.'
        };
      default:
        return {
          label: 'Pending',
          className: 'bg-blue-50 text-blue-700 border border-blue-200',
          message: 'Ho so dang cho admin kiem duyet. Ban chua the dang dich vu moi.'
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            <Building2 size={14} /> Partner Verification
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">HO SO DOI TAC</h1>
          <p className="mt-3 max-w-3xl font-medium text-slate-500">
            Hoan thien giay phep kinh doanh, thong tin lien he va tai khoan thanh toan de admin kiem duyet doi tac.
          </p>
        </div>

        <button
          onClick={() => void fetchProfile()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95"
        >
          <RefreshCw size={18} /> Tai lai
        </button>
      </div>

      <div className="mb-6 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trang thai kiem duyet</p>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${statusConfig.className}`}>
              <BadgeCheck size={16} /> {statusConfig.label}
            </div>
            <p className="mt-3 font-medium text-slate-600">{statusConfig.message}</p>
          </div>

          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-sm font-medium text-slate-600">
            <p>Co the dang dich vu: <span className="font-black text-slate-900">{profileMeta?.canCreateServices ? 'Co' : 'Chua'}</span></p>
            <p className="mt-1">Lan gui gan nhat: <span className="font-black text-slate-900">{profileMeta?.submittedAt ? formatVietnameseDateTime(profileMeta.submittedAt) : 'Chua gui'}</span></p>
          </div>
        </div>

        {profileMeta?.reviewNote && (
          <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-amber-600" size={18} />
              <div>
                <p className="font-black text-amber-900">Ghi chu tu admin</p>
                <p className="mt-1 text-sm font-medium leading-6 text-amber-800">{profileMeta.reviewNote}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <Building2 size={16} className="text-blue-500" /> Ten doanh nghiep
              </span>
              <input
                value={formData.businessName}
                onChange={(event) => handleChange('businessName', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Cong ty du lich ABC"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <ReceiptText size={16} className="text-emerald-500" /> Ma so thue
              </span>
              <input
                value={formData.taxCode}
                onChange={(event) => handleChange('taxCode', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Nhap ma so thue"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <Phone size={16} className="text-violet-500" /> So dien thoai lien he
              </span>
              <input
                value={formData.contactPhone}
                onChange={(event) => handleChange('contactPhone', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Nhap so dien thoai"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <CreditCard size={16} className="text-amber-500" /> Tai khoan ngan hang
              </span>
              <input
                value={formData.bankAccount}
                onChange={(event) => handleChange('bankAccount', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="So tai khoan / ten ngan hang"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <MapPin size={16} className="text-rose-500" /> Dia chi doanh nghiep
              </span>
              <input
                value={formData.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Nhap dia chi doanh nghiep"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <ShieldCheck size={16} className="text-indigo-500" /> Mo ta doanh nghiep
              </span>
              <textarea
                value={formData.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Gioi thieu ngan gon ve doanh nghiep, the manh va loai dich vu cua ban"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                <FileBadge2 size={16} className="text-blue-500" /> Giay phep kinh doanh
              </span>
              <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50 p-5">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setLicenseFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm font-medium text-slate-600"
                />
                <p className="mt-3 text-xs font-medium text-slate-400">
                  Chap nhan PDF, JPG, JPEG, PNG. Tai lai file moi se gui lai ho so cho admin.
                </p>
                {(licenseFile || profileMeta?.businessLicenseUrl) && (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    Tai lieu hien tai: {licenseFile?.name ?? 'Da tai len'}
                    {profileMeta?.businessLicenseUrl && !licenseFile && (
                      <a
                        href={`${API_BASE_URL}${profileMeta.businessLicenseUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 font-black text-blue-600 hover:underline"
                      >
                        Xem file
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95 disabled:bg-slate-300"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Gui ho so kiem duyet
            </button>
          </div>
        </form>

        <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl sm:p-8">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
            Dieu kien de duyet
          </p>
          <h2 className="mb-4 text-2xl font-black leading-tight">
            Chi partner da duoc duyet moi co the dang dich vu
          </h2>
          <p className="text-sm font-medium leading-7 text-slate-200">
            Admin se kiem tra giay phep kinh doanh, thong tin lien he va tai khoan thanh toan. Neu can, ho so se duoc tra ve de bo sung.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Quy trinh</p>
              <p className="font-bold text-white">Pending → Approved / Rejected / Need More Info</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Bat buoc</p>
              <p className="font-bold text-white">Giay phep kinh doanh, lien he, thanh toan</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Trang thai hien tai</p>
              <p className="font-bold text-white">{statusConfig.label}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerProfile;
