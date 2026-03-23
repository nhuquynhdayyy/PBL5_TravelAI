import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <MainLayout>
      {/* Đây là nơi các Page sẽ hiển thị */}
      <div className="space-y-8">
        <section className="text-center py-12">
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4">
            Where to next?
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Explore world-class destinations with our AI-powered travel system.
          </p>
        </section>

        {/* Placeholder cho trang chủ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-64 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"></div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

export default App;