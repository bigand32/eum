"use client";

import { MASTER_CATEGORIES } from "@/lib/master-categories";

export function MasterCategoryPicker({
  value,
  onChange,
  label = "전문 분야",
  hint = "해당하는 장르를 모두 선택해 주세요",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const toggle = (category: string) => {
    if (value.includes(category)) {
      onChange(value.filter((item) => item !== category));
      return;
    }
    onChange([...value, category]);
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <label className="block text-[13px] font-bold text-gray-700">{label}</label>
        {value.length > 0 && (
          <span className="text-[11px] font-medium text-gray-400">{value.length}개 선택</span>
        )}
      </div>
      {hint && <p className="mb-2.5 text-[12px] font-medium text-gray-400">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {MASTER_CATEGORIES.map((category) => {
          const selected = value.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition ${
                selected
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
