'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  BillingPeriod,
  MAX_SELF_SERVE_GROUP,
  MIN_GROUP_SIZE,
  formatGbp,
  isBespoke,
  priceFor,
} from '@/lib/pricing';

interface NurseryCountPickerProps {
  count: number;
  onChange: (count: number) => void;
  billing: BillingPeriod;
  /** Shown under the total, e.g. a note about what happens next. */
  footnote?: React.ReactNode;
  /**
   * Floor for the picker. Defaults to the smallest group. The upgrade page
   * raises it to the number of nurseries already live, because the server
   * refuses to sell an allowance smaller than that.
   */
  min?: number;
}

/**
 * Lets a group owner dial in how many nurseries they have and see the price
 * move. Above the self-serve ceiling it stops quoting and points at sales,
 * because those groups are negotiated individually.
 */
const NurseryCountPicker = ({
  count,
  onChange,
  billing,
  footnote,
  min = MIN_GROUP_SIZE,
}: NurseryCountPickerProps) => {
  const floor = Math.max(min, MIN_GROUP_SIZE);
  const quote = priceFor('platinum', billing, count);
  const per = billing === 'annual' ? 'year' : 'month';
  const bespoke = isBespoke(count);

  // Typing a bigger number is allowed so large groups can see the bespoke
  // message; only the slider stops at the self-serve ceiling.
  const clamp = (n: number) => Math.min(Math.max(n, floor), 999);
  const clampSlider = (n: number) =>
    Math.min(Math.max(n, floor), MAX_SELF_SERVE_GROUP);

  return (
    <div className="rounded-[8px] border border-gray-200 bg-white p-5">
      <label
        htmlFor="nursery-count"
        className="block text-sm font-medium text-gray-700"
      >
        How many nurseries?
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label="Fewer nurseries"
          onClick={() => onChange(clamp(count - 1))}
          disabled={count <= floor}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-secondary hover:text-secondary disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          id="nursery-count"
          type="number"
          inputMode="numeric"
          min={floor}
          max={999}
          value={count}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10);
            if (!Number.isNaN(next)) onChange(clamp(next));
          }}
          className="w-20 rounded-[6px] border border-gray-300 px-3 py-2 text-center text-lg font-medium focus:border-secondary focus:outline-none"
        />

        <button
          type="button"
          aria-label="More nurseries"
          onClick={() => onChange(clamp(count + 1))}
          disabled={count >= 999}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-secondary hover:text-secondary disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
        >
          <Plus className="h-4 w-4" />
        </button>

        <input
          type="range"
          aria-label="Number of nurseries"
          min={floor}
          max={MAX_SELF_SERVE_GROUP}
          value={Math.min(Math.max(count, floor), MAX_SELF_SERVE_GROUP)}
          onChange={(e) => onChange(clampSlider(parseInt(e.target.value, 10)))}
          className="ml-1 hidden h-2 flex-1 cursor-pointer accent-[#04B0D6] sm:block"
        />
      </div>

      {bespoke ? (
        <div className="mt-4 rounded-[6px] bg-gray-50 p-4 text-sm text-gray-700">
          Groups of {MAX_SELF_SERVE_GROUP + 1} or more are priced individually.
          Get in touch and we&apos;ll put together a quote.
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-[#044A55]">
              {formatGbp(quote.totalPence)}
            </span>
            <span className="text-sm text-gray-500">per {per}</span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            {formatGbp(quote.unitPence)} per nursery per {per} &times; {count}
            {quote.discountPercent > 0 && (
              <span className="ml-2 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                {quote.discountPercent}% group discount
              </span>
            )}
          </p>

          {footnote && <div className="mt-3 text-xs text-gray-500">{footnote}</div>}
        </div>
      )}
    </div>
  );
};

export default NurseryCountPicker;
