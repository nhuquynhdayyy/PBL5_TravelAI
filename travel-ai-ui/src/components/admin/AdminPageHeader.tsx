import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  actionDisabled?: boolean;
};

const AdminPageHeader = ({
  eyebrow,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  actionDisabled = false,
}: AdminPageHeaderProps) => {
  return (
    <section className="mb-8 overflow-hidden rounded-b-[2rem] rounded-t-2xl border border-blue-100/70 bg-[linear-gradient(90deg,#2563EB_0%,#60A5FA_45%,#EAF2FF_100%)] px-6 py-8 shadow-[0_18px_40px_rgba(37,99,235,0.12)] sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-white/18 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur">
            {eyebrow}
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-50 sm:text-base">
          {description}
          </p>
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {actionIcon}
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
};

export default AdminPageHeader;
