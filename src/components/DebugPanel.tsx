import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorldState, PressureAxisId } from '../types/world';
import type { DebugLogEntry } from '../types';

const PRESSURE_LABELS: Record<PressureAxisId, string> = {
  succession_crisis: '储位危机',
  jiancheng_hostility: '建成敌意',
  yuanji_ambition: '元吉冒进',
  court_opinion: '朝堂舆论',
  qinwangfu_desperation: '秦王府急迫',
  imperial_suspicion: '李渊猜疑',
  military_readiness: '军事准备',
};

interface DebugPanelProps {
  worldState: WorldState | null;
  narrativeIntensity: string;
  logEntries: DebugLogEntry[];
  onClear: () => void;
}

export default function DebugPanel({ worldState, narrativeIntensity, logEntries, onClear }: DebugPanelProps) {
  const [tab, setTab] = useState<'state' | 'log'>('state');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === 'log') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries.length, tab]);

  const formatTime = useCallback((ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }, []);

  const catColor: Record<string, string> = {
    llm_call: '#6ec6ff',
    npc_decision: '#ffd54f',
    event_trigger: '#ff8a65',
    pressure: '#81c784',
    memory: '#ce93d8',
    system: '#90a4ae',
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 0, width: 420, maxHeight: '60vh',
      background: '#1a1a2e', color: '#ccc', fontSize: 12, fontFamily: 'monospace',
      borderTop: '1px solid #333', borderLeft: '1px solid #333', zIndex: 9999,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', flexShrink: 0 }}>
        <button onClick={() => setTab('state')} style={{
          flex: 1, padding: '6px', background: tab === 'state' ? '#2a2a44' : 'transparent',
          color: tab === 'state' ? '#fff' : '#888', border: 'none', cursor: 'pointer',
        }}>状态</button>
        <button onClick={() => setTab('log')} style={{
          flex: 1, padding: '6px', background: tab === 'log' ? '#2a2a44' : 'transparent',
          color: tab === 'log' ? '#fff' : '#888', border: 'none', cursor: 'pointer',
        }}>日志 ({logEntries.length})</button>
        <button onClick={onClear} style={{
          padding: '6px 10px', background: 'transparent', color: '#666',
          border: 'none', cursor: 'pointer',
        }}>清空</button>
      </div>

      {/* content */}
      <div style={{ overflow: 'auto', flex: 1, padding: 8 }}>
        {tab === 'state' && worldState && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>日期：</strong>武德{worldState.calendar.year === 626 ? '九' : worldState.calendar.year}年
              {worldState.calendar.month}月{worldState.calendar.day}日
              （第{worldState.calendar.daysSinceStart}天）
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>叙事烈度：</strong><span style={{ color: '#ffd54f' }}>{narrativeIntensity}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>待触发事件：</strong>{worldState.pendingEvents.length > 0
                ? worldState.pendingEvents.map(e => e.skeletonId).join(', ')
                : '无'}
            </div>
            <div style={{ marginBottom: 4 }}><strong>压力轴：</strong></div>
            {(Object.entries(worldState.pressureAxes) as [PressureAxisId, { value: number; velocity: number }][]).map(([id, axis]) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ width: 90, color: '#aaa' }}>{PRESSURE_LABELS[id]}</span>
                <div style={{ flex: 1, height: 10, background: '#333', borderRadius: 2, marginRight: 6 }}>
                  <div style={{
                    width: `${axis.value}%`, height: '100%', borderRadius: 2,
                    background: axis.value >= 75 ? '#e53935' : axis.value >= 55 ? '#ff9800' : axis.value >= 30 ? '#fdd835' : '#4caf50',
                  }} />
                </div>
                <span style={{ width: 30, textAlign: 'right' }}>{Math.round(axis.value)}</span>
                <span style={{ width: 40, textAlign: 'right', color: axis.velocity > 0 ? '#ff8a65' : axis.velocity < 0 ? '#81c784' : '#666' }}>
                  {axis.velocity > 0 ? '+' : ''}{axis.velocity.toFixed(1)}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 8, marginBottom: 4 }}><strong>角色记忆：</strong></div>
            {Object.entries(worldState.characterMemories || {}).map(([charId, mems]) => (
              <div key={charId} style={{ marginBottom: 4 }}>
                <span style={{ color: '#ce93d8' }}>{charId}</span>: {mems.length}条
              </div>
            ))}
            <div style={{ marginTop: 8, marginBottom: 4 }}><strong>关系变化：</strong></div>
            {Object.keys(worldState.relationshipOverrides || {}).length === 0 && (
              <div style={{ color: '#666' }}>暂无变化</div>
            )}
            {Object.entries(worldState.relationshipOverrides || {}).map(([fromId, toMap]) => (
              <div key={fromId} style={{ marginBottom: 4 }}>
                <span style={{ color: '#ce93d8' }}>{fromId}</span>
                {Object.entries(toMap).map(([toId, ov]) => (
                  <div key={toId} style={{ marginLeft: 12 }}>
                    → {toId}: <span style={{ color: ov.trustDelta > 0 ? '#81c784' : '#ff8a65' }}>
                      {ov.trustDelta > 0 ? '+' : ''}{ov.trustDelta}
                    </span>
                    {ov.recentEvents.length > 0 && (
                      <span style={{ color: '#777', marginLeft: 6 }}>
                        {ov.recentEvents.slice(-2).join('；')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {tab === 'state' && !worldState && <div style={{ color: '#666' }}>游戏未开始</div>}

        {tab === 'log' && (
          <div>
            {logEntries.length === 0 && <div style={{ color: '#666' }}>暂无日志</div>}
            {logEntries.map((entry, i) => (
              <div key={i} style={{ marginBottom: 4, borderBottom: '1px solid #222', paddingBottom: 4 }}>
                <div
                  style={{ cursor: entry.detail ? 'pointer' : 'default' }}
                  onClick={() => entry.detail && setExpandedLog(expandedLog === i ? null : i)}
                >
                  <span style={{ color: '#666' }}>{formatTime(entry.timestamp)}</span>{' '}
                  <span style={{ color: catColor[entry.category] || '#ccc', fontWeight: 'bold' }}>
                    [{entry.category}]
                  </span>{' '}
                  {entry.title}
                  {entry.detail && <span style={{ color: '#555' }}> ▸</span>}
                </div>
                {expandedLog === i && entry.detail && (
                  <pre style={{
                    background: '#0d0d1a', padding: 6, margin: '4px 0 0', borderRadius: 2,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto',
                  }}>{entry.detail}</pre>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
