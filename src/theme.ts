import type { CSSProperties } from 'react';

export const colors = {
  bg:           '#020810',
  surface:      '#08111E',
  surfaceAlt:   '#0E1C2E',
  border:       '#142234',
  borderActive: '#1E3A5C',
  accent:       '#FBBF24',
  text:         '#fff',
  textMuted:    '#7E97B0',
  textDim:      '#4A6580',
  textBody:     '#94A3B8',
  success:      '#16a34a',
  warning:      '#F59E0B',
  danger:       '#ef4444',
  info:         '#60A5FA',
};

export const cardStyle: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
};

export const labelStyle: CSSProperties = {
  display: 'block', color: colors.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8,
};

export const inputStyle: CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 8,
  color: colors.text, fontSize: 14, outline: 'none',
};

export const btnStyle = (disabled: boolean): CSSProperties => ({
  padding: '11px 24px', background: disabled ? '#1A2A3A' : colors.accent,
  border: 'none', borderRadius: 8, color: disabled ? colors.textDim : '#000',
  fontWeight: 800, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer',
});

export const actionBtn = (bg: string, color: string): CSSProperties => ({
  background: bg, border: `1px solid ${color}30`, color,
  borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
});

export const badge = (color: string): CSSProperties => ({
  background: color + '18', color, fontSize: 10, fontWeight: 700,
  padding: '2px 8px', borderRadius: 20, border: `1px solid ${color}35`,
});
