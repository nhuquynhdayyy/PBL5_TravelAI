const ItinerarySkeleton = () => (
  <div className="mx-auto max-w-7xl animate-pulse px-4 py-8">
    <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row">
      <div className="space-y-4">
        <div className="h-5 w-36 rounded-full bg-slate-200" />
        <div className="h-12 w-80 max-w-full rounded-2xl bg-slate-200" />
        <div className="h-5 w-96 max-w-full rounded-full bg-slate-200" />
      </div>
      <div className="flex gap-3">
        <div className="h-12 w-36 rounded-2xl bg-slate-200" />
        <div className="h-12 w-28 rounded-2xl bg-slate-200" />
      </div>
    </div>

    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <div className="space-y-8">
        {[1, 2, 3].map((item) => (
          <div key={item} className="relative border-l-4 border-dashed border-slate-200 pl-8">
            <div className="mb-5 h-10 w-32 rounded-2xl bg-slate-200" />
            <div className="space-y-5">
              {[1, 2].map((card) => (
                <div key={card} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex gap-5">
                    <div className="h-28 w-32 shrink-0 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-24 rounded-full bg-slate-200" />
                      <div className="h-7 w-3/4 rounded-xl bg-slate-200" />
                      <div className="h-4 w-full rounded-full bg-slate-200" />
                      <div className="h-4 w-2/3 rounded-full bg-slate-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="h-[620px] rounded-3xl bg-slate-200" />
    </div>
  </div>
);

export default ItinerarySkeleton;
