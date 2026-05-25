import React from "react";

interface Props {
  emoji: string;
  title: string;
  desc: string;
}

export default function EmptyState({ emoji, title, desc }: Props) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-12 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{desc}</p>
    </div>
  );
}
