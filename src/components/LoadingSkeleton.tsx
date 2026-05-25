import React from "react";

interface Props {
  emoji: string;
  title: string;
  desc: string;
}

export default function LoadingSkeleton({ count = 6 }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse"
        >
          <div className="h-3 bg-gray-800 rounded w-1/3 mb-3"></div>
          <div className="h-5 bg-gray-800 rounded w-2/3 mb-4"></div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-800 rounded w-1/2"></div>
            <div className="h-10 bg-gray-800 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
