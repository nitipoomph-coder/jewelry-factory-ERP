import { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { MONTHS } from '../../utils/periodUtils';
import { usePeriodSetup, type PeriodState } from '../../hooks/usePeriodSetup';
import { useToast } from '../../contexts/ToastContext';

interface PeriodSetupPanelProps {
  periodSetup: ReturnType<typeof usePeriodSetup>;
  availableYears: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface PeriodSelectProps {
  label: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  disabled?: boolean;
  className?: string;
  onChange: (value: string | number) => void;
}

function PeriodSelect({ label, value, options, disabled = false, className = "", onChange }: PeriodSelectProps) {
  const customOptions = options.map(opt => ({ value: String(opt.value), label: opt.label }));
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
        {label}
      </span>
      <CustomSelect
        value={String(value)}
        disabled={disabled}
        onChange={(val: string) => onChange(val)}
        options={customOptions}
        ariaLabel={label}
      />
    </div>
  );
}

export default function PeriodSetupPanel({ periodSetup, availableYears, isOpen, onOpenChange }: PeriodSetupPanelProps) {
  const { showToast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const showPeriodPopover = isOpen !== undefined ? isOpen : internalOpen;
  const setShowPeriodPopover = useCallback((open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    setInternalOpen(open);
  }, [onOpenChange]);
  const periodPopoverRef = useRef<HTMLDivElement>(null);

  const syncDraft = periodSetup.actions.syncDraft;
  useEffect(() => {
    if (isOpen) {
      syncDraft();
    }
  }, [isOpen, syncDraft]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodPopoverRef.current && !periodPopoverRef.current.contains(event.target as Node)) {
        setShowPeriodPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowPeriodPopover]);

  const selectedYears = periodSetup.committed.selectedYears;
  const committedPreset = periodSetup.committed.preset;

  const formatDateShort = (ymd?: string) => {
    if (!ymd) return '';
    const parts = ymd.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ymd;
  };

  const getPeriodLabelText = () => {
    if (committedPreset === 'day') return 'Day';
    if (committedPreset === 'week') return 'Week';
    if (committedPreset === 'custom' || committedPreset === 'month') return 'Month';
    return 'Year';
  };

  const getPeriodRangeDetailText = () => {
    if (committedPreset === 'day') {
      return `${formatDateShort(periodSetup.committed.dateFrom)} - ${formatDateShort(periodSetup.committed.dateTo)}`;
    }
    if (committedPreset === 'week') {
      return `${selectedYears[0] || ''} W${periodSetup.committed.weekFrom}-W${periodSetup.committed.weekTo}`;
    }
    if (committedPreset === 'custom' || committedPreset === 'month') {
      return `${selectedYears[0] || ''} ${MONTHS[periodSetup.committed.monthFrom - 1]}`;
    }
    if (periodSetup.committed.monthFrom === 1 && periodSetup.committed.monthTo === 12) {
      return `${selectedYears[0] || ''} Full Year`;
    }
    return `${selectedYears[0] || ''} ${MONTHS[periodSetup.committed.monthFrom - 1]}`;
  };

  return (
    <div className="relative" ref={periodPopoverRef}>
      <button
        type="button"
        onClick={() => {
          if (!showPeriodPopover) {
            periodSetup.actions.syncDraft();
          }
          setShowPeriodPopover(!showPeriodPopover);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border-none rounded-md text-[0.85rem] font-black text-[var(--color-text-primary)] cursor-pointer whitespace-nowrap font-display transition-colors hover:bg-[var(--color-surface-1)] ${
          showPeriodPopover ? 'bg-[var(--color-surface-2)]' : 'bg-transparent'
        }`}
      >
        <CalendarDays size={14} className="text-[var(--color-brand-500)]" />
        <>
          <span className="text-[var(--color-text-secondary)] text-[0.76rem] font-bold">
            Period:
          </span>
          <span>{getPeriodLabelText()}</span>
          <span className="text-[var(--color-text-tertiary)] text-[0.72rem] font-extrabold">
            ({getPeriodRangeDetailText()})
          </span>
        </>
        <ChevronDown size={14} className="text-[var(--color-text-tertiary)]" />
      </button>

      {showPeriodPopover && (
        <div className="sales-gallery-period-menu absolute left-0 top-full z-[110] mt-2 w-[480px] period-popover-animate">
          {/* New Filter: Period Setup for all screens */}
          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2.5 mb-3">
            <div className="flex items-center gap-4">
              <span className="text-xs font-black capitalize tracking-wider text-[var(--color-text-primary)]">
                Period Setup
              </span>
              {periodSetup.config.allowDateFieldToggle && (
                <div className="flex items-center bg-[var(--color-surface-2)] p-0.5 rounded-md border border-[var(--color-border-light)]">
                  <button
                    type="button"
                    onClick={() => periodSetup.actions.setDraftField({ dateField: 'ordDate' })}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${periodSetup.draft.dateField === 'ordDate' ? 'bg-[var(--color-surface-0)] text-[var(--color-brand-600)] shadow-sm' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}`}
                  >
                    Order Date
                  </button>
                  <button
                    type="button"
                    onClick={() => periodSetup.actions.setDraftField({ dateField: 'dueDate' })}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${periodSetup.draft.dateField === 'dueDate' ? 'bg-[var(--color-surface-0)] text-[var(--color-brand-600)] shadow-sm' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}`}
                  >
                    Due Date
                  </button>
                </div>
              )}
            </div>
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
              {getPeriodRangeDetailText()}
              {periodSetup.committed.compareActive1 && ` vs ${periodSetup.committed.compareYear1}`}
            </span>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-4">
            {/* Left: Quick Presets (Modes) */}
            <div className="flex flex-col gap-2 border-r border-[var(--color-border-light)] pr-3">
              <div className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                Mode
              </div>
              <div className="flex flex-col gap-1.5">
                  {[
                    { id: 'ytd', label: 'Year' },
                    { id: 'month', label: 'Month' },
                    { id: 'week', label: 'Week' },
                    { id: 'day', label: 'Day' }
                  ].map((preset) => {
                    const active = periodSetup.draft.preset === preset.id || (preset.id === 'month' && periodSetup.draft.preset === 'custom') || (preset.id === 'ytd' && (periodSetup.draft.preset === 'full-year' || periodSetup.draft.preset === 'ytd'));
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (preset.id === 'ytd') {
                            periodSetup.actions.setDraftField({ preset: 'full-year', monthFrom: 1, monthTo: 12 });
                          } else if (preset.id === 'month') {
                            const currentM = periodSetup.draft.monthFrom || (new Date().getMonth() + 1);
                            periodSetup.actions.setDraftField({ preset: 'month', monthFrom: currentM, monthTo: currentM, selectedMonths: [String(currentM)] });
                          } else if (preset.id === 'week') {
                            periodSetup.actions.setDraftField({ preset: 'week' });
                          } else if (preset.id === 'day') {
                            const now = new Date();
                            const y = now.getFullYear();
                            const m = String(now.getMonth() + 1).padStart(2, '0');
                            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                            
                            const defaultFrom = `${y}-${m}-01`;
                            const defaultTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
                            
                            periodSetup.actions.setDraftField({
                              preset: 'day',
                              dateFrom: periodSetup.draft.dateFrom || defaultFrom,
                              dateTo: periodSetup.draft.dateTo || defaultTo
                            });
                          }
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-black transition-colors ${active ? "border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_9%,var(--color-surface-0))] text-[var(--color-brand-600)]" : "border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Right: Custom Options & Base Year */}
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
                Period Range
              </div>

              {/* Dynamic Range Form */}
              {periodSetup.draft.preset === 'day' && (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--color-text-secondary)]">From Date</label>
                    <input
                      type="date"
                      className="rounded border border-[var(--color-border-light)] p-1.5 text-xs focus:border-[var(--color-brand-400)] focus:ring-1 focus:ring-[var(--color-brand-400)] outline-none"
                      value={periodSetup.draft.dateFrom || ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const dateStart = new Date(newDate);
                        const dateEnd = new Date(periodSetup.draft.dateTo || newDate);
                        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        let finalDateTo = periodSetup.draft.dateTo || newDate;
                        if (diffDays > 30) {
                          showToast("Maximum 31 days allowed. Consider using Month or Week mode.", "warning");
                          const maxDateEnd = new Date(dateStart);
                          maxDateEnd.setDate(dateStart.getDate() + 30);
                          finalDateTo = maxDateEnd.toISOString().split('T')[0];
                        }

                        periodSetup.actions.setDraftField({
                          dateFrom: newDate,
                          dateTo: finalDateTo,
                          baseYear: String(dateStart.getFullYear())
                        });
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--color-text-secondary)]">To Date</label>
                    <input
                      type="date"
                      className="rounded border border-[var(--color-border-light)] p-1.5 text-xs focus:border-[var(--color-brand-400)] focus:ring-1 focus:ring-[var(--color-brand-400)] outline-none"
                      value={periodSetup.draft.dateTo || ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const dateEnd = new Date(newDate);
                        const dateStart = new Date(periodSetup.draft.dateFrom || newDate);
                        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        let finalDateFrom = periodSetup.draft.dateFrom || newDate;
                        if (diffDays > 30) {
                          showToast("Maximum 31 days allowed. Consider using Month or Week mode.", "warning");
                          const maxDateStart = new Date(dateEnd);
                          maxDateStart.setDate(dateEnd.getDate() - 30);
                          finalDateFrom = maxDateStart.toISOString().split('T')[0];
                        }

                        periodSetup.actions.setDraftField({
                          dateTo: newDate,
                          dateFrom: finalDateFrom,
                          baseYear: String(dateEnd.getFullYear())
                        });
                      }}
                    />
                  </div>
                  </div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] italic">
                    * Maximum 31 days
                  </div>
                </div>
              )}
              {(periodSetup.draft.preset === 'custom' || periodSetup.draft.preset === 'month') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--color-text-secondary)]">Select Months</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MONTHS.map((month: string, index: number) => {
                      const monthVal = String(index + 1);
                      const isSelected = periodSetup.draft.selectedMonths?.includes(monthVal) || (!periodSetup.draft.selectedMonths && periodSetup.draft.monthFrom <= index + 1 && periodSetup.draft.monthTo >= index + 1);
                      return (
                        <button
                          key={monthVal}
                          type="button"
                          onClick={() => {
                            let currentSelected = periodSetup.draft.selectedMonths || [];
                            if (currentSelected.length === 0) currentSelected = [String(periodSetup.draft.monthFrom)];
                            
                            let newSelected;
                            if (isSelected) {
                              newSelected = currentSelected.filter(m => m !== monthVal);
                              if (newSelected.length === 0) newSelected = [monthVal]; // prevent completely empty selection
                            } else {
                              newSelected = [...currentSelected, monthVal];
                            }
                            
                            newSelected.sort((a, b) => Number(a) - Number(b));
                            periodSetup.actions.setDraftField({ 
                              selectedMonths: newSelected,
                              monthFrom: Number(newSelected[0]),
                              monthTo: Number(newSelected[newSelected.length - 1])
                            });
                          }}
                          className={`rounded border px-1 py-1 text-center text-[10px] font-black transition-colors ${isSelected ? "border-[var(--color-brand-400)] bg-[color-mix(in_srgb,var(--color-brand-500)_15%,var(--color-surface-0))] text-[var(--color-brand-700)]" : "border-[var(--color-border-light)] bg-[var(--color-surface-0)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)]"}`}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {periodSetup.draft.preset === 'week' && (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-2.5">
                  <PeriodSelect
                    label="From Wk"
                    value={periodSetup.draft.weekFrom || 1}
                    options={Array.from({ length: 53 }, (_, i) => ({ value: i + 1, label: `W${i + 1}` }))}
                    onChange={(value) => {
                      const newFrom = Number(value);
                      const currentTo = periodSetup.draft.weekTo || 53;
                      let finalTo = currentTo;
                      if (currentTo < newFrom) {
                        finalTo = newFrom;
                      } else if (currentTo - newFrom + 1 > 12) {
                        showToast("Maximum 12 weeks allowed. Consider using Month mode.", "warning");
                        finalTo = newFrom + 11;
                      }
                      periodSetup.actions.setDraftField({ weekFrom: newFrom, weekTo: finalTo });
                    }}
                  />
                  <PeriodSelect
                    label="To Wk"
                    value={periodSetup.draft.weekTo || 53}
                    options={Array.from({ length: 53 }, (_, i) => ({ value: i + 1, label: `W${i + 1}` }))}
                    onChange={(value) => {
                      const newTo = Number(value);
                      const currentFrom = periodSetup.draft.weekFrom || 1;
                      let finalFrom = currentFrom;
                      if (newTo < currentFrom) {
                        finalFrom = newTo;
                      } else if (newTo - currentFrom + 1 > 12) {
                        showToast("Maximum 12 weeks allowed. Consider using Month mode.", "warning");
                        finalFrom = newTo - 11;
                      }
                      periodSetup.actions.setDraftField({ weekTo: newTo, weekFrom: finalFrom });
                    }}
                  />
                  </div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] italic">
                    * Maximum 12 weeks
                  </div>
                </div>
              )}

              {periodSetup.draft.preset !== 'day' && (
                <PeriodSelect
                  label="Year (Base Year)"
                  value={periodSetup.draft.baseYear}
                  options={availableYears.filter(yr => {
                    if (periodSetup.draft.compareActive1 && yr === periodSetup.draft.compareYear1) return false;
                    if (periodSetup.draft.compareActive2 && yr === periodSetup.draft.compareYear2 && yr !== 'none') return false;
                    return true;
                  }).map(yr => ({ value: yr, label: yr }))}
                  onChange={(value) => periodSetup.actions.setDraftField({ baseYear: String(value) })}
                />
              )}
            </div>
          </div>

          {/* Compare Years Section (Horizontal row for space efficiency) */}
          <div className="mt-4 pt-3.5 border-t border-[var(--color-border-light)]">
            <div className="mb-2.5 text-[10px] font-black capitalize tracking-wider text-[var(--color-text-tertiary)]">
              Compare Target Years
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Compare Year 1 */}
              <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={periodSetup.draft.compareActive1}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const updates: Partial<PeriodState> = { compareActive1: checked };
                      if (checked && periodSetup.draft.compareYear1 && periodSetup.draft.compareYear1 !== 'none' && (!periodSetup.draft.compareActive2 || periodSetup.draft.kpiCompareYear === 'none')) {
                        updates.kpiCompareYear = periodSetup.draft.compareYear1;
                      } else if (!checked) {
                        if (periodSetup.draft.compareActive2 && periodSetup.draft.compareYear2 && periodSetup.draft.compareYear2 !== 'none') {
                          updates.kpiCompareYear = periodSetup.draft.compareYear2;
                        } else {
                          updates.kpiCompareYear = 'none';
                        }
                      }
                      periodSetup.actions.setDraftField(updates);
                    }}
                    className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                  />
                  <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 1</span>
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={periodSetup.draft.compareYear1}
                    disabled={!periodSetup.draft.compareActive1}
                    onChange={(val: string) => {
                      const updates: Partial<PeriodState> = { compareYear1: val };
                      if (periodSetup.draft.kpiCompareYear === periodSetup.draft.compareYear1 || !periodSetup.draft.compareActive2 || periodSetup.draft.kpiCompareYear === 'none') {
                        updates.kpiCompareYear = val;
                      }
                      periodSetup.actions.setDraftField(updates);
                    }}
                    options={availableYears.filter(yr => {
                      if (yr === periodSetup.draft.baseYear) return false;
                      if (periodSetup.draft.compareActive2 && yr === periodSetup.draft.compareYear2 && yr !== 'none') return false;
                      return true;
                    }).map(yr => ({ value: yr, label: yr }))}
                    ariaLabel="Compare Year 1"
                  />
                </div>
              </div>

              {/* Compare Year 2 */}
              <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={periodSetup.draft.compareActive2}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const updates: Partial<PeriodState> = { compareActive2: checked };
                      if (checked && periodSetup.draft.compareYear2 && periodSetup.draft.compareYear2 !== 'none' && (!periodSetup.draft.compareActive1 || periodSetup.draft.kpiCompareYear === 'none')) {
                        updates.kpiCompareYear = periodSetup.draft.compareYear2;
                      } else if (!checked) {
                        if (periodSetup.draft.compareActive1 && periodSetup.draft.compareYear1 && periodSetup.draft.compareYear1 !== 'none') {
                          updates.kpiCompareYear = periodSetup.draft.compareYear1;
                        } else {
                          updates.kpiCompareYear = 'none';
                        }
                      }
                      periodSetup.actions.setDraftField(updates);
                    }}
                    className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                  />
                  <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare 2</span>
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={periodSetup.draft.compareYear2}
                    disabled={!periodSetup.draft.compareActive2}
                    onChange={(val: string) => {
                      const updates: Partial<PeriodState> = { compareYear2: val };
                      if (val !== 'none') {
                        if (periodSetup.draft.kpiCompareYear === periodSetup.draft.compareYear2 || !periodSetup.draft.compareActive1 || periodSetup.draft.kpiCompareYear === 'none') {
                          updates.kpiCompareYear = val;
                        }
                      } else if (!periodSetup.draft.compareActive1) {
                        updates.kpiCompareYear = 'none';
                      }
                      periodSetup.actions.setDraftField(updates);
                    }}
                    options={[
                      { value: 'none', label: 'None' },
                      ...availableYears.filter(yr => {
                        if (yr === periodSetup.draft.baseYear) return false;
                        if (periodSetup.draft.compareActive1 && yr === periodSetup.draft.compareYear1) return false;
                        return true;
                      }).map(yr => ({ value: yr, label: yr }))
                    ]}
                    ariaLabel="Compare Year 2"
                  />
                </div>
              </div>

              {/* Compare Target (Primary comparison year for YoY calculations) */}
              <div className="flex flex-col gap-1 bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border-light)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={periodSetup.draft.kpiCompareYear !== 'none'}
                    disabled={!periodSetup.draft.compareActive1 && !periodSetup.draft.compareActive2}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const valid = periodSetup.draft.compareActive1 ? periodSetup.draft.compareYear1 : periodSetup.draft.compareActive2 ? periodSetup.draft.compareYear2 : '';
                        periodSetup.actions.setDraftField({ kpiCompareYear: valid || '' });
                      } else {
                        periodSetup.actions.setDraftField({ kpiCompareYear: 'none' });
                      }
                    }}
                    className="rounded border-[var(--color-border-light)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
                  />
                  <span className="text-[10px] font-black text-[var(--color-text-secondary)]">Compare Target</span>
                </label>
                <div className="mt-1">
                  <CustomSelect
                    value={periodSetup.draft.kpiCompareYear === 'none' ? '' : periodSetup.draft.kpiCompareYear}
                    disabled={periodSetup.draft.kpiCompareYear === 'none' || (!periodSetup.draft.compareActive1 && !periodSetup.draft.compareActive2)}
                    onChange={(val: string) => periodSetup.actions.setDraftField({ kpiCompareYear: val })}
                    options={[
                      ...(periodSetup.draft.compareActive1 && periodSetup.draft.compareYear1 && periodSetup.draft.compareYear1 !== 'none' ? [{ value: periodSetup.draft.compareYear1, label: periodSetup.draft.compareYear1 }] : []),
                      ...(periodSetup.draft.compareActive2 && periodSetup.draft.compareYear2 && periodSetup.draft.compareYear2 !== 'none' ? [{ value: periodSetup.draft.compareYear2, label: periodSetup.draft.compareYear2 }] : [])
                    ].filter((opt, index, self) => self.findIndex(t => t.value === opt.value) === index)}
                    ariaLabel="Compare Target Year"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border-light)] flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPeriodPopover(false)}
              className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { periodSetup.actions.apply(); setShowPeriodPopover(false); }}
              className="rounded-lg border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,var(--color-surface-0))] px-4 py-2 text-xs font-black text-[var(--color-brand-600)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_16%,var(--color-surface-0))]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}






