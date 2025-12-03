'use client';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <select
      className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-1 text-sm text-slate-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="en">English</option>
      <option value="ru">Russian</option>
    </select>
  );
}
