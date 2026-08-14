import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  onRate: (rating: number) => void;
  disabled?: boolean;
  submitting?: boolean;
}

const labels = ["很差", "较差", "一般", "好", "很好"];

export function RatingStars({ onRate, disabled, submitting }: Props) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHovered(n)}
            onMouseLeave={() => !disabled && setHovered(0)}
            onClick={() => {
              if (disabled) return;
              setSelected(n);
              onRate(n);
            }}
            className={`p-1 transition duration-150 ease-in-out ${
              disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
          >
            <Star
              className={`w-7 h-7 ${
                (hovered || selected) >= n ? "text-blue-600 fill-blue-600" : "text-[#D6D8DE]"
              } transition-colors duration-150`}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-[#A0A0A8] h-4">
        {submitting ? "提交评分中..." : (hovered || selected) > 0 ? labels[(hovered || selected) - 1] : "点击星星为本次对话评分"}
      </p>
    </div>
  );
}
