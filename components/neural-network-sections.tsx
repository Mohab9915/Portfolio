"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BrainCircuit, ChevronRight, FlaskConical, Gauge, Star, Terminal } from "lucide-react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { projects } from "@/lib/resume"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const epochs = [
  {
    id: 1,
    stage: "Initialization",
    company: "Manipal Institute of Technology",
    role: "AI Intern",
    period: "Jul – Sep 2024",
    loss: 0.82,
    complexity: 24,
    cost: 100,
    metrics: ["Random Forest", "SVM", "Linear Regression", "Gradient Boosting"],
    log: "Fitted solar-energy forecasting models on real-world weather data and established the classical ML weights that everything else builds on.",
  },
  {
    id: 2,
    stage: "Feature Extraction",
    company: "Fawri + PalTech Hub",
    role: "Backend & AI Engineer",
    period: "Aug 2025 – Present",
    loss: 0.31,
    complexity: 67,
    cost: 30,
    metrics: ["22% profit increase", "70% lower operating costs", "80% less manual entry", "Multi-agent RAG"],
    log: "Scaled into production conversational commerce: unified social channels, automated order processing, and extracted high-value features with agents and semantic search.",
  },
  {
    id: 3,
    stage: "Fine-Tuning & Optimization",
    company: "ASAL Technologies",
    role: "AI Software Engineer",
    period: "May 2026 – Present",
    loss: 0.12,
    complexity: 96,
    cost: 24,
    metrics: ["DSPy + MIPROv2", "GEPA optimization", "Voice AI", "Multi-agent orchestration"],
    log: "Fine-tuning low-latency Arabic voice pipelines and optimizing cross-model prompt behavior with Bayesian search and genetic mutation.",
  },
]

const runData = epochs.map((epoch) => ({
  epoch: `E${epoch.id}`,
  complexity: epoch.complexity,
  cost: epoch.cost,
  loss: epoch.loss,
}))

const chartConfig = {
  complexity: { label: "Stack complexity", color: "var(--chart-1)" },
  cost: { label: "Operating costs", color: "var(--chart-3)" },
} satisfies ChartConfig

const projectMeta = [
  { name: "DeepCrawl AI", complexity: 0.1, domain: "NLP / RAG", language: "Python", loss: 0.08, best: true },
  { name: "Quantum Matching", complexity: 0.088, domain: "Quantum", language: "Python", loss: 0.14 },
  { name: "Solar Forecasting", complexity: 0.058, domain: "Classic ML", language: "Python", loss: 0.21 },
  { name: "Flower Classifier", complexity: 0.072, domain: "Computer Vision", language: "Python", loss: 0.17 },
  { name: "Dictionary App", complexity: 0.018, domain: "Utility", language: "PHP", loss: 0.36 },
]

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h3>
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  )
}

