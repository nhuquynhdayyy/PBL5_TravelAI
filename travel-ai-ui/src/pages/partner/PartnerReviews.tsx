import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquareReply, Star, Store } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

type PartnerReviewItem = {
  reviewId: number;
  serviceId: number;
  serviceName: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  rating: number;
  comment?: string | null;
  replyText?: string | null;
  createdAt: string;
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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

const getApiErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  return fallback;
};

const PartnerReviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PartnerReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replySubmittingId, setReplySubmittingId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/reviews/my-service-reviews');
      setReviews(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleReply = async (review: PartnerReviewItem) => {
    const replyText = (replyDrafts[review.reviewId] ?? review.replyText ?? '').trim();
    if (!replyText) {
      alert('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    try {
      setReplySubmittingId(review.reviewId);
      await axiosClient.post(`/reviews/${review.reviewId}/reply`, { replyText });
      await fetchReviews();
      setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: '' }));
      alert('Đã phản hồi review thành công!');
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Không thể gửi phản hồi lúc này.'));
    } finally {
      setReplySubmittingId(null);
    }
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

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600" size={42} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-500">
          Chưa có review nào cho các dịch vụ của bạn.
        </div>
      ) : (
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
                  <p className="mt-1 text-sm text-slate-400">Review ngày {formatDate(review.createdAt)}</p>
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

                  {review.replyText && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-black text-blue-700">
                        <MessageSquareReply size={16} /> Phản hồi hiện tại
                      </div>
                      <p className="mt-2 text-slate-700">{review.replyText}</p>
                    </div>
                  )}

                  <div className="mt-5">
                    <label className="text-sm font-black text-slate-700">Trả lời review</label>
                    <textarea
                      rows={3}
                      value={replyDrafts[review.reviewId] ?? review.replyText ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: e.target.value }))
                      }
                      placeholder="Cảm ơn khách hàng và trả lời thêm nếu cần..."
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-700 outline-none transition-all focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(review)}
                      disabled={replySubmittingId === review.reviewId}
                      className="mt-3 rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition-all hover:bg-blue-600 disabled:bg-slate-300"
                    >
                      {replySubmittingId === review.reviewId ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerReviews;
