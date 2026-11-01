import React from 'react';
import { GitCommit, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import type { CockpitPipelineStage, DualPipelineData } from '../../../services/dashboardAPI';

interface FactoryPipelineFlowProps {
  pipeline?: CockpitPipelineStage[];
  dualPipeline?: DualPipelineData;
  totalWipPcs?: number;
  selectedFacility?: 'ALL' | 'FBE' | 'CLL';
}

const STAGE_NAME_MAP: Record<string, string> = {
  wax: 'Wax Prep',
  cast: 'Casting',
  grind: 'Filing',
  polish: 'Polishing',
  plate: 'Plating',
  qc: 'QC Check',
  pack: 'Packing',
  prep: 'Prep Queue',
  gr_tb: 'Grind & Tumb',
  fl_lp: 'Filing & Lap',
  as_ls: 'Assy & Laser',
  pl: 'Polishing',
  cp_pt: 'Plating Proc',
  iq: 'QC Inspect',
};

interface LaneRenderProps {
  title: string;
  facilityBadge: 'CLL' | 'FBE';
  wipPcs: number;
  wipOrders?: number;
  stages: CockpitPipelineStage[];
  isCompact?: boolean;
}

const PipelineLane: React.FC<LaneRenderProps> = ({
  title,
  facilityBadge,
  wipPcs,
  wipOrders,
  stages,
  isCompact = false,
}) => {
  const bottleneckStage = stages.find((s) => s.isBottleneck);
  const laneColor = facilityBadge === 'FBE'
    ? 'var(--color-brand-600)'
    : 'var(--color-proc-polishing, var(--color-success-600))';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isCompact ? '5px' : '8px',
        backgroundColor: 'var(--color-surface-1)',
        borderRadius: '8px',
        padding: isCompact ? '8px 10px' : '10px 12px',
        border: '1px solid var(--color-border-light)',
      }}
    >
      {/* Lane Sub-Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          fontWeight: 800,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.62rem',
              fontWeight: 800,
              backgroundColor: laneColor,
              color: 'var(--color-ui-on-interactive)',
              letterSpacing: '0.02em',
            }}
          >
            {facilityBadge}
          </span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 800 }}>
            {title}
          </span>
          {wipOrders !== undefined && (
            <span
              style={{
                color: 'var(--color-text-tertiary)',
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: 'var(--color-surface-2)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {wipOrders.toLocaleString()} Orders
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {bottleneckStage && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.62rem',
                fontWeight: 800,
                color: 'var(--color-danger-500)',
                backgroundColor: 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))',
                border: '1px solid color-mix(in srgb, var(--color-danger-500) 25%, transparent)',
                padding: '2px 7px',
                borderRadius: '4px',
              }}
            >
              <AlertTriangle size={11} /> Bottleneck: {STAGE_NAME_MAP[bottleneckStage.id] || bottleneckStage.name}
            </span>
          )}
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-0)',
              padding: '2px 7px',
              borderRadius: '4px',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {wipPcs.toLocaleString()} pcs
          </span>
        </div>
      </div>

      {/* Stage Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, 1fr)`,
          gap: isCompact ? '5px' : '7px',
          alignItems: 'stretch',
        }}
      >
        {stages.map((stage, idx) => {
          const isBottleneck = stage.isBottleneck;
          const cleanName = STAGE_NAME_MAP[stage.id] || stage.name;
          const formattedPcs = stage.pcs >= 1000 ? `${(stage.pcs / 1000).toFixed(1)}k` : `${stage.pcs}`;

          return (
            <div
              key={stage.id || idx}
              style={{
                backgroundColor: isBottleneck
                  ? 'color-mix(in srgb, var(--color-danger-500) 6%, var(--color-surface-0))'
                  : 'var(--color-surface-0)',
                borderRadius: '6px',
                border: isBottleneck
                  ? '1.5px solid var(--color-danger-500)'
                  : '1px solid var(--color-border-light)',
                padding: isCompact ? '6px 7px' : '8px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease',
                position: 'relative',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                if (!isBottleneck) {
                  e.currentTarget.style.borderColor = 'var(--color-border-default)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isBottleneck) {
                  e.currentTarget.style.borderColor = 'var(--color-border-light)';
                }
              }}
            >
              {/* Top Row: Seq & Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    width: isCompact ? '16px' : '18px',
                    height: isCompact ? '16px' : '18px',
                    borderRadius: '4px',
                    backgroundColor: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-surface-2)',
                    color: isBottleneck ? 'var(--color-ui-on-interactive)' : 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono, monospace)',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {isBottleneck ? (
                  <span
                    style={{
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      color: 'var(--color-danger-500)',
                      backgroundColor: 'color-mix(in srgb, var(--color-danger-500) 12%, var(--color-surface-0))',
                      border: '1px solid color-mix(in srgb, var(--color-danger-500) 25%, transparent)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Peak
                  </span>
                ) : (
                  <CheckCircle2 size={11} style={{ color: 'var(--color-text-tertiary)', opacity: 0.7 }} />
                )}
              </div>

              {/* Stage Name */}
              <div
                style={{
                  fontSize: isCompact ? '0.67rem' : '0.73rem',
                  fontWeight: 800,
                  color: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: isCompact ? '3px' : '4px',
                  letterSpacing: '-0.01em',
                }}
                title={cleanName}
              >
                {cleanName}
              </div>

              {/* Quantity Value */}
              <div style={{ marginTop: '2px' }}>
                <div
                  style={{
                    fontSize: isCompact ? '0.88rem' : '1.02rem',
                    fontWeight: 900,
                    fontFamily: 'Outfit, var(--font-display), sans-serif',
                    lineHeight: 1.1,
                    color: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formattedPcs}
                </div>
              </div>

              {/* Micro Progress Bar & Percentage */}
              <div style={{ marginTop: '4px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    color: isBottleneck ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)',
                    marginBottom: '2px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  <span>{stage.sharePct}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: 'var(--color-surface-2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(stage.sharePct, 100)}%`,
                      height: '100%',
                      backgroundColor: isBottleneck ? 'var(--color-danger-500)' : laneColor,
                      borderRadius: '2px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FactoryPipelineFlow: React.FC<FactoryPipelineFlowProps> = ({
  pipeline = [],
  dualPipeline,
  totalWipPcs = 0,
  selectedFacility = 'ALL',
}) => {
  const showDualLane = selectedFacility === 'ALL' && dualPipeline?.cll && dualPipeline?.fbe;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-0)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-panel)',
        padding: '13px 15px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      {/* Panel Main Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-light)',
          paddingBottom: '9px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-brand-600)',
              border: '1px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GitCommit size={15} strokeWidth={2} />
          </span>
          <div>
            <div
              style={{
                fontSize: '0.80rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Production Process Pipeline
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {showDualLane
                ? 'Dual-Lane Parallel Manufacturing: CLL (Milestones) · FBE (Departments)'
                : `Real-time Process Tracking · ${selectedFacility === 'FBE' ? 'FBE Bangplee' : 'CLL Bangna'}`}
            </div>
          </div>
        </div>

        {/* Total Active WIP Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
            Active WIP
          </span>
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 900,
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--color-text-primary)',
            }}
          >
            {(
              selectedFacility === 'FBE'
                ? (dualPipeline?.fbe?.wipPcs ?? totalWipPcs)
                : selectedFacility === 'CLL'
                ? (dualPipeline?.cll?.wipPcs ?? totalWipPcs)
                : totalWipPcs
            ).toLocaleString()} pcs
          </span>
        </div>
      </div>

      {/* Pipeline Lanes Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '8px',
          paddingTop: '8px',
          paddingBottom: '3px',
        }}
      >
        {showDualLane ? (
          <>
            {/* CLL Lane */}
            <PipelineLane
              title="CLL Facility (Bangna) — Milestone Pipeline"
              facilityBadge="CLL"
              wipPcs={dualPipeline!.cll.wipPcs}
              wipOrders={dualPipeline!.cll.wipOrders}
              stages={dualPipeline!.cll.stages}
              isCompact
            />

            {/* FBE Lane */}
            <PipelineLane
              title="FBE Facility (Bangplee) — In-Department Pipeline"
              facilityBadge="FBE"
              wipPcs={dualPipeline!.fbe.wipPcs}
              wipOrders={dualPipeline!.fbe.wipOrders}
              stages={dualPipeline!.fbe.stages}
              isCompact
            />
          </>
        ) : (
          <PipelineLane
            title={
              selectedFacility === 'FBE'
                ? 'FBE Facility (Bangplee) — In-Department Pipeline'
                : 'CLL Facility (Bangna) — Milestone Pipeline'
            }
            facilityBadge={selectedFacility === 'FBE' ? 'FBE' : 'CLL'}
            wipPcs={
              selectedFacility === 'FBE'
                ? (dualPipeline?.fbe?.wipPcs ?? totalWipPcs)
                : selectedFacility === 'CLL'
                ? (dualPipeline?.cll?.wipPcs ?? totalWipPcs)
                : totalWipPcs
            }
            wipOrders={
              selectedFacility === 'FBE'
                ? dualPipeline?.fbe?.wipOrders
                : selectedFacility === 'CLL'
                ? dualPipeline?.cll?.wipOrders
                : undefined
            }
            stages={
              selectedFacility === 'FBE'
                ? (dualPipeline?.fbe?.stages ?? pipeline)
                : selectedFacility === 'CLL'
                ? (dualPipeline?.cll?.stages ?? pipeline)
                : pipeline
            }
            isCompact={false}
          />
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.62rem',
          fontWeight: 700,
          color: 'var(--color-text-tertiary)',
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: '5px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={11} style={{ color: 'var(--color-text-tertiary)' }} />
          {showDualLane
            ? 'Dual-Lane: Verified CLL Milestone Delta & FBE In-Department Movement Tracking'
            : selectedFacility === 'FBE'
            ? 'FBE Flow: Dept Movement (GR ➔ TB ➔ FL ➔ AS ➔ LS ➔ PL ➔ CP ➔ PT ➔ IQ)'
            : 'CLL Flow: Sequential OrdDT Milestones (Wax ➔ Cast ➔ Grind ➔ Polish ➔ Plate ➔ QC ➔ Pack)'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--color-text-secondary)',
            fontWeight: 800,
          }}
        >
          Zero Double-Count · 100% Reconciled
        </span>
      </div>
    </div>
  );
};

export default FactoryPipelineFlow;