function TrainingChart({ activeEpoch }: { activeEpoch: number }) {
  const visibleData = runData.slice(0, activeEpoch + 1)
  return (
    <div className="sticky top-6 flex flex-col gap-5 rounded-2xl border border-border bg-popover/90 p-5 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">live telemetry</p>
          <p className="mt-1 text-sm font-medium text-foreground">career_training_run_001</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-xs text-primary"><span className="size-2 rounded-full bg-primary training-status" />training</span>
      </div>
      <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
        <LineChart data={visibleData} margin={{ left: -22, right: 10, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="epoch" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="complexity" stroke="var(--color-complexity)" strokeWidth={3} dot={{ fill: "var(--color-complexity)", r: 4 }} isAnimationActive />
          <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "var(--color-cost)", r: 3 }} isAnimationActive />
        </LineChart>
      </ChartContainer>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">complexity</p>
          <p className="mt-1 font-mono text-xl text-primary">{epochs[activeEpoch].complexity}%</p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">loss</p>
          <p className="mt-1 font-mono text-xl text-foreground">{epochs[activeEpoch].loss.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}

export function ExperienceNetwork() {
  const [activeEpoch, setActiveEpoch] = useState(0)
  const epochRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveEpoch(Number(visible.target.getAttribute("data-epoch")))
      },
      { rootMargin: "-28% 0px -45%", threshold: [0.2, 0.55, 0.85] },
    )
    epochRefs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="training-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="model.fit(career_data)" title="Three epochs. One continuously improving model." copy="Scroll through the training run. Every role updates the weights, lowers loss, and increases the complexity of the systems I can ship." />
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-background/70 font-mono">
          <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Terminal className="size-4 text-primary" />career_train.py</span>
            <span className="text-[10px] text-muted-foreground">3/3 epochs</span>
          </div>
          <div className="flex flex-col">
            {epochs.map((epoch, index) => (
              <article
                key={epoch.id}
                ref={(node) => { epochRefs.current[index] = node }}
                data-epoch={index}
                onMouseEnter={() => setActiveEpoch(index)}
                className={`min-h-[22rem] border-b border-border p-5 transition-colors last:border-b-0 sm:p-6 ${activeEpoch === index ? "bg-primary/5" : "bg-transparent"}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border text-[10px] ${activeEpoch >= index ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{epoch.id}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-primary">Epoch {epoch.id}/3 — {epoch.stage}</p>
                      <p className="text-[10px] text-muted-foreground">loss: {epoch.loss.toFixed(2)}</p>
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-foreground">{epoch.company}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{epoch.role} · {epoch.period}</p>
                    <p className="mt-5 font-sans text-sm leading-relaxed text-muted-foreground"><span className="font-mono text-primary">[weights updated]</span> {epoch.log}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {epoch.metrics.map((metric) => <span key={metric} className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-[10px] text-muted-foreground">{metric}</span>)}
                    </div>
                    <p className={`mt-5 text-xs transition-opacity ${activeEpoch >= index ? "text-primary opacity-100" : "opacity-30"}`}>✓ checkpoint saved: epoch_0{epoch.id}.weights</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <TrainingChart activeEpoch={activeEpoch} />
      </div>
    </div>
  )
}

export function ProjectsNetwork() {
  const [complexity, setComplexity] = useState(0.1)
  const [domain, setDomain] = useState("All tasks")
  const [language, setLanguage] = useState("All languages")

  const trials = useMemo(() => projectMeta
    .map((meta) => ({ ...meta, project: projects.find((project) => project.name === meta.name)! }))
    .filter((trial) => (domain === "All tasks" || trial.domain === domain) && (language === "All languages" || trial.language === language))
    .sort((a, b) => Math.abs(a.complexity - complexity) - Math.abs(b.complexity - complexity)), [complexity, domain, language])

  const convergenceData = trials.map((trial, index) => ({ trial: index + 1, loss: trial.loss }))
  const trialConfig = { loss: { label: "Validation loss", color: "var(--chart-1)" } } satisfies ChartConfig

  return (
    <div className="tuner-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="study.optimize(objective)" title="Tune the portfolio. Find your best trial." copy="Adjust the mock hyperparameters to search the project space. Results are ranked by their distance from your selected complexity and filtered by task and optimizer." />
      <div className="overflow-hidden rounded-2xl border border-border bg-background/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-popover px-5 py-4">
          <span className="flex items-center gap-2 font-mono text-sm text-foreground"><FlaskConical className="size-4 text-primary" />portfolio-sweep</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">study running</span>
        </div>
        <div className="grid lg:grid-cols-[17rem_1fr]">
          <aside className="flex flex-col gap-7 border-b border-border bg-popover/65 p-5 lg:border-r lg:border-b-0" aria-label="Hyperparameter controls">
            <div>
              <label htmlFor="complexity" className="flex items-center justify-between gap-3 font-mono text-xs text-foreground"><span>learning_rate</span><output>{complexity.toFixed(3)}</output></label>
              <input id="complexity" type="range" min="0.001" max="0.1" step="0.001" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} className="tuner-range mt-4 w-full accent-primary" />
              <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground"><span>simple</span><span>complex</span></div>
            </div>
            <label className="flex flex-col gap-2 font-mono text-xs text-foreground">task_type
              <select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {['All tasks', 'NLP / RAG', 'Computer Vision', 'Quantum', 'Classic ML', 'Utility'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 font-mono text-xs text-foreground">optimizer
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {['All languages', 'Python', 'JavaScript', 'PHP'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Gauge className="size-4 text-primary" />Search space</div>
              <p className="mt-2 font-mono text-xl text-foreground">{trials.length}<span className="text-xs text-muted-foreground"> / {projects.length} trials</span></p>
            </div>
          </aside>
          <div className="min-w-0 p-5 sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[1fr_15rem]">
              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">trial results</h4>
                  <span className="font-mono text-[10px] text-muted-foreground">sorted by | lr − target |</span>
                </div>
                <div className="flex min-h-72 flex-col gap-3" aria-live="polite">
                  {trials.length ? trials.map((trial, index) => (
                    <article key={trial.name} className={`trial-result grid gap-4 rounded-xl border p-4 transition-all sm:grid-cols-[auto_1fr_auto] sm:items-center ${trial.best ? "border-primary bg-primary/5" : "border-border bg-popover/70"}`}>
                      <span className="flex size-9 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-semibold text-foreground">{trial.name}</h5>
                          {trial.best && <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 font-mono text-[9px] font-semibold text-primary-foreground"><Star className="size-3 fill-current" />Best Trial · Global Minimum</span>}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{trial.project.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">{trial.project.stack.map((tech) => <span key={tech} className="font-mono text-[10px] text-muted-foreground">#{tech}</span>)}</div>
                      </div>
                      <div className="flex items-center gap-4 sm:justify-end">
                        <div className="text-right font-mono"><p className="text-[9px] uppercase text-muted-foreground">val_loss</p><p className="mt-1 text-primary">{trial.loss.toFixed(2)}</p></div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </article>
                  )) : <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center"><BrainCircuit className="size-8 text-primary" /><p className="text-sm text-foreground">No converged trials</p><p className="text-xs text-muted-foreground">Try a different task or optimizer.</p></div>}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-popover/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">optimization history</p>
                <ChartContainer config={trialConfig} className="mt-4 h-44 w-full aspect-auto">
                  <AreaChart data={convergenceData} margin={{ left: -32, right: 4, top: 10, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 6" />
                    <XAxis dataKey="trial" hide />
                    <YAxis domain={[0, 0.5]} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="loss" stroke="var(--color-loss)" fill="var(--color-loss)" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 font-mono text-[10px] text-muted-foreground"><span>best value</span><span className="text-primary">{trials.length ? Math.min(...trials.map((trial) => trial.loss)).toFixed(2) : '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
