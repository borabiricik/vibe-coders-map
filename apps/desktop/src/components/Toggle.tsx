interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
          checked ? "bg-violet-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
      <span className="text-xs text-gray-400">{label}</span>
    </label>
  );
}
