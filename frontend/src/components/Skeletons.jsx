import React from "react";

export const JobCardSkeleton = () => (
  <div className="bg-white border border-ink/10 rounded-2xl p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-3/4 rounded-md" />
        <div className="skeleton h-3.5 w-1/2 rounded-md" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full shrink-0" />
    </div>
    <div className="flex gap-2 mt-4">
      <div className="skeleton h-6 w-16 rounded-full" />
      <div className="skeleton h-6 w-20 rounded-full" />
      <div className="skeleton h-6 w-14 rounded-full" />
    </div>
    <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink/5">
      <div className="skeleton h-3.5 w-20 rounded-md" />
      <div className="skeleton h-4 w-24 rounded-md" />
    </div>
  </div>
);

export const RowSkeleton = () => (
  <div className="p-5 rounded-2xl bg-white border border-ink/10 flex items-center justify-between gap-4">
    <div className="flex-1 space-y-2">
      <div className="skeleton h-5 w-2/3 rounded-md" />
      <div className="skeleton h-3.5 w-1/3 rounded-md" />
    </div>
    <div className="skeleton h-8 w-24 rounded-full shrink-0" />
  </div>
);

export const StatCardSkeleton = () => (
  <div className="p-6 rounded-2xl bg-white border border-ink/10 space-y-2">
    <div className="skeleton h-8 w-12 rounded-md" />
    <div className="skeleton h-3.5 w-24 rounded-md" />
  </div>
);
