"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, BrainCircuit, Check, MapPin, Network, Terminal, Zap } from "lucide-react"
import { experience, projects } from "@/lib/resume"

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h3 className="max-w-3xl text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h3>
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  )
}

const trainingEpochs = [...experience].reverse()

function TrainingTerminal({ activeEpoch }: { activeEpoch: number }) {
  const epoch = trainingEpochs[activeEpoch]

  return (
    <aside className="training-terminal sticky top-6 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl" aria-label="Career training terminal" aria-live="polite">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-xs text-foreground"><Terminal className="size-4 text-primary" />training-terminal</span>
        <span className="flex items-center gap-2 font-mono text-[10px] text-primary"><span className="training-status size-2 rounded-full bg-primary" />RUNNING</span>
      </div>
      <div key={activeEpoch} className="terminal-body flex min-h-[25rem] flex-col gap-3 p-5 font-mono text-xs leading-relaxed sm:p-6">
        <p className="terminal-line text-muted-foreground" style={{ "--line": 0 } as React.CSSProperties}>$ python career_model.py --train</p>
        <p className="terminal-line text-primary" style={{ "--line": 1 } as React.CSSProperties}>[TRAIN] epoch {activeEpoch + 1}/{trainingEpochs.length}</p>
        <p className="terminal-line text-foreground" style={{ "--line": 2 } as React.CSSProperties}>&gt; loading: {epoch.role}</p>
        <p className="terminal-line text-muted-foreground" style={{ "--line": 3 } as React.CSSProperties}>&gt; context: {epoch.company} · {epoch.period}</p>
        <div className="my-1 h-px bg-border" />
        <p className="terminal-line text-primary" style={{ "--line": 4 } as React.CSSProperties}>[LEARNED + DELIVERED]</p>
        {epoch.points.map((point, index) => (
          <p key={point} className="terminal-line flex gap-2 text-foreground/85" style={{ "--line": index + 5 } as React.CSSProperties}>
            <span className="shrink-0 text-primary">{String(index + 1).padStart(2, "0")}</span><span>{point}</span>
          </p>
        ))}
        <p className="terminal-line mt-auto border-t border-border pt-4 text-primary" style={{ "--line": epoch.points.length + 5 } as React.CSSProperties}>✓ checkpoint generated → epoch_{String(activeEpoch + 1).padStart(2, "0")}.card</p>
        <p className="terminal-line text-muted-foreground" style={{ "--line": epoch.points.length + 6 } as React.CSSProperties}>&gt; scroll to continue training<span className="caret">_</span></p>
      </div>
    </aside>
  )
}

