interface Props {
  emoji?: string;
  title: string;
  desc?: string;
}

export default function EmptyState({ emoji, title, desc }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {emoji && <span className="text-6xl">{emoji}</span>}
      <p className="text-gray-500 text-lg font-medium">{title}</p>
      {desc && <p className="text-gray-400 text-sm">{desc}</p>}
    </div>
  );
}
