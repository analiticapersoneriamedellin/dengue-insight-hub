import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

const navLinks = [
  { href: "#contexto", label: "Contexto" },
  { href: "#metodologia", label: "Metodología" },
  { href: "#hallazgos", label: "Hallazgos" },
  { href: "#presentacion", label: "Presentación" },
];

const iceberg = [
  { year: "2017", cases: "2,154", hosp: "15.3%", accent: "text-white" },
  { year: "2018", cases: "1,188", hosp: "14.6%", accent: "text-white" },
  { year: "2019", cases: "1,236", hosp: "21.4%", accent: "text-[color:var(--brand-yellow)]" },
  { year: "2020", cases: "629", hosp: "25.0%", accent: "text-[color:var(--brand-light)]" },
  { year: "2021", cases: "240", hosp: "43.8%", accent: "text-[color:var(--brand-red)]" },
];

function MosquitoSwarm() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COUNT = reduce ? 22 : Math.min(70, Math.floor((width * height) / 22000));

    type M = {
      x: number; y: number; z: number;
      vx: number; vy: number;
      phase: number; wingSpeed: number;
      hue: number;
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const swarm: M[] = Array.from({ length: COUNT }, () => ({
      x: rand(0, width),
      y: rand(0, height),
      z: rand(0.35, 1),
      vx: rand(-0.4, 0.4),
      vy: rand(-0.25, 0.25),
      phase: rand(0, Math.PI * 2),
      wingSpeed: rand(0.45, 0.85),
      hue: Math.random(),
    }));

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onLeave = () => { pointerRef.current.active = false; };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let t = 0;

    const drawMosquito = (m: M) => {
      const size = 4 + m.z * 9;
      const angle = Math.atan2(m.vy, m.vx);
      const wing = Math.sin(t * m.wingSpeed + m.phase);
      const alpha = 0.35 + m.z * 0.5;

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angle);

      // glow trail
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
      const col = m.hue < 0.5
        ? `249,178,51`
        : m.hue < 0.85 ? `227,6,19` : `255,255,255`;
      glow.addColorStop(0, `rgba(${col},${0.18 * m.z})`);
      glow.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, size * 3, 0, Math.PI * 2);
      ctx.fill();

      // wings (semi-transparent ellipses, flapping via scaleY)
      ctx.fillStyle = `rgba(255,255,255,${0.18 * alpha})`;
      const wingH = size * (0.45 + Math.abs(wing) * 0.9);
      ctx.beginPath();
      ctx.ellipse(-size * 0.05, -wingH * 0.5, size * 0.55, wingH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-size * 0.05,  wingH * 0.5, size * 0.55, wingH, 0, 0, Math.PI * 2);
      ctx.fill();

      // body
      ctx.fillStyle = `rgba(${col},${alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.9, size * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // head
      ctx.beginPath();
      ctx.arc(size * 0.85, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // proboscis
      ctx.strokeStyle = `rgba(${col},${alpha * 0.9})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(size * 1.05, 0);
      ctx.lineTo(size * 1.7, 0);
      ctx.stroke();

      // legs
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * alpha})`;
      ctx.lineWidth = 0.6;
      for (let i = -1; i <= 1; i++) {
        const lx = i * size * 0.35;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.quadraticCurveTo(lx - size * 0.1, size * (0.55 + wing * 0.15), lx - size * 0.4, size * (1.0 + wing * 0.15));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.quadraticCurveTo(lx - size * 0.1, -size * (0.55 + wing * 0.15), lx - size * 0.4, -size * (1.0 + wing * 0.15));
        ctx.stroke();
      }

      ctx.restore();
    };

    const step = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      const p = pointerRef.current;

      for (const m of swarm) {
        // organic wander
        m.vx += (Math.random() - 0.5) * 0.08;
        m.vy += (Math.random() - 0.5) * 0.08;

        // pointer interaction (repel like a mosquito avoiding a hand)
        if (p.active) {
          const dx = m.x - p.x;
          const dy = m.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / 150) * 0.9;
            m.vx += (dx / d) * f;
            m.vy += (dy / d) * f;
          }
        }

        // gentle depth-based drift
        m.vx += Math.sin((m.y + t) * 0.003) * 0.015 * m.z;
        m.vy += Math.cos((m.x + t) * 0.003) * 0.015 * m.z;

        // clamp speed
        const sp = Math.hypot(m.vx, m.vy);
        const max = 0.6 + m.z * 1.4;
        if (sp > max) { m.vx = (m.vx / sp) * max; m.vy = (m.vy / sp) * max; }
        // friction
        m.vx *= 0.985; m.vy *= 0.985;

        m.x += m.vx; m.y += m.vy;

        // wrap
        if (m.x < -20) m.x = width + 20;
        if (m.x > width + 20) m.x = -20;
        if (m.y < -20) m.y = height + 20;
        if (m.y > height + 20) m.y = -20;

        drawMosquito(m);
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ touchAction: "none" }}
      aria-hidden="true"
    />
  );
}

function Index() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-black text-foreground font-sans overflow-x-hidden">
      {/* Ambient gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(227,6,19,0.35), transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 h-[500px] w-[700px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(0,141,54,0.4), transparent 70%)" }} />
      </div>

      {/* NAV */}
      <nav className="fixed top-6 left-1/2 z-50 -translate-x-1/2 w-[min(1100px,calc(100%-2rem))]">
        <div className="liquid-glass flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--brand-red)] animate-pulse-glow" />
            <span className="text-xs sm:text-sm font-medium tracking-tight text-white/90">
              Reto 117 · Vigilancia del Dengue
              <span className="hidden sm:inline text-white/40"> · Equipo 330</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="px-3 py-1.5 text-xs font-medium text-white/70 rounded-full transition hover:text-white hover:bg-white/5">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
        <Particles />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 liquid-glass px-4 py-1.5 mb-8 animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-green)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
              Salud y Bienestar · Personería de Medellín
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-[0.95] tracking-tight animate-fade-up"
            style={{ animationDelay: "0.1s" }}>
            <span className="text-white">¿Mejora Epidemiológica</span>
            <br />
            <span className="italic font-light text-white/60">o </span>
            <span className="text-gradient-red font-semibold">Subregistro Real?</span>
          </h1>

          <p className="mt-8 max-w-2xl mx-auto text-base sm:text-lg text-white/60 leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.25s" }}>
            Análisis riguroso de la caída del <span className="text-[color:var(--brand-red)] font-semibold">90%</span> en
            la notificación de casos de Dengue en Medellín (2017–2021) frente a la disrupción del sistema de salud por la pandemia.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <a href="#presentacion"
              className="liquid-glass-strong group inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[color:var(--brand-red)]/90 hover:border-[color:var(--brand-red)]">
              Ver Presentación Ejecutiva
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#contexto"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-white/70 hover:text-white transition">
              Explorar hallazgos ↓
            </a>
          </div>

          {/* stat strip */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: "0.55s" }}>
            {[
              { v: "53,813", l: "Casos individuales analizados" },
              { v: "2017–2021", l: "Ventana de estudio" },
              { v: "16", l: "Comunas de Medellín" },
              { v: "CRISP-ML(Q)", l: "Marco metodológico" },
            ].map((s) => (
              <div key={s.l} className="liquid-glass px-4 py-4 text-left">
                <div className="text-xl md:text-2xl font-semibold tracking-tight text-white">{s.v}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTEXT */}
      <section id="contexto" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionKicker n="01" label="Contexto Institucional" />
          <h2 className="mt-4 text-4xl md:text-5xl font-medium tracking-tight max-w-3xl">
            Un deber constitucional: proteger el derecho fundamental a la <span className="text-[color:var(--brand-green)]">salud</span>.
          </h2>

          <div className="mt-14 grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 liquid-glass p-8">
              <div className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--brand-yellow)]">
                Marco Legal
              </div>
              <h3 className="mt-3 text-2xl font-medium">Ley Estatutaria 1751 de 2015</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                La Personería Distrital de Medellín tiene el deber de garantizar la vigilancia epidemiológica
                efectiva como parte inseparable del derecho fundamental a la salud. Este análisis nace de esa
                obligación: verificar si los datos oficiales reflejan la realidad sanitaria de la ciudad.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Derecho a la salud", "Vigilancia activa", "Rendición de cuentas"].map((t) => (
                  <span key={t} className="liquid-glass px-3 py-1 text-[11px] text-white/70">{t}</span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-[color:var(--brand-red)]/40 p-8 md:p-10"
              style={{ background: "linear-gradient(135deg, rgba(227,6,19,0.12) 0%, rgba(227,6,19,0.02) 100%)" }}>
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[color:var(--brand-red)]/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-[color:var(--brand-red)]">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--brand-red)] animate-pulse" />
                  Paradoja Epidemiológica
                </div>
                <div className="mt-6 flex items-end gap-4">
                  <div className="text-6xl md:text-8xl font-bold tracking-tighter text-white leading-none">−90%</div>
                  <div className="pb-2 text-sm text-white/60">
                    caída en casos notificados<br />(2017 → 2021)
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                  <div className="border-l-2 border-white/20 pl-4">
                    <div className="text-2xl font-semibold">2,154</div>
                    <div className="text-white/50 text-xs mt-1">casos en 2017</div>
                  </div>
                  <div className="border-l-2 border-[color:var(--brand-red)] pl-4">
                    <div className="text-2xl font-semibold text-[color:var(--brand-red)]">240</div>
                    <div className="text-white/50 text-xs mt-1">casos en 2021</div>
                  </div>
                </div>
                <p className="mt-8 text-sm leading-relaxed text-white/70">
                  Esta caída podría ocultar una <strong className="text-white">pérdida en la capacidad de detección temprana</strong> de
                  brotes, más que una reducción real de la enfermedad. Un sistema ciego es tan peligroso como una epidemia visible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section id="metodologia" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionKicker n="02" label="Marco Metodológico" />
          <h2 className="mt-4 text-4xl md:text-5xl font-medium tracking-tight max-w-3xl">
            Ciclo de vida <span className="text-[color:var(--brand-yellow)]">CRISP-ML(Q)</span> aplicado a salud pública.
          </h2>

          <div className="mt-14 grid md:grid-cols-3 gap-4">
            {[
              { tag: "SIVIGILA / MEData", value: "53,813", label: "Casos individuales", color: "var(--brand-red)" },
              { tag: "IDEAM Histórico", value: "T° + Pp", label: "Clima ciudad", color: "var(--brand-green)" },
              { tag: "DANE Proyecciones", value: "16 Comunas", label: "Población", color: "var(--brand-yellow)" },
            ].map((d) => (
              <div key={d.tag} className="liquid-glass p-6">
                <div className="text-[10px] font-medium uppercase tracking-widest" style={{ color: d.color }}>
                  {d.tag}
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight">{d.value}</div>
                <div className="mt-1 text-xs text-white/50">{d.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 liquid-glass-strong p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="shrink-0 h-10 w-10 rounded-full border border-[color:var(--brand-yellow)]/60 flex items-center justify-center text-[color:var(--brand-yellow)]">
                ⚑
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[color:var(--brand-yellow)] font-medium">
                  Transparencia · Honest Data Science
                </div>
                <h3 className="mt-2 text-2xl font-medium">
                  Cuando el modelo no funciona, la <em className="italic font-light">integridad</em> sí.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-white/70 max-w-3xl">
                  Se construyó un <strong className="text-white">Random Forest Regressor</strong> para predecir la incidencia
                  semanal. Rindió un <strong className="text-[color:var(--brand-red)]">R² ≈ 0</strong>, limitado por ~250 puntos
                  semanales y fuertes tendencias temporales. El componente de IA fue honestamente reorientado hacia
                  analítica descriptiva rigurosa, detección de anomalías y variables proxy. La integridad metodológica
                  supera al espejismo predictivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KEY FINDINGS */}
      <section id="hallazgos" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionKicker n="03" label="Hallazgos Clave · Tres Pilares" />
          <h2 className="mt-4 text-4xl md:text-5xl font-medium tracking-tight max-w-3xl">
            El sistema no mejoró. Se volvió <span className="text-[color:var(--brand-red)]">ciego</span>.
          </h2>

          <div className="mt-14 grid lg:grid-cols-3 gap-5">
            {/* Pillar 1 */}
            <div className="liquid-glass p-8 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--brand-green)] font-medium">Pilar 01</span>
                <span className="text-xs text-white/40">Tasa de incidencia</span>
              </div>
              <h3 className="mt-4 text-xl font-medium leading-tight">
                Tasa real por 100,000 habitantes en todas las comunas
              </h3>
              <div className="mt-8 flex items-baseline gap-3">
                <span className="text-5xl font-semibold tracking-tighter">80.7</span>
                <span className="text-white/40">→</span>
                <span className="text-5xl font-semibold tracking-tighter text-[color:var(--brand-red)]">8.2</span>
              </div>
              <p className="mt-6 text-sm text-white/60 leading-relaxed">
                Cálculo de tasas reales corregidas por población. La caída es dramática incluso ajustando por
                demografía — pero por sí sola no explica el cambio en severidad clínica.
              </p>
            </div>

            {/* Pillar 2 - Iceberg */}
            <div className="liquid-glass p-8 lg:row-span-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--brand-red)] font-medium">Pilar 02</span>
                <span className="text-xs text-white/40">El Efecto Iceberg</span>
              </div>
              <h3 className="mt-4 text-xl font-medium leading-tight">
                Se triplica el % de hospitalización mientras el total colapsa
              </h3>

              <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/50 text-[10px] uppercase tracking-widest">
                      <th className="text-left px-4 py-3 font-medium">Año</th>
                      <th className="text-right px-4 py-3 font-medium">Casos</th>
                      <th className="text-right px-4 py-3 font-medium">Hosp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iceberg.map((r) => (
                      <tr key={r.year} className="border-t border-white/5">
                        <td className="px-4 py-3 font-medium">{r.year}</td>
                        <td className="px-4 py-3 text-right text-white/70">{r.cases}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${r.accent}`}>{r.hosp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-6 text-sm text-white/60 leading-relaxed">
                Firma clásica de <strong className="text-white">subregistro severo</strong>: los casos leves
                desaparecen del reporte, los graves hospitalizados permanecen visibles. El iceberg emerge.
              </p>
              <p className="mt-4 text-xs text-white/40 border-l-2 border-[color:var(--brand-yellow)]/50 pl-3">
                Nota de calidad: la variable <code className="text-[color:var(--brand-yellow)]">clas_dengue</code> presenta
                inconsistencias que refuerzan la hipótesis de deterioro en la captura del dato.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="liquid-glass p-8 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--brand-yellow)] font-medium">Pilar 03</span>
                <span className="text-xs text-white/40">Literatura científica</span>
              </div>
              <h3 className="mt-4 text-xl font-medium leading-tight">
                Respaldo peer-reviewed: cambio en la vigilancia vectorial
              </h3>
              <p className="mt-6 text-sm text-white/60 leading-relaxed flex-1">
                Estudios revisados por pares documentan la transición en Medellín desde la vigilancia entomológica
                domiciliaria hacia una vigilancia institucional, precisamente por la disrupción del COVID-19.
                Nuestros hallazgos son consistentes con esa evidencia.
              </p>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-green)]" />
                Evidencia externa concordante
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionKicker n="04" label="Arquitectura de la Solución" />
          <h2 className="mt-4 text-4xl md:text-5xl font-medium tracking-tight max-w-3xl">
            Cuatro capas independientes, un pipeline auditable.
          </h2>

          <div className="mt-14 grid md:grid-cols-4 gap-3 relative">
            {[
              { n: "01", t: "Fuentes de Datos", d: "SIVIGILA · IDEAM · DANE", c: "var(--brand-red)" },
              { n: "02", t: "Ingesta", d: "Scripts Python de extracción", c: "var(--brand-yellow)" },
              { n: "03", t: "Consolidación", d: "Incidencia + Iceberg processing", c: "var(--brand-green)" },
              { n: "04", t: "Presentación", d: "Streamlit + Plotly Dashboard", c: "var(--brand-light)" },
            ].map((s, i) => (
              <div key={s.n} className="relative liquid-glass p-6 group hover:border-white/20 transition">
                <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: s.c }}>{s.n}</div>
                <div className="mt-3 text-lg font-medium">{s.t}</div>
                <div className="mt-2 text-xs text-white/50 leading-relaxed">{s.d}</div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 text-white/20 z-10">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDES EMBED */}
      <section id="presentacion" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionKicker n="05" label="Sustentación Ejecutiva" />
          <h2 className="mt-4 text-4xl md:text-5xl font-medium tracking-tight">
            Diapositivas del Proyecto y Sustentación
          </h2>
          <p className="mt-4 text-white/50 max-w-2xl text-sm">
            Presentación completa del equipo 330 para el Reto 117 · Personería Distrital de Medellín.
          </p>

          <div className="mt-12 liquid-glass-strong p-2 md:p-3"
            style={{ boxShadow: "0 24px 80px rgba(227,6,19,0.08), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
            <div className="aspect-video w-full rounded-xl shadow-2xl overflow-hidden bg-black border border-white/10 relative"
              style={{ borderTop: "1px solid rgba(249,178,51,0.3)", borderBottom: "1px solid rgba(227,6,19,0.3)" }}>
              <iframe
                src="about:blank"
                title="Presentación Reto 117 - Vigilancia del Dengue"
                className="absolute inset-0 h-full w-full"
                allowFullScreen
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-white/30">Slides embed placeholder</div>
                  <div className="mt-2 text-white/50 text-sm">Insertar aquí URL del deck (Google Slides / Canva)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIMITATIONS */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionKicker n="06" label="Honestidad Metodológica" />
          <h2 className="mt-4 text-4xl md:text-5xl font-medium tracking-tight max-w-3xl">
            Limitaciones reconocidas.
          </h2>

          <div className="mt-14 grid md:grid-cols-3 gap-4">
            {[
              {
                t: "Clima agregado a nivel ciudad",
                d: "Los datos de IDEAM no permiten desagregación por comuna, limitando modelos micro-climáticos.",
              },
              {
                t: "Mapeo manual de 6 comunas",
                d: "Diferencias de nomenclatura entre SIVIGILA y DANE requirieron mapeo manual verificable.",
              },
              {
                t: "Efecto neto no aislable",
                d: "No es posible separar con exactitud la mejora epidemiológica real del efecto de subregistro.",
              },
            ].map((l) => (
              <div key={l.t} className="liquid-glass p-6">
                <div className="h-8 w-8 rounded-full border border-[color:var(--brand-yellow)]/50 flex items-center justify-center text-[color:var(--brand-yellow)] text-xs">
                  !
                </div>
                <h3 className="mt-4 text-base font-medium">{l.t}</h3>
                <p className="mt-2 text-xs text-white/55 leading-relaxed">{l.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 mt-20 py-14 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-[color:var(--brand-red)]" />
              <div className="h-1 w-8 bg-[color:var(--brand-yellow)]" />
              <div className="h-1 w-8 bg-[color:var(--brand-green)]" />
            </div>
            <div className="mt-4 text-sm font-medium text-white">Unidad de Analítica</div>
            <div className="text-xs text-white/50">Personería Distrital de Medellín</div>
          </div>
          <div className="text-xs text-white/40 md:text-right">
            <div>Reto 117 · Equipo 330</div>
            <div className="mt-1">Vigilancia Epidemiológica del Dengue · 2017–2021</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionKicker({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-white/40">
      <span className="text-[color:var(--brand-red)] font-semibold">{n}</span>
      <span className="h-px w-8 bg-white/20" />
      <span>{label}</span>
    </div>
  );
}