export function ExperienceNetwork() {
  const [activeEpoch, setActiveEpoch] = useState(0)
  const epochRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveEpoch(Number(visible.target.getAttribute("data-epoch")))
    }, { rootMargin: "-25% 0px -45%", threshold: [0.15, 0.4, 0.7] })
    epochRefs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="training-shell flex flex-col gap-10 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="career_model.fit(history)" title="Scroll the training run. Watch each role compile." copy="The terminal narrates the real work from each position, then generates its checkpoint card. Every line is grounded in my CV." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          {trainingEpochs.map((epoch, index) => {
            const generated = index <= activeEpoch
            const active = index === activeEpoch
            return (
              <article key={`${epoch.company}-${epoch.role}`} ref={(node) => { epochRefs.current[index] = node }} data-epoch={index} tabIndex={0} onFocus={() => setActiveEpoch(index)} className={`epoch-card epoch-generated min-h-[31rem] rounded-2xl border border-border bg-background/70 p-5 sm:p-7 ${active ? "is-active" : ""} ${generated ? "is-generated" : ""}`} aria-current={active ? "step" : undefined}>
                <div className="flex items-start gap-4">
                  <div className={`epoch-index mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${generated ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{index < activeEpoch ? <Check className="size-4" /> : String(index + 1).padStart(2, "0")}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider"><p className="text-primary">Epoch {index + 1}/{trainingEpochs.length} · {active ? "compiling" : generated ? "generated" : "queued"}</p><p className="text-muted-foreground">{epoch.period}</p></div>
                    <h4 className="mt-5 text-balance text-xl font-semibold text-foreground sm:text-2xl">{epoch.role}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">{epoch.company}</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{epoch.location}</span></div>
                    <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">what I learned, built, and delivered</p>
                    <ul className="mt-4 flex flex-col gap-4">{epoch.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-relaxed text-foreground/90 sm:text-[15px]"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /><span>{point}</span></li>)}</ul>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        <TrainingTerminal activeEpoch={activeEpoch} />
      </div>
    </div>
  )
}

type Route = { source: string; transforms: string[]; tools: string; cue: string }
const routes: Record<string, Route> = {
  "DeepCrawl AI": { source: "Web pages", transforms: ["Crawl + index", "Retrieve + generate"], tools: "FastAPI · React · Supabase · RAG", cue: "Ask the web" },
  "Quantum Matching": { source: "Biological data", transforms: ["Encode features", "Quantum match"], tools: "Python · Qiskit · Streamlit", cue: "Match differently" },
  "Solar Forecasting": { source: "Live weather", transforms: ["Engineer signals", "Predict power"], tools: "Python · Scikit-Learn", cue: "Forecast the sun" },
  "Flower Classifier": { source: "Flower images", transforms: ["Extract features", "Classify species"], tools: "TensorFlow · MobileNetV2", cue: "Teach vision" },
  "Dictionary App": { source: "Word queries", transforms: ["Search records", "Ship pipeline"], tools: "PHP · MySQL · Docker · Jenkins", cue: "Search and ship" },
}

const nodePositions = {
  source: { x: 10, y: 50 }, hiddenA: { x: 34, y: 32 }, hiddenB: { x: 34, y: 68 }, tool: { x: 60, y: 50 }, output: { x: 88, y: 50 },
}
const curves = [
  ["source", "hiddenA"], ["source", "hiddenB"], ["hiddenA", "tool"], ["hiddenB", "tool"], ["tool", "output"],
] as const

function curvePath(from: keyof typeof nodePositions, to: keyof typeof nodePositions) {
  const a = nodePositions[from]; const b = nodePositions[to]; const middle = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${middle} ${a.y}, ${middle} ${b.y}, ${b.x} ${b.y}`
}

export function ProjectsNetwork() {
  const [selectedName, setSelectedName] = useState(projects[0].name)
  const selectedProject = projects.find((project) => project.name === selectedName) ?? projects[0]
  const route = routes[selectedProject.name]

  return (
    <div className="network-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="network.forward(projects)" title="Pick a project. Fire its neural pathway." copy="Five different problems, five distinct routes. Choose an output to see data transform into a working system." />

      <div className="project-selector grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Choose a project">
        {projects.map((project, index) => <button key={project.name} type="button" onClick={() => setSelectedName(project.name)} aria-pressed={selectedName === project.name} className={`project-choice flex min-h-32 flex-col items-start justify-between gap-4 rounded-xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedName === project.name ? "is-active" : ""}`}><span className="font-mono text-[10px] text-muted-foreground">OUTPUT {String(index + 1).padStart(2, "0")}</span><span className="text-balance text-base font-semibold text-foreground">{project.name}</span><span className="font-mono text-[10px] text-primary">{routes[project.name].cue} →</span></button>)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background/75">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-popover px-5 py-4"><span className="flex items-center gap-2 font-mono text-sm text-foreground"><Network className="size-4 text-primary" />{selectedProject.name}.forward()</span><span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary"><Zap className="size-3.5" />signal fired</span></div>
        <div key={selectedName} className="neural-grid network-stage relative min-h-[27rem] overflow-hidden p-5 sm:min-h-[31rem]">
          <svg className="absolute inset-0 hidden size-full sm:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{curves.map(([from, to], index) => <path key={`${from}-${to}`} d={curvePath(from, to)} className="network-line is-active" style={{ "--edge": index } as React.CSSProperties} />)}</svg>
          <div className="network-route-mobile flex h-full flex-col items-stretch justify-center gap-3 sm:hidden">
            {[route.source, ...route.transforms, route.tools, selectedProject.name].map((label, index, list) => <div key={label} className="flex flex-col items-center gap-3"><div className="network-node is-active w-full rounded-xl border border-primary/40 bg-popover p-4 text-center"><span className="font-mono text-[10px] uppercase text-muted-foreground">{index === 0 ? "source" : index === list.length - 1 ? "output" : "transform"}</span><p className="mt-1 text-sm font-semibold text-foreground">{label}</p></div>{index < list.length - 1 && <ArrowRight className="size-4 rotate-90 text-primary" />}</div>)}
          </div>
          <div className="hidden sm:block">
            <div className="network-node is-active" style={{ left: "10%", top: "50%", "--node": 0 } as React.CSSProperties}><span>source data</span><strong>{route.source}</strong></div>
            <div className="network-node is-active" style={{ left: "34%", top: "32%", "--node": 1 } as React.CSSProperties}><span>hidden neuron 01</span><strong>{route.transforms[0]}</strong></div>
            <div className="network-node is-active" style={{ left: "34%", top: "68%", "--node": 2 } as React.CSSProperties}><span>hidden neuron 02</span><strong>{route.transforms[1]}</strong></div>
            <div className="network-node network-tool is-active" style={{ left: "60%", top: "50%", "--node": 3 } as React.CSSProperties}><span>engineering stack</span><strong>{route.tools}</strong></div>
            <div className="network-node network-result is-active" style={{ left: "88%", top: "50%", "--node": 4 } as React.CSSProperties}><span>activated output</span><strong>{selectedProject.name}</strong></div>
          </div>
        </div>
      </div>

      <article key={selectedProject.name} className="project-detail rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-7" aria-live="polite">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between"><div className="max-w-3xl"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">activated project · {route.cue}</p><h4 className="mt-3 text-balance text-2xl font-semibold text-foreground sm:text-3xl">{selectedProject.name}</h4><p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">{selectedProject.description}</p></div><BrainCircuit className="size-9 shrink-0 text-primary" aria-hidden="true" /></div>
        <div className="mt-6 flex flex-wrap gap-2">{selectedProject.stack.map((tech) => <span key={tech} className="rounded-md border border-border bg-background/70 px-2.5 py-1.5 font-mono text-[10px] text-foreground">{tech}</span>)}</div>
        <p className="mt-6 border-t border-border pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">route: {route.source} → {route.transforms.join(" → ")} → {route.tools} → <span className="text-primary">{selectedProject.name}</span></p>
      </article>
    </div>
  )
}
