export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="7" height="7" rx="2" fill="#f5a524" />
        <rect x="15" y="3" width="7" height="7" rx="2" fill="#3b9eff" />
        <rect x="8.5" y="14" width="7" height="7" rx="2" fill="#7c6cff" />
        <path d="M9 6.5h6M5.5 10v2.5a2 2 0 0 0 2 2h1M18.5 10v2.5a2 2 0 0 1-2 2h-1" stroke="#4b5263" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      FlowForge
    </span>
  );
}
