import {
  Boxes,
  Braces,
  Cable,
  CheckCircle2,
  Database,
  GitBranch,
  Layers3,
  Network,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

const networkItems = [
  {
    title: 'Client - Server',
    detail: 'React frontend gọi ASP.NET Core Web API qua axiosClient với base URL /api.',
    refs: ['travel-ai-ui/src/api/axiosClient.ts', 'TravelAI.WebAPI/Controllers'],
  },
  {
    title: 'RESTful API',
    detail: 'Controller chia endpoint theo tài nguyên: bookings, payment, tickets, users, partner.',
    refs: ['BookingsController', 'PaymentController', 'TicketsController'],
  },
  {
    title: 'JWT Authentication',
    detail: 'Sau đăng nhập, frontend gửi Authorization: Bearer token; backend xác thực bằng JwtBearer.',
    refs: ['AuthService', 'Program.cs', 'ProtectedRoute'],
  },
  {
    title: 'Realtime SignalR',
    detail: 'Thông báo booking/payment được đẩy realtime qua NotificationHub.',
    refs: ['NotificationHub', 'SignalRNotificationService'],
  },
  {
    title: 'Third-party API',
    detail: 'Hệ thống gọi MoMo, VNPay, Gemini, Weather và SMTP/Gmail qua network.',
    refs: ['MomoService', 'VnPayService', 'GeminiService', 'GmailEmailService'],
  },
];

const ooadItems = [
  {
    title: 'Actors',
    points: ['Customer đặt dịch vụ và nhận vé', 'Partner quản lý dịch vụ và duyệt đơn', 'Admin quản trị hệ thống'],
  },
  {
    title: 'Use Cases',
    points: ['Đăng ký, đăng nhập, xác thực email', 'Tạo lịch trình AI', 'Đặt dịch vụ', 'Thanh toán', 'Sinh vé điện tử', 'Duyệt/từ chối đơn'],
  },
  {
    title: 'Domain Model',
    points: ['User - Role', 'Booking - BookingItem - Payment', 'Service - ServiceImage - Availability', 'Itinerary - ItineraryItem', 'ElectronicTicket'],
  },
  {
    title: 'Layered Architecture',
    points: ['Domain: entity nghiệp vụ', 'Application: DTO/interface', 'Infrastructure: EF Core/service/external API', 'WebAPI: controller'],
  },
];

const oopItems = [
  {
    title: 'Encapsulation',
    detail: 'Logic nghiệp vụ được đóng gói trong service class như BookingService, ElectronicTicketService, PartnerOrderService.',
  },
  {
    title: 'Abstraction',
    detail: 'Interface che giấu implementation: IEmailService, IPaymentService, IMomoService, IItineraryService.',
  },
  {
    title: 'Polymorphism',
    detail: 'Nhiều strategy cùng implement ISpotScoreStrategy để chấm điểm địa điểm theo style, budget, pace, distance, rating.',
  },
  {
    title: 'Generic',
    detail: 'GenericRepository<T> và IGenericRepository<T> tái sử dụng thao tác CRUD cho nhiều entity.',
  },
  {
    title: 'Dependency Injection',
    detail: 'Program.cs đăng ký service qua interface, controller/service nhận dependency qua constructor.',
  },
];

const flowItems = [
  'Customer chọn service hoặc tạo lịch trình AI.',
  'Frontend gửi request đặt booking đến WebAPI.',
  'Backend lưu Booking, BookingItem, Payment bằng EF Core.',
  'PaymentController gọi MoMo/VNPay/VietQR/Counter theo phương thức.',
  'Khi thanh toán thành công, ElectronicTicketService sinh vé QR.',
  'SignalR gửi thông báo realtime cho customer/partner/admin.',
];

const KnowledgeSummary = () => {
  return (
    <main className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.4fr_0.8fr] lg:p-10">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                <Boxes size={16} />
                TravelAI Knowledge Summary
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Tổng hợp kiến thức áp dụng trong project
              </h1>
              <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
                Trang này gom các ý chính để trình bày môn Lập trình mạng, Phân tích thiết kế hướng đối tượng, OOAD và OOP dựa trên đúng cấu trúc source code TravelAI.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 self-end">
              {['Network', 'REST API', 'OOAD', 'OOP'].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-4">
                  <CheckCircle2 className="mb-3 text-emerald-300" size={22} />
                  <p className="text-sm font-black">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Network className="mb-4 text-blue-600" size={28} />
            <h2 className="text-xl font-black text-slate-900">Lập trình mạng</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Giao tiếp qua HTTP, REST API, JWT, SignalR và API thanh toán bên ngoài.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Workflow className="mb-4 text-violet-600" size={28} />
            <h2 className="text-xl font-black text-slate-900">OOAD</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Phân tích actor, use case, domain model và thiết kế kiến trúc nhiều lớp.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Braces className="mb-4 text-emerald-600" size={28} />
            <h2 className="text-xl font-black text-slate-900">OOP</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Áp dụng class, interface, encapsulation, polymorphism, generic và dependency injection.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Cable className="text-blue-600" />
            <h2 className="text-2xl font-black text-slate-900">1. Lập trình mạng trong TravelAI</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {networkItems.map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-50 p-5">
                <h3 className="font-black text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.refs.map((ref) => (
                    <span key={ref} className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-blue-600">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Layers3 className="text-violet-600" />
            <h2 className="text-2xl font-black text-slate-900">2. OOAD trong TravelAI</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {ooadItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-100 p-5">
                <h3 className="font-black text-slate-900">{item.title}</h3>
                <ul className="mt-3 space-y-2">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm font-semibold text-slate-600">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={16} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <GitBranch className="text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900">3. OOP trong TravelAI</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {oopItems.map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-50 p-5">
                <h3 className="font-black text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Database className="text-sky-600" />
              <h2 className="text-2xl font-black text-slate-900">Luồng nghiệp vụ đặt dịch vụ</h2>
            </div>
            <ol className="space-y-3">
              {flowItems.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="text-emerald-600" />
              <h2 className="text-2xl font-black text-slate-900">Câu nói khi thuyết trình</h2>
            </div>
            <p className="rounded-2xl bg-slate-950 p-5 text-sm font-semibold leading-7 text-slate-100">
              TravelAI áp dụng kiến trúc client-server. Frontend React giao tiếp với ASP.NET Core Web API qua REST API, xác thực bằng JWT và nhận thông báo realtime qua SignalR. Hệ thống được phân tích theo actor Customer, Partner, Admin; thiết kế domain model bằng các entity như User, Booking, Payment, Service, Itinerary, ElectronicTicket. Về OOP, project sử dụng class, interface, dependency injection, repository và strategy pattern để tách biệt nghiệp vụ, dữ liệu và hạ tầng.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default KnowledgeSummary;
