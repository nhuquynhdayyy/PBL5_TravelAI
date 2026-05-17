import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquareReply, Star, Store, Filter, Trash2, Edit2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate, formatVietnameseDateTime } from '../../utils/dateTimeUtils';

type PartnerReviewItem = {
  reviewId: number;
  serviceId: number;
  serviceName: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  rating: number;
  comment?: string | null;
  replyText?: string | null;
  replyTime?: string | null;
  createdAt: string;
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
        className={index < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
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

  const handleReply = async (review: PartnerReviewItem) => {
    const replyText = (replyDrafts[review.reviewId] ?? review.replyText ?? '').trim();
    if (!replyText) {
      alert('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    try {
      setReplySubmittingId(review.reviewId);
      
      if (editingReplyId === review.reviewId && review.replyText) {
        // Update existing reply
        await axiosClient.put(`/reviews/${review.reviewId}/reply`, { replyText });
        alert('Đã cập nhật phản hồi thành công!');
      } else {
        // Create new reply
        await axiosClient.post(`/reviews/${review.reviewId}/reply`, { replyText });
        alert('Đã phản hồi review thành công!');
      }
      
      await Promise.all([fetchReviews(), fetchStats()]);
      setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: '' }));
      setEditingReplyId(null);
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Không thể gửi phản hồi lúc này.'));
    } finally {
      setReplySubmittingId(null);
    }
  };

  const handleDeleteReply = async (reviewId: number) => {
    if (!confirm('Bạn có chắc muốn xóa phản hồi này?')) {
      return;
    }

    try {
      await axiosClient.delete(`/reviews/${reviewId}/reply`);
      await Promise.all([fetchReviews(), fetchStats()]);
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      setEditingReplyId(null);
      alert('Đã xóa phản hồi thành công!');
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Không thể xóa phản hồi lúc này.'));
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
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="text-left">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-500">Partner reviews</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Đánh giá khách hàng</h1>
          <p className="mt-2 font-medium text-slate-500">Xem toàn bộ review của dịch vụ bạn sở hữu và phản hồi ngay tại đây.</p>
        </div>
        <button
          onClick={() => navigate('/partner/services')}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-all hover:bg-blue-600"
        >
          Quay lại dịch vụ của tôi
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <span className="font-bold text-slate-700">Lọc:</span>
        </div>
        
        <select
          value={filterServiceId ?? ''}
          onChange={(e) => {
            setFilterServiceId(e.target.value ? parseInt(e.target.value) : null);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-700 outline-none transition-all focus:border-blue-500"
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
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-700 outline-none transition-all focus:border-blue-500"
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
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-700 outline-none transition-all focus:border-blue-500"
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
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-600"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Stats Section */}
      {statsLoading ? (
        <div className="mb-8 flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="text-3xl font-black text-blue-600">{stats.totalReviews}</div>
            <div className="mt-1 text-sm font-bold text-slate-500">Tổng đánh giá</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-black text-amber-500">{stats.averageRating.toFixed(1)}</div>
              <Star size={24} className="fill-amber-400 text-amber-400" />
            </div>
            <div className="mt-1 text-sm font-bold text-slate-500">Điểm trung bình</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="text-3xl font-black text-green-600">{stats.repliedCount}</div>
            <div className="mt-1 text-sm font-bold text-slate-500">Đã phản hồi</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="text-3xl font-black text-red-600">{stats.unrepliedCount}</div>
            <div className="mt-1 text-sm font-bold text-slate-500">Chưa phản hồi</div>
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && (
        <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-slate-900">Phân bố đánh giá</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = star === 5 ? stats.fiveStars : star === 4 ? stats.fourStars : star === 3 ? stats.threeStars : star === 2 ? stats.twoStars : stats.oneStar;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-16 items-center gap-1">
                    <span className="font-bold text-slate-700">{star}</span>
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-bold text-slate-600">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600" size={42} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-500">
          Chưa có review nào cho các dịch vụ của bạn.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {reviews.map((review) => (
              <article key={review.reviewId} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <button
                      onClick={() => navigate(`/services/${review.serviceId}`)}
                      className="flex items-center gap-2 text-left text-lg font-black text-slate-900 hover:text-blue-600"
                    >
                      <Store size={18} /> {review.serviceName}
                    </button>
                    <p className="mt-1 text-sm text-slate-400">Review ngày {formatVietnameseDate(review.createdAt)}</p>
                  </div>
                  {renderStars(review.rating)}
                </div>

                <div className="flex items-start gap-4">
                  {review.customerAvatarUrl ? (
                    <img
                      src={`http://localhost:5134${review.customerAvatarUrl}`}
                      alt={review.customerName}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                      {getInitials(review.customerName)}
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900">{review.customerName}</h3>
                    <p className="mt-3 leading-relaxed text-slate-700">
                      {review.comment || 'Khách hàng chưa để lại bình luận.'}
                    </p>

                    {review.replyText && editingReplyId !== review.reviewId && (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-black text-blue-700">
                            <MessageSquareReply size={16} /> Phản hồi hiện tại
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditReply(review)}
                              className="rounded-lg bg-blue-600 p-2 text-white transition-all hover:bg-blue-700"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteReply(review.reviewId)}
                              className="rounded-lg bg-red-600 p-2 text-white transition-all hover:bg-red-700"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-slate-700">{review.replyText}</p>
                        {review.replyTime && (
                          <p className="mt-2 text-xs text-slate-500">
                            Phản hồi lúc {formatVietnameseDateTime(review.replyTime)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Chỉ hiển thị form khi: chưa có reply HOẶC đang edit */}
                    {(!review.replyText || editingReplyId === review.reviewId) && (
                      <div className="mt-5">
                        <label className="text-sm font-black text-slate-700">
                          {editingReplyId === review.reviewId ? 'Chỉnh sửa phản hồi' : 'Trả lời review'}
                        </label>
                        <textarea
                          rows={3}
                          value={replyDrafts[review.reviewId] ?? review.replyText ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: e.target.value }))
                          }
                          placeholder="Cảm ơn khách hàng và trả lời thêm nếu cần..."
                          className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-700 outline-none transition-all focus:border-blue-500"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleReply(review)}
                            disabled={replySubmittingId === review.reviewId}
                            className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition-all hover:bg-blue-600 disabled:bg-slate-300"
                          >
                            {replySubmittingId === review.reviewId ? 'Đang gửi...' : editingReplyId === review.reviewId ? 'Cập nhật' : 'Gửi phản hồi'}
                          </button>
                          {editingReplyId === review.reviewId && (
                            <button
                              type="button"
                              onClick={() => handleCancelEdit(review.reviewId)}
                              className="rounded-2xl bg-slate-300 px-5 py-3 font-black text-slate-700 transition-all hover:bg-slate-400"
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
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white transition-all hover:bg-blue-600 disabled:bg-slate-300"
              >
                Trước
              </button>
              <span className="px-4 font-bold text-slate-700">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white transition-all hover:bg-blue-600 disabled:bg-slate-300"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PartnerReviews;
