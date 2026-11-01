import { formatDateDDMMYY } from '../utils/dateUtils';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import {
  Search,
  RotateCcw,
  ImageOff,
  RefreshCw,
  X
} from 'lucide-react';
import { getOrderTracking, getOrderSuggestions } from '../services/orderTrackingAPI';
import type { OrderTrackingResponse, OrderSuggestion } from '../services/orderTrackingAPI';
import { OrderTrackStepper } from '../components/dashboard/orderTracking/OrderTrackStepper';
import { psPhotoUrl, attachPhotoFallback } from '../utils/photoUrl';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { useToast } from '../contexts/ToastContext';
import { FBEOrderTrackSkeleton } from '../components/dashboard/fbeOrderTrack/FBEOrderTrackSkeleton';

/**
 * Factory affiliation rule:
 * - FBD / FBE -> 'FBE'
 * - CLL -> 'CLL'
 * - null / empty -> 'CLL'
 */
const getFactoryBadge = (proFac?: string | null): 'FBE' | 'CLL' => {
  const clean = (proFac || '').trim().toUpperCase();
  return clean === 'FBD' || clean === 'FBE' ? 'FBE' : 'CLL';
};

type HistoryStatusFilter = 'ALL' | 'DONE' | 'IN_PROGRESS';

export default function FBEOrderTrackPage() {
  const [ordNo, setOrdNo] = useState('');
  const [ordLineNo, setOrdLineNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrderTrackingResponse | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('ALL');
  const [isImageOpen, setIsImageOpen] = useState(false);
  const { showToast } = useToast();

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<OrderSuggestion[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState(-1);
  const suggestContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchQueryRef = useRef('');

  const breadcrumb = BREADCRUMBS.FBE_ORDER_TRACK;

  const ordNoRef = useRef(ordNo);
  const ordLineNoRef = useRef(ordLineNo);

  useEffect(() => {
    ordNoRef.current = ordNo;
    ordLineNoRef.current = ordLineNo;
  }, [ordNo, ordLineNo]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestContainerRef.current && !suggestContainerRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close photo modal on Escape key
  useEffect(() => {
    if (!isImageOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageOpen]);

  // ฟังก์ชัน Search พร้อม Toast Notifications ตามระบบมาตรฐาน
  const executeSearch = useCallback(async (targetOrd: string, targetLine: string) => {
    const cleanOrd = targetOrd.trim();
    const cleanLine = targetLine.trim();

    if (!cleanOrd && !cleanLine) {
      showToast('Please enter Order No. and Line No.', 'warning');
      return;
    }
    if (!cleanOrd) {
      showToast('Please enter Order No.', 'warning');
      return;
    }
    if (!cleanLine) {
      showToast('Please specify Line No.', 'warning');
      return;
    }

    setLoading(true);
    setImgFailed(false);

    try {
      const res = await getOrderTracking(cleanOrd, cleanLine);
      setData(res);
    } catch (err: unknown) {
      setData(null);
      const errMsg = err instanceof Error ? err.message : 'Order not found in system';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSuggestOpen(false);
    setSuggestions([]);
    executeSearch(ordNo, ordLineNo);
  };

  // พิมพ์ในช่อง Order No. พร้อมระบบค้นหาแนะนำอัตโนมัติ (Debounce 220ms + Stale Guard)
  const handleOrdNoChange = (val: string) => {
    setOrdNo(val);
    setSelectedSuggestIndex(-1);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const cleanVal = val.trim();
    latestSearchQueryRef.current = cleanVal;

    if (cleanVal.length < 2) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const results = await getOrderSuggestions(cleanVal);
        // Stale Response Guard: ป้องกันไม่ให้ผลลัพธ์เก่าเขียนทับคำค้นหาล่าสุด
        if (latestSearchQueryRef.current.toUpperCase() === cleanVal.toUpperCase()) {
          setSuggestions(results);
          setIsSuggestOpen(results.length > 0);
        }
      } catch {
        if (latestSearchQueryRef.current.toUpperCase() === cleanVal.toUpperCase()) {
          setSuggestions([]);
          setIsSuggestOpen(false);
        }
      } finally {
        if (latestSearchQueryRef.current.toUpperCase() === cleanVal.toUpperCase()) {
          setSuggestLoading(false);
        }
      }
    }, 220);
  };

  // คลิกเลือกรายการจาก Dropdown
  const handleSelectSuggestion = (item: OrderSuggestion) => {
    setOrdNo(item.OrdNo);
    setOrdLineNo(String(item.OrdLineNo));
    setIsSuggestOpen(false);
    setSuggestions([]);
    executeSearch(item.OrdNo, String(item.OrdLineNo));
  };

  // ควบคุมผ่านคีย์บอร์ด (ลูกศรขึ้น/ลง, Enter, Escape)
  const handleOrdNoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedSuggestIndex >= 0) {
      e.preventDefault();
      if (suggestions[selectedSuggestIndex]) {
        handleSelectSuggestion(suggestions[selectedSuggestIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestOpen(false);
    }
  };

  const handleClear = () => {
    setOrdNo('');
    setOrdLineNo('');
    setData(null);
    setImgFailed(false);
    setSuggestions([]);
    setIsSuggestOpen(false);
    setSelectedSuggestIndex(-1);
    setStatusFilter('ALL');
    setIsImageOpen(false);
  };

  const info = data?.orderInfo;
  const summary = data?.summary;

  // Filter only in-progress (WIP) steps
  const activeSteps = data?.steps.filter(s => s.status === 1 || s.balance > 0) || [];
  const activeStepNames = activeSteps.length > 0
    ? activeSteps.map(s => s.nameEN).join(', ')
    : null;

  // Step History filter counts and filtered data
  const historyCounts = useMemo(() => {
    const list = data?.history || [];
    const done = list.filter((h) => h.status === 2).length;
    const inProgress = list.filter((h) => h.status === 1).length;
    return {
      all: list.length,
      done,
      inProgress,
    };
  }, [data?.history]);

  const filteredHistory = useMemo(() => {
    const list = data?.history || [];
    if (statusFilter === 'DONE') {
      return list.filter((h) => h.status === 2);
    }
    if (statusFilter === 'IN_PROGRESS') {
      return list.filter((h) => h.status === 1);
    }
    return list;
  }, [data?.history, statusFilter]);

  const { setTopbarActions } = useTopbarActions();
  const [isSpinning, setIsSpinning] = React.useState(false);

  const handleReload = useCallback(async () => {
    setIsSpinning(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      if (ordNoRef.current) {
        await executeSearch(ordNoRef.current, ordLineNoRef.current);
      }
      await minDelay;
    } finally {
      setIsSpinning(false);
    }
  }, [executeSearch]);

  const isRefreshing = isSpinning || loading;

  React.useEffect(() => {
    setTopbarActions(
      <button
        onClick={handleReload}
        disabled={isRefreshing}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isRefreshing ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isRefreshing ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-brand-600)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        title="Reload Data"
        aria-label="Reload current order"
      >
        <RefreshCw
          size={18}
          strokeWidth={1.75}
          className={isRefreshing ? 'animate-spin text-[var(--color-brand-600)]' : ''}
        />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, handleReload, isRefreshing]);

  return (
    <div className="erp-page-container flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-ui-canvas)', color: 'var(--color-text-primary)' }}>
      {/* Topbar Header */}
      <div className="no-print">
        <PageHeader
          breadcrumb={breadcrumb}
          contentLayout="workspace"
        />
      </div>

      {/* Workspace Body: Semantic <main> พร้อม Single-Screen Fit (ไม่เลื่อนจอหลัก) */}
      <main
        aria-label="FBE Order Tracker Workspace"
        className="app-content-frame app-content-frame--workspace app-page-content flex-1 overflow-y-auto overflow-x-hidden lg:overflow-hidden p-2 flex flex-col min-h-0 gap-2"
      >
        {/* แถบ Search: ผูก htmlFor/id ชัดเจน + Focus Visible */}
        <div style={{ background: 'var(--color-ui-surface)', border: '1px solid var(--color-border-default)', borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div ref={suggestContainerRef} style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
              <label
                htmlFor="fbe-order-no-input"
                style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}
              >
                Order No.
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="fbe-order-no-input"
                  name="orderNo"
                  type="text"
                  autoComplete="off"
                  value={ordNo}
                  onChange={(e) => handleOrdNoChange(e.target.value)}
                  onKeyDown={handleOrdNoKeyDown}
                  onFocus={() => {
                    const clean = ordNo.trim().toUpperCase();
                    if (
                      suggestions.length > 0 &&
                      clean.length >= 2 &&
                      suggestions[0]?.OrdNo.toUpperCase().startsWith(clean)
                    ) {
                      setIsSuggestOpen(true);
                    }
                  }}
                  aria-required="true"
                  aria-autocomplete="list"
                  aria-expanded={isSuggestOpen}
                  className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
                  style={{
                    width: '12rem', padding: '5px 28px 5px 10px', fontSize: '13.5px',
                    fontWeight: 700, textTransform: 'uppercase',
                    borderRadius: 5, border: '1px solid var(--color-border-strong)',
                    background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)',
                  }}
                />
                {suggestLoading && (
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <RefreshCw size={12} className="animate-spin text-[var(--color-brand-500)]" />
                  </span>
                )}

                {/* Dropdown Popover */}
                {isSuggestOpen && suggestions.length > 0 && (
                  <div
                    role="listbox"
                    aria-label="Order Suggestions"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      width: '23rem',
                      maxHeight: '19rem',
                      overflowY: 'auto',
                      background: 'var(--color-ui-surface)',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-dropdown)',
                      zIndex: 100,
                      padding: '4px',
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-default)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Orders ({suggestions.length})</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Click or Enter to select</span>
                    </div>
                    {suggestions.map((item, idx) => {
                      const isSelected = idx === selectedSuggestIndex;
                      const fac = getFactoryBadge(item.ProFac);
                      return (
                        <div
                          key={`${item.OrdNo}-${item.OrdLineNo}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setSelectedSuggestIndex(idx)}
                          style={{
                            padding: '7px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: isSelected ? 'var(--color-surface-2)' : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            transition: 'background 0.1s ease',
                            borderBottom: idx < suggestions.length - 1 ? '1px solid color-mix(in srgb, var(--color-border-default) 40%, transparent)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                {item.OrdNo}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)', color: 'var(--color-brand-600)' }}>
                                Line {item.OrdLineNo}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: fac === 'FBE'
                                    ? 'color-mix(in srgb, var(--color-proc-grinding) 15%, transparent)'
                                    : 'color-mix(in srgb, var(--color-info-500) 15%, transparent)',
                                  color: fac === 'FBE' ? 'var(--color-proc-grinding)' : 'var(--color-info-600)',
                                  border: `1px solid ${fac === 'FBE' ? 'color-mix(in srgb, var(--color-proc-grinding) 30%, transparent)' : 'color-mix(in srgb, var(--color-info-500) 30%, transparent)'}`,
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {fac}
                              </span>
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                              {item.CustCode}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>{item.ItemNo}</span>
                            {item.ItemDesc && (
                              <span style={{ maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--color-text-tertiary)' }} title={item.ItemDesc}>
                                {item.ItemDesc}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                htmlFor="fbe-order-line-input"
                style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}
              >
                Line
              </label>
              <input
                id="fbe-order-line-input"
                name="orderLine"
                type="text"
                value={ordLineNo}
                onChange={(e) => setOrdLineNo(e.target.value)}
                aria-required="true"
                className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
                style={{
                  width: '3.6rem', padding: '5px 8px', fontSize: '13.5px',
                  fontWeight: 700, textAlign: 'center',
                  borderRadius: 5, border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px',
                background: 'var(--color-ui-interactive)', color: 'var(--color-ui-on-interactive)',
                border: 'none', borderRadius: 5, fontSize: '12.5px',
                fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s ease',
              }}
            >
              {loading ? <RefreshCw size={12} className="animate-spin" aria-hidden="true" /> : <Search size={12} aria-hidden="true" />}
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:outline-none"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)',
                borderRadius: 5, color: 'var(--color-text-secondary)', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
              }}
            >
              <RotateCcw size={11} aria-hidden="true" />
              <span>Clear</span>
            </button>
          </form>
        </div>

        {/* พื้นที่หลักแบ่ง 2 คอลัมน์ หรือ Skeleton ขณะโหลด */}
        {loading ? (
          <FBEOrderTrackSkeleton />
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-[auto] lg:min-h-0">

            {/* ================================================================= */}
            {/* ฝั่งซ้าย: Order Info + แถบStatus + ไทม์ไลน์ 17 Step + ตารางประวัติ */}
            {/* ================================================================= */}
            <div className="lg:col-span-9 flex flex-col gap-2 min-h-[auto] lg:min-h-0 lg:overflow-hidden">

              {/* 1. Order Info (Order Information) */}
              <section
                aria-label="Order Information"
                className="flex-shrink-0"
                style={{
                  background: 'linear-gradient(180deg, var(--color-ui-surface) 0%, color-mix(in srgb, var(--color-surface-1) 70%, var(--color-ui-surface)) 100%)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--color-border-default)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                      Order Information
                    </h2>
                    {info && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: getFactoryBadge(info.ProFac) === 'FBE'
                            ? 'color-mix(in srgb, var(--color-proc-grinding) 15%, transparent)'
                            : 'color-mix(in srgb, var(--color-info-500) 15%, transparent)',
                          color: getFactoryBadge(info.ProFac) === 'FBE' ? 'var(--color-proc-grinding)' : 'var(--color-info-600)',
                          border: `1px solid ${getFactoryBadge(info.ProFac) === 'FBE' ? 'color-mix(in srgb, var(--color-proc-grinding) 30%, transparent)' : 'color-mix(in srgb, var(--color-info-500) 30%, transparent)'}`,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {getFactoryBadge(info.ProFac)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-ui-interactive)' }}>
                    {info ? `${ordNo} / Line ${info.OrdLineNo || ordLineNo}` : '-'}
                  </span>
                </div>

                {/* Grid 3 คอลัมน์ตามเลย์เอาต์ต้นแบบ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12.5px]">

                  {/* Column 1: Customer / Factory / Order Date / Due Date / PO No */}
                  <div className="flex flex-col gap-1 lg:pr-3 border-b lg:border-b-0 lg:border-r border-[var(--color-border-default)] pb-2 lg:pb-0">
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Customer:</span>
                      <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13px' }}>{info?.CustCode || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Factory:</span>
                      <span style={{ fontWeight: 800, color: getFactoryBadge(info?.ProFac) === 'FBE' ? 'var(--color-proc-grinding)' : 'var(--color-info-600)', fontSize: '12.5px' }}>
                        {info ? getFactoryBadge(info.ProFac) : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Order Date:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>
                        {info?.OrdDate ? formatDateDDMMYY(info.OrdDate) : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-warning-600)', fontWeight: 800 }}>Due Date:</span>
                      <span style={{ fontWeight: 900, color: 'var(--color-warning-600)', fontSize: '13px' }}>
                        {info?.DueDate ? formatDateDDMMYY(info.DueDate) : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>PO No.:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.PONo || '-'}</span>
                    </div>
                  </div>

                  {/* Column 2: Item No / Material / Cust Item / Description */}
                  <div className="flex flex-col gap-1 lg:pr-3 border-b lg:border-b-0 lg:border-r border-[var(--color-border-default)] pt-2 lg:pt-0 pb-2 lg:pb-0">
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Item No.:</span>
                      <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13px' }}>{info?.ItemNo || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Material:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemMat || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cust Item:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemCust || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Description:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '14rem' }} title={info?.ItemDesc || '-'}>
                        {info?.ItemDesc || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Column 3: Stone / Plate / Size / Qty */}
                  <div className="flex flex-col gap-1 pt-2 lg:pt-0">
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Stone:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemStone || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Plating:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemPlate || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Size:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '12.5px' }}>{info?.ItemSize || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-warning-600)', fontWeight: 800 }}>Qty:</span>
                      <span style={{ fontWeight: 900, color: 'var(--color-warning-600)', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                        {info?.ItemQty ? Number(info.ItemQty).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>

                </div>
              </section>

              {/* 2. Active Step Highlight Banner */}
              <div
                role="status"
                style={{
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-warning-500) 14%, var(--color-surface-0)), color-mix(in srgb, var(--color-warning-500) 6%, var(--color-surface-0)))',
                  border: '1px solid color-mix(in srgb, var(--color-warning-500) 35%, transparent)',
                  borderRadius: 6,
                  padding: '7px 12px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px 10px',
                }}
              >
                {activeStepNames ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 10px', fontSize: '13px' }}>
                    <span>
                      Current Step:{' '}
                      <strong style={{ color: 'var(--color-warning-600)', fontWeight: 800 }}>
                        {activeStepNames}
                      </strong>
                    </span>
                    <span style={{ color: 'var(--color-text-tertiary)', userSelect: 'none' }}>&gt;&gt;</span>
                    <span>
                      Completed{' '}
                      <strong style={{ color: 'var(--color-track-done-text)', fontWeight: 800 }}>
                        {summary?.doneSteps || 0}
                      </strong>{' '}
                      of{' '}
                      <strong style={{ fontWeight: 800 }}>
                        {summary?.totalSteps || 17}
                      </strong>{' '}
                      Steps
                    </span>
                  </div>
                ) : summary?.percent === 100 ? (
                  <span style={{ color: 'var(--color-track-done-text)', fontWeight: 800, fontSize: '13px' }}>
                    Production Completed ({summary?.totalSteps || 0} of {summary?.totalSteps || 0} Steps)
                  </span>
                ) : data ? (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    Pending First Step (0 of {summary?.totalSteps || 0} Steps)
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    Please enter Order No. and Line above, then click Search to track status.
                  </span>
                )}
              </div>

              {/* 3. Production Progress */}
              <section
                aria-label="17 Steps Production Progress"
                style={{
                  background: 'var(--color-ui-surface)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  flexShrink: 0,
                }}
              >
                <div style={{ paddingBottom: 4, borderBottom: '1px solid var(--color-border-default)', marginBottom: 4 }}>
                  <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                    Production Progress &gt;&gt; {summary?.totalSteps || 17} Steps
                  </h2>
                </div>
                <OrderTrackStepper steps={data?.steps || []} />
              </section>

              {/* 4. Step History Table */}
              <section
                aria-label="Step History"
                className="flex-1 flex flex-col min-h-[400px] lg:min-h-0"
                style={{
                  background: 'var(--color-ui-surface)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--color-border-default)',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                      Step History
                    </h2>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {statusFilter === 'ALL'
                        ? `${historyCounts.all} records`
                        : `${filteredHistory.length} of ${historyCounts.all} records`}
                    </span>
                  </div>

                  {/* Status Filter Segmented Controls */}
                  <div
                    role="group"
                    aria-label="Filter step history by status"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'var(--color-surface-1)',
                      padding: '2px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-default)',
                      gap: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        fontSize: '12px',
                        fontWeight: statusFilter === 'ALL' ? 800 : 600,
                        borderRadius: 4,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === 'ALL' ? 'var(--color-ui-surface)' : 'transparent',
                        color: statusFilter === 'ALL' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        boxShadow: statusFilter === 'ALL' ? 'var(--shadow-xs)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>All</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '0 5px',
                          borderRadius: 999,
                          background: statusFilter === 'ALL' ? 'var(--color-surface-2)' : 'color-mix(in srgb, var(--color-border-default) 60%, transparent)',
                          color: statusFilter === 'ALL' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                        }}
                      >
                        {historyCounts.all}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('DONE')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        fontSize: '12px',
                        fontWeight: statusFilter === 'DONE' ? 800 : 600,
                        borderRadius: 4,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === 'DONE' ? 'color-mix(in srgb, var(--color-track-done-bg) 70%, var(--color-ui-surface))' : 'transparent',
                        color: statusFilter === 'DONE' ? 'var(--color-track-done-text)' : 'var(--color-text-secondary)',
                        boxShadow: statusFilter === 'DONE' ? 'var(--shadow-xs)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>Done (Y)</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '0 5px',
                          borderRadius: 999,
                          background: statusFilter === 'DONE' ? 'var(--color-track-done-bg)' : 'color-mix(in srgb, var(--color-border-default) 60%, transparent)',
                          color: statusFilter === 'DONE' ? 'var(--color-track-done-text)' : 'var(--color-text-tertiary)',
                        }}
                      >
                        {historyCounts.done}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('IN_PROGRESS')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        fontSize: '12px',
                        fontWeight: statusFilter === 'IN_PROGRESS' ? 800 : 600,
                        borderRadius: 4,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === 'IN_PROGRESS' ? 'color-mix(in srgb, var(--color-warning-500) 15%, var(--color-ui-surface))' : 'transparent',
                        color: statusFilter === 'IN_PROGRESS' ? 'var(--color-warning-600)' : 'var(--color-text-secondary)',
                        boxShadow: statusFilter === 'IN_PROGRESS' ? 'var(--shadow-xs)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>In Progress (O)</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '0 5px',
                          borderRadius: 999,
                          background: statusFilter === 'IN_PROGRESS' ? 'color-mix(in srgb, var(--color-warning-500) 25%, transparent)' : 'color-mix(in srgb, var(--color-border-default) 60%, transparent)',
                          color: statusFilter === 'IN_PROGRESS' ? 'var(--color-warning-600)' : 'var(--color-text-tertiary)',
                        }}
                      >
                        {historyCounts.inProgress}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-auto" style={{ borderRadius: 6, border: '1px solid var(--color-border-default)', background: 'var(--color-ui-surface)' }}>
                  <table aria-label="Step History" style={{ width: '100%', textAlign: 'left', fontSize: '13px', borderCollapse: 'separate', borderSpacing: 0, background: 'transparent' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                      <tr>
                        <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', padding: '10px 12px', borderRight: '1px solid var(--color-border-default)', borderBottom: '2px solid var(--color-border-strong)', boxShadow: 'inset 0 -2px 0 var(--color-border-strong)', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13.5px', letterSpacing: '0.01em' }}>Step</th>
                        <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', padding: '10px 12px', borderRight: '1px solid var(--color-border-default)', borderBottom: '2px solid var(--color-border-strong)', boxShadow: 'inset 0 -2px 0 var(--color-border-strong)', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13.5px', letterSpacing: '0.01em' }}>Date</th>
                        <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', padding: '10px 12px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)', borderBottom: '2px solid var(--color-border-strong)', boxShadow: 'inset 0 -2px 0 var(--color-border-strong)', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13.5px', letterSpacing: '0.01em' }}>Receive Qty</th>
                        <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', padding: '10px 12px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)', borderBottom: '2px solid var(--color-border-strong)', boxShadow: 'inset 0 -2px 0 var(--color-border-strong)', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13.5px', letterSpacing: '0.01em' }}>Send Qty</th>
                        <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', padding: '10px 12px', textAlign: 'right', borderRight: '1px solid var(--color-border-default)', borderBottom: '2px solid var(--color-border-strong)', boxShadow: 'inset 0 -2px 0 var(--color-border-strong)', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13.5px', letterSpacing: '0.01em' }}>Balance Qty</th>
                        <th scope="col" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid var(--color-border-strong)', boxShadow: 'inset 0 -2px 0 var(--color-border-strong)', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13.5px', letterSpacing: '0.01em' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!data || data.history.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '28px 10px', color: 'var(--color-text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--color-border-default)' }}>
                            {loading ? 'Loading data...' : 'No production history available'}
                          </td>
                        </tr>
                      ) : filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--color-text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--color-border-default)' }}>
                            No {statusFilter === 'DONE' ? 'Done (Y)' : 'In Progress (O)'} steps found in history
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((h, i) => (
                          <tr key={i} style={{ background: 'transparent' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-default)', borderBottom: '1px solid var(--color-border-default)' }}>
                              {h.stepIndex}. {h.nameEN}
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)', borderBottom: '1px solid var(--color-border-default)' }}>
                              {h.repDate ? formatDateDDMMYY(h.repDate) : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)', borderBottom: '1px solid var(--color-border-default)' }}>
                              {h.recQty > 0 ? h.recQty.toLocaleString() : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)', borderBottom: '1px solid var(--color-border-default)' }}>
                              {h.senQty > 0 ? h.senQty.toLocaleString() : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 900, color: h.balance > 0 ? 'var(--color-warning-600)' : 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border-default)', borderBottom: '1px solid var(--color-border-default)', fontSize: '13.5px' }}>
                              {h.balance.toLocaleString()}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--color-border-default)' }}>
                              {h.status === 2 ? (
                                <span style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--color-track-done-text)' }}>
                                  Done (Y)
                                </span>
                              ) : h.status === 1 ? (
                                <span style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--color-warning-600)' }}>
                                  In Progress (O)
                                </span>
                              ) : (
                                <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>

            {/* ================================================================= */}
            {/* ฝั่งขวา: Item Photo + Status Summary                                */}
            {/* ================================================================= */}
            <div className="lg:col-span-3 flex flex-col gap-2 min-h-[auto] lg:min-h-0 lg:overflow-hidden">

              {/* 1. Item Photo */}
              <section
                aria-label="Item Photo"
                className="flex-shrink-0 flex flex-col h-[300px] lg:h-[375px]"
                style={{
                  background: 'var(--color-ui-surface)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                  padding: '10px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ paddingBottom: 5, borderBottom: '1px solid var(--color-border-default)', marginBottom: 6, flexShrink: 0 }}>
                  <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                    Item Photo
                  </h2>
                </div>

                {/* พื้นที่รูปภาพ */}
                <div
                  onClick={() => !imgFailed && info?.ItemNo && setIsImageOpen(true)}
                  title={!imgFailed && info?.ItemNo ? 'Click to enlarge' : ''}
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: 0,
                    background: !imgFailed && info?.ItemNo ? 'var(--color-product-canvas, var(--color-surface-1))' : 'var(--color-surface-1)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: !imgFailed && info?.ItemNo ? 'pointer' : 'default',
                  }}
                >
                  {info?.ItemNo ? (
                    <>
                      {!imgFailed && (
                        <img
                          key={info.ItemNo}
                          src={psPhotoUrl(info.ItemNo)}
                          alt={`Item Photo Code ${info.ItemNo}`}
                          loading="lazy"
                          onError={(e) => attachPhotoFallback(e, info.ItemNo, () => setImgFailed(true))}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            padding: 6,
                            transition: 'transform 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        />
                      )}
                      {imgFailed && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 4 }}>
                          <ImageOff size={28} aria-hidden="true" />
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>No image available</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 4 }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 500 }}>Enter order to view item photo</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Status Summary */}
              <section
                aria-label="Status Summary"
                className="flex-1 flex flex-col justify-between min-h-[400px] lg:min-h-0"
                style={{
                  background: 'var(--color-ui-surface)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                  padding: '12px',
                  gap: 10,
                }}
              >
                <div style={{ paddingBottom: 6, borderBottom: '1px solid var(--color-border-default)', flexShrink: 0 }}>
                  <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                    Status Summary
                  </h2>
                </div>

                {/* 1. วงแหวนProgress (Donut Gauge) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
                  <svg
                    width="350"
                    height="350"
                    viewBox="0 0 118 118"
                    role="progressbar"
                    aria-valuenow={summary?.percent || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Overall progress ${summary?.percent || 0}%`}
                  >
                    {/* วงแหวนพื้นหลัง */}
                    <circle cx="59" cy="59" r="47" stroke="var(--color-surface-2)" strokeWidth="9" fill="none" />

                    {/* StatusProcessข้อมูล (Loading State) / StatusProgressNormal (Executive Progress Ring) */}
                    {loading ? (
                      <circle
                        cx="59"
                        cy="59"
                        r="47"
                        stroke="var(--color-brand-500)"
                        strokeWidth="9"
                        fill="none"
                        strokeDasharray="75 180"
                        strokeLinecap="round"
                        className="donut-loading-spin"
                      />
                    ) : (
                      <>
                        <circle
                          cx="59"
                          cy="59"
                          r="47"
                          stroke={summary?.percent === 100 ? 'var(--color-track-done)' : 'var(--color-warning-500)'}
                          strokeWidth="9"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 47}
                          strokeDashoffset={2 * Math.PI * 47 * (1 - (summary?.percent || 0) / 100)}
                          strokeLinecap="round"
                          transform="rotate(-90 59 59)"
                          className={summary?.percent && summary.percent < 100 ? 'donut-pulse-active' : undefined}
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />

                        {/* Shimmer Line (Only when < 100% and > 0%) */}
                        {summary?.percent && summary.percent > 0 && summary.percent < 100 ? (
                          <circle
                            cx="59"
                            cy="59"
                            r="47"
                            stroke="var(--color-text-inverse)"
                            strokeWidth="9"
                            fill="transparent"
                            strokeDasharray={`15 ${2 * Math.PI * 47}`}
                            strokeLinecap="round"
                            transform="rotate(-90 59 59)"
                            className="donut-shimmer-line"
                            style={{
                              '--shimmer-end': `${-1 * ((2 * Math.PI * 47 * (summary.percent / 100)) - 15)}px`
                            } as React.CSSProperties}
                          />
                        ) : null}
                      </>
                    )}

                    {/* ตัวเลขPercent */}
                    <text
                      x="59"
                      y={loading ? "59" : "52"}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={loading ? "12" : "24"}
                      fontWeight="900"
                      fill={loading ? "var(--color-brand-600)" : summary?.percent === 100 ? "var(--color-track-done-text)" : "var(--color-warning-600)"}
                    >
                      {loading ? "Loading..." : summary ? `${summary.percent} %` : "0 %"}
                    </text>

                    {!loading && (
                      <text
                        x="59"
                        y="71"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="11.5"
                        fontWeight="700"
                        fill="var(--color-text-secondary)"
                      >
                        Progress
                      </text>
                    )}
                  </svg>
                </div>

                {/* 2. สถิติ 4 ช่อง */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, textAlign: 'center', width: '100%', flexShrink: 0, paddingBottom: 4 }}>

                  {/* 1. All */}
                  <div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-brand-600)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      {data ? (summary?.totalSteps || 0) : '-'}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Total
                    </div>
                  </div>

                  {/* 2. Done */}
                  <div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-track-done-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      {data ? (summary?.doneSteps || 0) : '-'}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Done
                    </div>
                  </div>

                  {/* 3. In Progress */}
                  <div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-warning-600)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      {data ? (summary?.inProgressCount || 0) : '-'}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      In Progress
                    </div>
                  </div>

                  {/* 4. Remain */}
                  <div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      {data && summary ? (summary.totalSteps - summary.doneSteps - summary.inProgressCount) : '-'}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Remaining
                    </div>
                  </div>

                </div>
              </section>

            </div>

          </div>
        )}

        {/* 🖼️ Fullscreen Image Viewer Modal (แบบเดียวกับหน้า PO Detail) */}
        {isImageOpen && info?.ItemNo && (
          <div
            onClick={() => setIsImageOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--color-overlay-scrim)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.2s ease-out forwards',
            }}
          >
            {/* Floating Close Button */}
            <button
              onClick={() => setIsImageOpen(false)}
              style={{
                position: 'absolute',
                top: 32,
                right: 32,
                background: 'var(--color-overlay-control)',
                border: '1px solid var(--color-overlay-border)',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 12,
                color: 'var(--color-overlay-text)',
                display: 'flex',
                transition: 'background-color 0.2s ease',
                zIndex: 10001,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-overlay-border)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-overlay-control)';
              }}
            >
              <X size={28} />
            </button>

            {/* Full Image */}
            <img
              onClick={(e) => e.stopPropagation()}
              src={psPhotoUrl(info.ItemNo)}
              alt={`${info.ItemNo} Photo`}
              loading="lazy"
              onError={(e) => attachPhotoFallback(e, info.ItemNo)}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                filter: 'drop-shadow(var(--shadow-modal))',
                animation: 'zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>

      </main>
    </div>
  );
}
