'use client';

interface Props {
  value: string;
  original?: string;
  onChange: (val: string) => void;
}

export default function LanguageSelector({ value, original, onChange }: Props) {
  return (
    <select
      className="rounded-full border border-slate-500 bg-slate-900 px-3 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="en">English (default)</option>

      {original && original !== 'en' && (
        <option value={original}>Original: {original.toUpperCase()}</option>
      )}

      <option value="ru">Russian</option>
      <option value="es">Spanish</option>
      <option value="de">German</option>
      <option value="fr">French</option>
    </select>
  );
}
