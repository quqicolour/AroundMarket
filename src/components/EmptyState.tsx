interface Props {
  emoji?: string;
  title: string;
  desc?: string;
}

export default function EmptyState({ emoji, title, desc }: Props) {
  return (
    <div className="empty-block">
      {emoji ? <span className="empty-icon">{emoji}</span> : null}
      <p className="empty-title">{title}</p>
      {desc ? <p className="empty-desc">{desc}</p> : null}
    </div>
  );
}
