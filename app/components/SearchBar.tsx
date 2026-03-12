'use client';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchBar({ value, onChange, className = '' }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск по статьям..."
        className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-none text-sm focus:outline-none focus:shadow-[0_0_0_1px_black] transition-shadow"
      />
    </div>
  );
}
