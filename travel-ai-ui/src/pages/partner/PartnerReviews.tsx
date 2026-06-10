import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquareReply, Star, Store, Filter, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate, formatVietnameseDateTime } from '../../utils/dateTimeUtils';

type PartnerReviewItem = {
  reviewId: number;
  serviceId: number;
  serviceName: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  replyText?: string | null;
  replyTime?: string | null;
  createdAt: string;
  comment?: string | null;
  rating: number;
};

type ReviewStats = {
  totalReviews: number;
  averageRating: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
  repliedCount: number;
  unrepliedCount: number;
};

const renderStars = (rating: number) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
      />
    ))}
  </div>
);

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const getApiErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  return fallback;
};

const PartnerReviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PartnerReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [replySubmittingId, setReplySubmittingId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  
  // Custom Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReviewIdForDelete, setSelectedReviewIdForDelete] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Services list for filter
  const [services, setServices] = useState<Array<{ serviceId: number; name: string }>>([]);
  
  // Filters
  const [filterServiceId, setFilterServiceId] = useState<number | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterHasReply, setFilterHasReply] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params: any = { page, pageSize };
      if (filterServiceId) params.serviceId = filterServiceId;
      if (filterRating) params.rating = filterRating;
      if (filterHasReply !== null) params.hasReply = filterHasReply;
      
      const res = await axiosClient.get('/reviews/my-service-reviews', { params });
      setReviews(res.data?.reviews ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const params: any = {};
      if (filterServiceId) params.serviceId = filterServiceId;
      
      const res = await axiosClient.get('/reviews/my-service-reviews/stats', { params });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axiosClient.get('/services/my-services');
      setServices(res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [page, filterServiceId, filterRating, filterHasReply]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showDeleteModal || showSuccessModal || showErrorModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDeleteModal, showSuccessModal, showErrorModal]);

  const handleReply = async (review: PartnerReviewItem) => {
    const replyText = (replyDrafts[review.reviewId] ?? review.replyText ?? '').trim();
    if (!replyText) {
      setErrorMessage('Vui lòng nhập nội dung phản hồi.');
      setShowErrorModal(true);
      return;
    }

    try {
      setReplySubmittingId(review.reviewId);
      
      if (editingReplyId === review.reviewId && review.replyText) {
        await axiosClient.put(`/reviews/${review.reviewId}/reply`, { replyText });
        setSuccessMessage('✅ Đã cập nhật phản hồi thành công!');
      } else {
        await axiosClient.post(`/reviews/${review.reviewId}/reply`, { replyText });
        setSuccessMessage('✅ Đã phản hồi đánh giá thành công!');
      }
      
      await Promise.all([fetchReviews(), fetchStats()]);
      setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: '' }));
      setEditingReplyId(null);
      setShowSuccessModal(true);
    } catch (err: any) {
      setErrorMessage(getApiErrorMessage(err, 'Không thể gửi phản hồi lúc này.'));
      setShowErrorModal(true);
    } finally {
      setReplySubmittingId(null);
    }
  };

  const handleDeleteReplyClick = (reviewId: number) => {
    setSelectedReviewIdForDelete(reviewId);
    setShowDeleteModal(true);
  };

  const handleDeleteReplyConfirm = async () => {
    if (!selectedReviewIdForDelete) return;

    try {
      await axiosClient.delete(`/reviews/${selectedReviewIdForDelete}/reply`);
      await Promise.all([fetchReviews(), fetchStats()]);
      setReplyDrafts((prev) => ({ ...prev, [selectedReviewIdForDelete]: '' }));
      setEditingReplyId(null);
      setShowDeleteModal(false);
      setSuccessMessage('✅ Đã xóa phản hồi thành công!');
      setShowSuccessModal(true);
    } catch (err: any) {
      setErrorMessage(getApiErrorMessage(err, 'Không thể xóa phản hồi lúc này.'));
      setShowErrorModal(true);
    } finally {
      setSelectedReviewIdForDelete(null);
    }
  };

  const handleEditReply = (review: PartnerReviewItem) => {
    setEditingReplyId(review.reviewId);
    setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: review.replyText ?? '' }));
  };

  const handleCancelEdit = (reviewId: number) => {
    setEditingReplyId(null);
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
            <Store size={14} /> Quản lý đánh giá
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ĐÁNH GIÁ CỦA KHÁCH HÀNG</h1>
          <p className="mt-3 font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
            Xem toàn bộ nhận xét, đánh giá của dịch vụ do bạn sở hữu và tương tác phản hồi với khách hàng.
          </p>
        </div>
        <button
          onClick={() => navigate('/partner/services')}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all duration-300 active:scale-95 cursor-pointer shadow-md shadow-blue-500/20"
        >
          Quay lại quản lý dịch vụ
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className="text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Bộ lọc tìm kiếm</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            value={filterServiceId ?? ''}
            onChange={(e) => {
              setFilterServiceId(e.target.value ? parseInt(e.target.value) : null);
              setPage(1);
            }}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 cursor-pointer"
          >
            <option value="">Tất cả dịch vụ</option>
            {services.map((service) => (
              <option key={service.serviceId} value={service.serviceId}>
                {service.name}
              </option>
            ))}
          </select>
          
          <select
            value={filterRating ?? ''}
            onChange={(e) => {
              setFilterRating(e.target.value ? parseInt(e.target.value) : null);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 cursor-pointer"
          >
            <option value="">Tất cả sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>

          <select
            value={filterHasReply === null ? '' : filterHasReply ? 'true' : 'false'}
            onChange={(e) => {
              setFilterHasReply(e.target.value === '' ? null : e.target.value === 'true');
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-blue-500 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đã phản hồi</option>
            <option value="false">Chưa phản hồi</option>
          </select>

          {(filterServiceId || filterRating || filterHasReply !== null) && (
            <button
              onClick={() => {
                setFilterServiceId(null);
                setFilterRating(null);
                setFilterHasReply(null);
                setPage(1);
              }}
              className="rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Stats Section */}
      {statsLoading ? (
        <div className="mb-8 flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={36} />
        </div>
      ) : stats && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{stats.totalReviews}</div>
            <div className="mt-1.5 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Tổng đánh giá</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-black text-amber-500">{stats.averageRating.toFixed(1)}</div>
              <Star size={20} className="fill-amber-400 text-amber-400" />
            </div>
            <div className="mt-1.5 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Điểm trung bình</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.repliedCount}</div>
            <div className="mt-1.5 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Đã phản hồi</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{stats.unrepliedCount}</div>
            <div className="mt-1.5 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Chưa phản hồi</div>
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && (
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Phân bố xếp hạng sao</h3>
          <div className="space-y-3.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = star === 5 ? stats.fiveStars : star === 4 ? stats.fourStars : star === 3 ? stats.threeStars : star === 2 ? stats.twoStars : stats.oneStar;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-4">
                  <div className="flex w-16 items-center gap-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{star}</span>
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-bold text-slate-500 dark:text-slate-400">{count} lượt</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={42} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/10 px-6 py-16 text-center text-slate-500">
          Chưa có đánh giá nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {reviews.map((review) => (
              <article key={review.reviewId} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/50 pb-5">
                  <div>
                    <button
                      onClick={() => navigate(`/services/${review.serviceId}`)}
                      className="flex items-center gap-2 text-left text-lg font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <Store size={18} className="text-blue-500" /> {review.serviceName}
                    </button>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Đăng ngày {formatVietnameseDate(review.createdAt)}</p>
                  </div>
                  {renderStars(review.rating)}
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {review.customerAvatarUrl ? (
                    <img
                      src={`http://localhost:5134${review.customerAvatarUrl}`}
                      alt={review.customerName}
                      className="h-14 w-14 rounded-2xl object-cover border border-slate-100 dark:border-slate-700"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-950 text-sm font-black text-white shrink-0">
                      {getInitials(review.customerName)}
                    </div>
                  )}

                  <div className="flex-1 w-full">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{review.customerName}</h3>
                    <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {review.comment || 'Khách hàng chưa để lại bình luận viết.'}
                    </p>

                    {review.replyText && editingReplyId !== review.reviewId && (
                      <div className="mt-5 rounded-2xl border-2 border-blue-500 dark:border-blue-950/20 bg-blue-50/40 dark:bg-blue-950/10 p-5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-400">
                            <MessageSquareReply size={16} /> Phản hồi từ bạn
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditReply(review)}
                              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white p-2 transition-all active:scale-95 cursor-pointer"
                              title="Chỉnh sửa phản hồi"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteReplyClick(review.reviewId)}
                              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white p-2 transition-all active:scale-95 cursor-pointer"
                              title="Xóa phản hồi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-slate-700 dark:text-slate-350 font-medium">{review.replyText}</p>
                        {review.replyTime && (
                          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                            Cập nhật lúc {formatVietnameseDateTime(review.replyTime)}
                          </p>
                        )}
                      </div>
                    )}

                    {(!review.replyText || editingReplyId === review.reviewId) && (
                      <div className="mt-5 bg-slate-50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                          {editingReplyId === review.reviewId ? 'Chỉnh sửa câu trả lời' : 'Phản hồi đánh giá của khách'}
                        </label>
                        <textarea
                          rows={3}
                          value={replyDrafts[review.reviewId] ?? review.replyText ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: e.target.value }))
                          }
                          placeholder="Cảm ơn khách hàng và phản hồi các thông tin của họ..."
                          className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleReply(review)}
                            disabled={replySubmittingId === review.reviewId}
                            className="rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 px-6 py-3 font-black text-white transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                          >
                            {replySubmittingId === review.reviewId ? (
                              <>
                                <Loader2 className="animate-spin" size={16} />
                                Đang gửi...
                              </>
                            ) : editingReplyId === review.reviewId ? 'Cập nhật' : 'Gửi phản hồi'}
                          </button>
                          {editingReplyId === review.reviewId && (
                            <button
                              type="button"
                              onClick={() => handleCancelEdit(review.reviewId)}
                              className="rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-6 py-3 font-black text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page === 1}
                className="rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                Trước
              </button>
              <span className="px-3 font-bold text-slate-700 dark:text-slate-300 text-sm">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page === totalPages}
                className="rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Reply Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-rose-600 dark:text-rose-400" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Xóa phản hồi</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Bạn có chắc chắn muốn xóa phản hồi cho đánh giá này?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteReplyConfirm}
                className="flex-1 px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors duration-300 cursor-pointer"
              >
                Xóa phản hồi
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
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
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Lỗi!</h2>
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

export default PartnerReviews;

