import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import { Search, X, Users, Tag, ChevronDown, Layers, ArrowLeftRight, FilterX, UserCheck } from 'lucide-react';
import { ALL_GROUPS, ACTIVE_GROUP_IDS } from '../../../config/customerGroups';
import { PRODUCT_TYPE_OPTIONS, type PerspectiveMode } from '../../../hooks/useTopOrdersGalleryData';

import { ErpSegmentedControl } from '../../ui/ErpButtons';
import PeriodSetupPanel from '../../period/PeriodSetupPanel';
import { usePeriodSetup } from '../../../hooks/usePeriodSetup';
import { useToast } from '../../../contexts/ToastContext';



interface TopOrdersFilterBarProps {
  analyticsPath?: string;
  productType: string;
  setProductType: (type: string) => void;
  selTypes?: string[];
  setSelTypes?: (types: string[]) => void;
  toggleType?: (type: string) => void;
  searchDraft: string;
  setSearchDraft: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  startFilterTransition: (duration?: number) => void;
  periodSetup: ReturnType<typeof usePeriodSetup>;
  availableYears: string[];
  baseYear?: string;
  periodButtonLabel: string;
  selectedPeriodLabel: string;
  selGroups: string[];
  setSelGroups: (g: string[]) => void;
  toggleGroup: (gId: string) => void;
  salesName?: string;
  setSalesName?: (sales: string) => void;
  availableSalespersons?: string[];
  perspectiveMode: PerspectiveMode;
  setPerspectiveMode: (m: PerspectiveMode) => void;
  hidePerspectiveToggle?: boolean;
  swapYears?: () => void;
  isFiltered?: boolean;
  onReset?: () => void;
  dynamicActiveGroups?: string[];
}

