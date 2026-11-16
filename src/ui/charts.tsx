// Grafikler: skor eğrisi (küçük ve büyük) ve hız-doğruluk dağılımı
import React from "react";
import { ScrollView, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";
import { fmtShort } from "../lib/dates";
import type { SessionRec } from "../types";
import { T } from "./kit";
import { useColors } from "./theme";

export function Spark({ ss }: { ss: SessionRec[] }) {
  const c = useColors();
  if (ss.length < 2) return <T v="small" muted>Birkaç oturumdan sonra skor eğrin burada görünür.</T>;
  const W = 300, H = 70, p = 6;
  const x = (i: number) => p + (i * (W - p * 2)) / (ss.length - 1);
  const y = (v: number) => H - p - (v / 100) * (H - p * 2);
  const pts = ss.map((s, i) => `${x(i)},${y(s.p)}`).join(" ");
  const last = ss[ss.length - 1];
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Son oturum skorları">
      <Line x1={0} x2={W} y1={y(70)} y2={y(70)} stroke={c.guide} strokeDasharray="3 4" opacity={0.45} />
      <Polygon points={`${x(0)},${H} ${pts} ${x(ss.length - 1)},${H}`} fill={c.guideSoft} />
      <Polyline points={pts} fill="none" stroke={c.guide} strokeWidth={2} />
      <Circle cx={x(ss.length - 1)} cy={y(last.p)} r={4} fill={c.guide} />
    </Svg>
  );
}

export function Curve({ ss }: { ss: SessionRec[] }) {
  const c = useColors();
  const W = Math.max(340, ss.length * 46), H = 220, pl = 34, pr = 14, pt = 14, pb = 40;
  const x = (i: number) => pl + (ss.length === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (ss.length - 1));
  const y = (v: number) => pt + ((100 - v) / 100) * (H - pt - pb);
  const line = (k: "p" | "pf", col: string) => {
    const pts = ss.map((s, i) => (s[k] != null ? `${x(i)},${y(s[k] as number)}` : null)).filter(Boolean);
    return pts.length > 1 ? <Polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={2} /> : null;
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={W} height={H} accessibilityLabel="Oturum skorları">
        {[0, 25, 50, 75, 100].map((v) => (
          <React.Fragment key={v}>
            <Line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke={c.line} />
            <SvgText x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={c.muted}>{v}</SvgText>
          </React.Fragment>
        ))}
        <Line x1={pl} x2={W - pr} y1={y(70)} y2={y(70)} stroke={c.guide} strokeDasharray="4 4" opacity={0.5} />
        <SvgText x={W - pr} y={y(70) - 4} textAnchor="end" fontSize={10} fill={c.guide}>hedef 70</SvgText>
        {line("pf", c.ok)}
        {line("p", c.guide)}
        {ss.map((s, i) => (
          <React.Fragment key={s.id}>
            {s.pf != null && s.pf !== s.p ? <Circle cx={x(i)} cy={y(s.pf)} r={3} fill={c.ok} /> : null}
            <Circle cx={x(i)} cy={y(s.p)} r={i === ss.length - 1 ? 5 : 3.5} fill={c.guide} />
            <SvgText x={x(i)} y={y(s.p) - 8} textAnchor="middle" fontSize={10} fill={c.ink}>{s.p}</SvgText>
            <SvgText x={x(i)} y={H - pb + 16} textAnchor="middle" fontSize={9.5} fill={c.muted}>{fmtShort(s.date)}</SvgText>
            <SvgText x={x(i)} y={H - pb + 28} textAnchor="middle" fontSize={8.5} fill={c.muted}>{s.kind === "mock" ? "deneme" : s.kind === "seviye" ? "seviye" : ""}</SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </ScrollView>
  );
}

export function SpeedPlot({ ss }: { ss: SessionRec[] }) {
  const c = useColors();
  const pts = ss.filter((s) => s.spq);
  const W = 320, H = 200, pl = 34, pb = 30, pt = 10, pr = 10;
  const mx = Math.max(150, ...pts.map((s) => s.spq as number));
  const x = (v: number) => pl + (v / mx) * (W - pl - pr);
  const y = (v: number) => pt + ((100 - v) / 100) * (H - pt - pb);
  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Soru başına süre ve doğruluk">
        {[0, 50, 100].map((v) => (
          <React.Fragment key={v}>
            <Line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke={c.line} />
            <SvgText x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={c.muted}>{v}</SvgText>
          </React.Fragment>
        ))}
        <Line x1={x(75)} x2={x(75)} y1={pt} y2={H - pb} stroke={c.guide} strokeDasharray="4 4" />
        {[0, 75, mx].map((v) => (
          <SvgText key={v} x={x(v)} y={H - 10} textAnchor="middle" fontSize={10} fill={c.muted}>{`${Math.round(v)} sn`}</SvgText>
        ))}
        {pts.map((s) => (
          <Circle key={s.id} cx={x(s.spq as number)} cy={y(s.p)} r={5} fill={(s.spq as number) < 75 ? c.bad : c.ok} opacity={0.85} />
        ))}
      </Svg>
    </View>
  );
}
