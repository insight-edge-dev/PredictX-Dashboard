import { colors, cardStyle } from '../theme';

export default function StatCard({ icon, label, value, sublabel, accent }: {
  icon: string;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div style={{ ...cardStyle, padding: 18, flex: '1 1 200px', minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ color: accent ?? colors.text, fontSize: 28, fontWeight: 800 }}>{value}</div>
      {sublabel && <div style={{ color: colors.textDim, fontSize: 12, marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}