export function TopOrdersFilterBar({
  productType,
  setProductType,
  selTypes,
  setSelTypes,
  toggleType,
  searchDraft,
  setSearchDraft,
  searchQuery,
  setSearchQuery,
  startFilterTransition,
  periodSetup,
  availableYears,
  baseYear = '',

  selGroups,
  setSelGroups,
  toggleGroup,
  salesName = 'ALL',
  setSalesName,
  availableSalespersons = [],
  perspectiveMode,
  setPerspectiveMode,
  hidePerspectiveToggle = false,
  isFiltered = false,
  onReset,
  dynamicActiveGroups = ACTIVE_GROUP_IDS,
}: TopOrdersFilterBarProps) {
  const { showToast } = useToast();
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const [showSalesMenu, setShowSalesMenu] = useState(false);
  const salesMenuRef = useRef<HTMLDivElement>(null);
  const [salesFilterDraft, setSalesFilterDraft] = useState('');
  const [showPeriodPopover, setShowPeriodPopover] = useState(false);

  // Filtered salespersons inside popover
  const displayedSalespersons = useMemo(() => {
    if (!salesFilterDraft.trim()) return availableSalespersons;
    const term = salesFilterDraft.trim().toUpperCase();
    return availableSalespersons.filter(s => s.toUpperCase().includes(term));
  }, [availableSalespersons, salesFilterDraft]);

  const handleSelectSales = (newSales: string) => {
    startFilterTransition();
    if (setSalesName) {
      setSalesName(newSales);
    }
  };

  // Separate active and inactive groups matching CustomerDashboard standard
  const activeCustomerGroups = ALL_GROUPS.filter(g => dynamicActiveGroups.includes(g.id));
  const inactiveCustomerGroups = ALL_GROUPS.filter(g => !dynamicActiveGroups.includes(g.id));

  const isAllActiveSelected = selGroups.length === ALL_GROUPS.length && ALL_GROUPS.every(g => selGroups.includes(g.id));

  const typeOptions = PRODUCT_TYPE_OPTIONS.filter(opt => opt.value !== 'ALL');
  const activeTypes = selTypes ?? (productType && productType !== 'ALL' ? (productType === 'NONE' ? [] : productType.split(',')) : typeOptions.map(t => t.value));

  const handleToggleType = (val: string) => {
    startFilterTransition();
    if (toggleType) {
      toggleType(val);
    } else if (setSelTypes) {
      setSelTypes(activeTypes.includes(val) ? activeTypes.filter(t => t !== val) : [...activeTypes, val]);
    } else if (setProductType) {
      const next = activeTypes.includes(val) ? activeTypes.filter(t => t !== val) : [...activeTypes, val];
      setProductType(next.length === 0 ? 'NONE' : (next.length === typeOptions.length ? 'ALL' : next.join(',')));
    }
  };

  const handleSelectAllTypes = () => {
    startFilterTransition();
    const next = activeTypes.length === typeOptions.length ? [] : typeOptions.map(t => t.value);
    if (setSelTypes) {
      setSelTypes(next);
    } else if (setProductType) {
      setProductType(next.length === 0 ? 'NONE' : (next.length === typeOptions.length ? 'ALL' : next.join(',')));
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
      if (salesMenuRef.current && !salesMenuRef.current.contains(e.target as Node)) {
        setShowSalesMenu(false);
      }
    };
    if (showGroupMenu || showTypeMenu || showSalesMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showGroupMenu, showTypeMenu, showSalesMenu]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    startFilterTransition();
    setSearchQuery(nextSearch);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") applySearch();
    if (event.key === "Escape") setSearchDraft(searchQuery.toUpperCase());
  };

  // Active comparison years for display in Compare pill
  const activeCompareYears = [
    periodSetup.committed.compareActive1 ? periodSetup.committed.compareYear1 : null,
    periodSetup.committed.compareActive2 && periodSetup.committed.compareYear2 !== 'none' ? periodSetup.committed.compareYear2 : null,
  ].filter(Boolean) as string[];

  const displayCompareYearLabel = activeCompareYears.length > 0
    ? activeCompareYears.join(' & ')
    : (periodSetup.committed.compareYear1 || availableYears.find(y => y !== baseYear) || '2025');

  return (
    <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center gap-2 pr-2">
      {/* Perspective Toggle: Combined (รวมสะสม) vs Compare (เทียบปี) - hidden on analytics table where columns are already juxtaposed */}
      {!hidePerspectiveToggle && (
        <div className="flex items-center gap-1.5 shrink-0">
          <ErpSegmentedControl
            ariaLabel="Perspective Mode"
            value={perspectiveMode}
            onChange={(val) => {
              if (val === 'compare') {
                const hasCompare = (periodSetup.committed.compareActive1 && periodSetup.committed.compareYear1 && periodSetup.committed.compareYear1 !== 'none') ||
                                   (periodSetup.committed.compareActive2 && periodSetup.committed.compareYear2 && periodSetup.committed.compareYear2 !== 'none');

                if (!hasCompare) {
                  showToast('Please select a comparison year in Period Setup first.', 'info');
                  setShowPeriodPopover(true);
                  return;
                }

                startFilterTransition();
                setPerspectiveMode('compare');
              } else {
                startFilterTransition();
                setPerspectiveMode('combined');
              }
            }}
            options={[
              { value: 'combined', label: 'Combined', icon: <Layers size={13} /> },
              { value: 'compare', label: 'Compare', icon: <ArrowLeftRight size={13} /> },
            ]}
          />
          {perspectiveMode === 'compare' && (
            <button
              type="button"
              onClick={() => setShowPeriodPopover(true)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--color-surface-0)',
                color: 'var(--color-brand-600)',
                fontWeight: 900,
                fontSize: 'var(--erp-text-control)',
                border: '1px solid var(--color-border-light)',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
              title="Click to adjust comparison years in Period Setup"
            >
              <span>{baseYear} vs {displayCompareYearLabel}</span>
              <ChevronDown size={11} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
        </div>
      )}

      {/* Product Type Multi-Select Dropdown Popover */}
      <div className="relative z-[100]" ref={typeMenuRef}>
        <button
          type="button"
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: showTypeMenu ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)',
            transition: 'background 0.15s'
          }}
          className="hover:bg-[var(--color-surface-1)]"
        >
          <Tag size={14} style={{ color: 'var(--color-brand-500)' }} />
          <span>Type: <strong>{activeTypes.length}/{typeOptions.length}</strong></span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: showTypeMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showTypeMenu && (
          <div
            className="sales-summary-popover shadow-xl"
            style={{ width: 170, left: 0, right: 'auto', zIndex: 110, padding: 10, backgroundColor: 'var(--color-surface-0)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                Product Types
              </span>
              <button
                type="button"
                onClick={handleSelectAllTypes}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  color: activeTypes.length === typeOptions.length ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)',
                  cursor: 'pointer'
                }}
              >
                {activeTypes.length === typeOptions.length ? 'None' : 'All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {typeOptions.map((opt) => {
                const on = activeTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleType(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: on ? 700 : 500,
                      border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                      background: on ? 'var(--color-brand-50)' : 'var(--color-surface-0)',
                      color: on ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    className="hover:bg-[var(--color-surface-2)]"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--color-brand-600)', cursor: 'pointer', margin: 0, flexShrink: 0 }}
                      />
                      <span style={{ fontWeight: 700 }}>{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Universal Search Box */}
      <div style={{ position: "relative", flex: "0 1 260px", minWidth: 180, maxWidth: 320 }}>
        <Search
          size={14}
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Search item, customer..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value.toUpperCase())}
          onKeyDown={handleSearchKeyDown}
          style={{
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border-light)",
            borderRadius: 8,
            padding: "6px 14px 6px 30px",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            outline: "none",
            width: "100%",
            transition: "all 0.2s",
            boxShadow: "inset 0 1px 3px color-mix(in srgb, var(--color-surface-900) 6%, transparent)",
          }}
          className="focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
        {searchDraft && (
          <button
            onClick={() => { setSearchDraft(""); setSearchQuery(""); }}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-tertiary)", display: "flex",
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Standard Period Dropdown Popover */}
      <PeriodSetupPanel
        periodSetup={periodSetup}
        availableYears={availableYears}
        isOpen={showPeriodPopover}
        onOpenChange={setShowPeriodPopover}
      />

      {/* Customer Groups Dropdown Popover */}
      <div className="relative z-[100]" ref={groupMenuRef}>
        <button
          type="button"
          onClick={() => setShowGroupMenu(!showGroupMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: showGroupMenu ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)',
            transition: 'background 0.15s'
          }}
          className="hover:bg-[var(--color-surface-1)]"
        >
          <Users size={14} style={{ color: 'var(--color-brand-500)' }} />
          <span>Groups: <strong>{selGroups.length}/{ALL_GROUPS.length}</strong></span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: showGroupMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showGroupMenu && (
          <div className="sales-summary-popover" style={{ width: 280, right: 0, left: 'auto', zIndex: 110 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>Customer Groups</span>
              <button
                type="button"
                onClick={() => isAllActiveSelected ? setSelGroups([]) : setSelGroups(ALL_GROUPS.map(g => g.id))}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  color: isAllActiveSelected ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)',
                  cursor: 'pointer'
                }}
              >
                {isAllActiveSelected ? 'None' : 'All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Active Groups Section */}
              {activeCustomerGroups.map(g => {
                const on = selGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: on ? 700 : 500,
                      border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                      background: on ? 'var(--color-brand-50)' : 'var(--color-surface-0)',
                      color: on ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    className="hover:bg-[var(--color-surface-2)]"
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                    <span>{g.label}</span>
                  </button>
                );
              })}

              {/* Inactive Groups Divider */}
              {inactiveCustomerGroups.length > 0 && (
                <>
                  <div style={{ marginTop: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ height: 1, flex: 1, background: 'var(--color-border-light)' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Inactive</span>
                    <div style={{ height: 1, flex: 1, background: 'var(--color-border-light)' }} />
                  </div>

                  {/* Inactive Groups Section */}
                  {inactiveCustomerGroups.map(g => {
                    const on = selGroups.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGroup(g.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 10px',
                          borderRadius: 6,
                          fontSize: '0.8125rem',
                          fontWeight: on ? 700 : 500,
                          border: `1px solid ${on ? 'var(--color-border-strong)' : 'transparent'}`,
                          background: on ? 'var(--color-surface-2)' : 'transparent',
                          color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          opacity: on ? 1 : 0.75,
                          transition: 'all 0.15s'
                        }}
                        className="hover:bg-[var(--color-surface-2)]"
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, opacity: 0.5, flexShrink: 0 }} />
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Salesperson Dropdown Popover */}
      <div className="relative z-[100]" ref={salesMenuRef}>
        <button
          type="button"
          onClick={() => setShowSalesMenu(!showSalesMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: showSalesMenu ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)',
            transition: 'background 0.15s'
          }}
          className="hover:bg-[var(--color-surface-1)]"
        >
          <UserCheck size={14} style={{ color: salesName && salesName !== 'ALL' ? 'var(--color-brand-600)' : 'var(--color-brand-500)' }} />
          <span>Sales Person: <strong>{salesName && salesName !== 'ALL' ? salesName : 'All'}</strong></span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              transform: showSalesMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showSalesMenu && (
          <div className="sales-summary-popover" style={{ width: 260, right: 0, left: 'auto', zIndex: 110 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>Sales Person</span>
              {salesName !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectSales('ALL');
                    setShowSalesMenu(false);
                  }}
                  style={{
                    fontSize: 'var(--erp-text-meta)',
                    fontWeight: 800,
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-ui-interactive)',
                    cursor: 'pointer'
                  }}
                >
                  All Sales Persons
                </button>
              )}
            </div>

            {/* Quick search input */}
            <div style={{ marginBottom: 6 }}>
              <input
                type="text"
                placeholder="Search sales person..."
                value={salesFilterDraft}
                onChange={(e) => setSalesFilterDraft(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 240, overflowY: 'auto' }} className="content-scrollbar">
              {/* Option: All Sales Persons */}
              {(!salesFilterDraft || 'ALL SALES PERSONS'.includes(salesFilterDraft.toUpperCase())) && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectSales('ALL');
                    setShowSalesMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 'var(--erp-text-control)',
                    fontWeight: salesName === 'ALL' ? 800 : 600,
                    border: `1px solid ${salesName === 'ALL' ? 'var(--color-brand-500)' : 'transparent'}`,
                    background: salesName === 'ALL' ? 'var(--color-brand-50)' : 'transparent',
                    color: salesName === 'ALL' ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="hover:bg-[var(--color-surface-2)]"
                >
                  <span>All Sales Persons</span>
                  {salesName === 'ALL' && <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-600)' }}>✓</span>}
                </button>
              )}

              {/* Filtered Salespersons */}
              {displayedSalespersons.map((sName) => {
                const on = salesName === sName;
                return (
                  <button
                    key={sName}
                    type="button"
                    onClick={() => {
                      handleSelectSales(sName);
                      setShowSalesMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 'var(--erp-text-control)',
                      fontWeight: on ? 800 : 600,
                      border: `1px solid ${on ? 'var(--color-brand-500)' : 'transparent'}`,
                      background: on ? 'var(--color-brand-50)' : 'transparent',
                      color: on ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    className="hover:bg-[var(--color-surface-2)]"
                  >
                    <span>{sName}</span>
                    {on && <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-600)' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Single Global Reset Button (FilterX) covering all page filters */}
      {isFiltered && onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            background: "none",
            border: "none",
            padding: "6px",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          className="hover:bg-[var(--color-surface-2)] active:scale-95"
          title="Reset filters"
          aria-label="Reset filters"
        >
          <FilterX size={14} />
        </button>
      )}
    </div>
  );
}
