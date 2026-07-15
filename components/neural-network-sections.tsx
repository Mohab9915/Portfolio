"use client"

import { useEffect, useRef, useState } from "react"
import { BrainCircuit, Check, MapPin, Network, Terminal } from "lucide-react"
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

function TrainingTelemetry({ activeEpoch }: { activeEpoch: number }) {
  const epoch = trainingEpochs[activeEpoch]
  const progress = ((activeEpoch + 1) / trainingEpochs.length) * 100

  return (
    <aside className="training-telemetry sticky top-6 flex flex-col gap-5 rounded-2xl border border-border bg-popover/95 p-5 shadow-2xl" aria-label="Training progress">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">live training state</p>
          <p className="mt-1 text-sm font-medium text-foreground">career_model.fit()</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-xs text-primary">
          <span className="training-status size-2 rounded-full bg-primary" /> training
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>epoch {activeEpoch + 1} / {trainingEpochs.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="training-progress h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="training-curve" aria-hidden="true">
        {trainingEpochs.map((item, index) => {
          const height = 22 + index * 10
          return <span key={item.company} className={index <= activeEpoch ? "is-complete" : ""} style={{ height }} />
        })}
      </div>

      <div className="rounded-xl border border-border bg-background/70 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">active checkpoint</p>
        <p className="mt-2 text-sm font-semibold text-foreground">{epoch.company}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{epoch.role}</p>
      </div>

      <ol className="flex flex-col gap-2" aria-label="Epoch checkpoints">
        {trainingEpochs.map((item, index) => (
          <li key={`${item.company}-${item.role}`} className={`flex items-center gap-3 font-mono text-[10px] ${index === activeEpoch ? "text-primary" : index < activeEpoch ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${index <= activeEpoch ? "border-primary" : "border-border"}`}>
              {index < activeEpoch ? <Check className="size-3" /> : String(index + 1).padStart(2, "0")}
            </span>
            <span className="truncate">{item.company}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export function ExperienceNetwork() {
  const [activeEpoch, setActiveEpoch] = useState(0)
  const epochRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveEpoch(Number(visible.target.getAttribute("data-epoch")))
      },
      { rootMargin: "-26% 0px -42%", threshold: [0.2, 0.5, 0.8] },
    )
    epochRefs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="training-shell flex flex-col gap-10 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro
        eyebrow="model.fit(career_history)"
        title="Six positions. Each one a training epoch."
        copy="The model improves through real work, not invented metrics. Scroll the run to inspect what I built, optimized, and delivered at every checkpoint."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-background/70">
          <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3 font-mono">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Terminal className="size-4 text-primary" />career_train.py</span>
            <span className="text-[10px] text-muted-foreground">{trainingEpochs.length} epochs queued</span>
          </div>
          <div className="flex flex-col">
            {trainingEpochs.map((epoch, index) => {
              const isActive = activeEpoch === index
              const isComplete = activeEpoch > index
              return (
                <article
                  key={`${epoch.company}-${epoch.role}`}
                  ref={(node) => { epochRefs.current[index] = node }}
                  data-epoch={index}
                  tabIndex={0}
                  onFocus={() => setActiveEpoch(index)}
                  onMouseEnter={() => setActiveEpoch(index)}
                  className={`epoch-card min-h-[26rem] border-b border-border p-5 last:border-b-0 sm:p-7 ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="flex items-start gap-4">
                    <div className={`epoch-index mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${isActive || isComplete ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                      {isComplete ? <Check className="size-4" /> : String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
                        <p className="text-primary">Epoch {String(index + 1).padStart(2, "0")} · {isActive ? "training" : isComplete ? "checkpoint saved" : "queued"}</p>
                        <p className="text-muted-foreground">{epoch.period}</p>
                      </div>
                      <h4 className="mt-5 text-balance text-xl font-semibold text-foreground sm:text-2xl">{epoch.role}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{epoch.company}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{epoch.location}</span>
                      </div>

                      <div className="mt-7">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">work completed / learned weights</p>
                        <ul className="mt-4 flex flex-col gap-4">
                          {epoch.points.map((point) => (
                            <li key={point} className="flex gap-3 text-sm leading-relaxed text-foreground/90 sm:text-[15px]">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className={`mt-7 font-mono text-[10px] transition-opacity ${isActive || isComplete ? "text-primary opacity-100" : "text-muted-foreground opacity-50"}`}>
                        {isActive ? "> updating weights from production experience..." : isComplete ? `✓ checkpoint saved: epoch_${String(index + 1).padStart(2, "0")}.weights` : "> awaiting batch..."}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
        <TrainingTelemetry activeEpoch={activeEpoch} />
      </div>
    </div>
  )
}

type ProjectPath = {
  input: string
  domain: string
  engine: string
}

const projectPaths: Record<string, ProjectPath> = {
  "DeepCrawl AI": { input: "Web data", domain: "Language", engine: "Retrieval" },
  "Quantum Matching": { input: "Bio data", domain: "Matching", engine: "Quantum" },
  "Solar Forecasting": { input: "Weather", domain: "Forecasting", engine: "Classical ML" },
  "Flower Classifier": { input: "Images", domain: "Vision", engine: "Deep learning" },
  "Dictionary App": { input: "Words", domain: "Search", engine: "Web systems" },
}

const columns = [
  { label: "input", x: 9, values: ["Web data", "Bio data", "Weather", "Images", "Words"] },
  { label: "problem", x: 32, values: ["Language", "Matching", "Forecasting", "Vision", "Search"] },
  { label: "engine", x: 57, values: ["Retrieval", "Quantum", "Classical ML", "Deep learning", "Web systems"] },
  { label: "output", x: 84, values: projects.map((project) => project.name) },
]
const yPositions = [18, 34, 50, 66, 82]

export function ProjectsNetwork() {
  const [selectedName, setSelectedName] = useState(projects[0].name)
  const selectedProject = projects.find((project) => project.name === selectedName) ?? projects[0]
  const activePath = projectPaths[selectedProject.name]
  const activeValues = new Set([activePath.input, activePath.domain, activePath.engine, selectedProject.name])
  const activeIndexes = [
    columns[0].values.indexOf(activePath.input),
    columns[1].values.indexOf(activePath.domain),
    columns[2].values.indexOf(activePath.engine),
    columns[3].values.indexOf(selectedProject.name),
  ]

  return (
    <div className="network-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro
        eyebrow="network.forward(project_space)"
        title="Select an output. Trace the system behind it."
        copy="Each project is an output neuron. Activate one to follow its route from source data through the problem domain and engineering approach."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-background/75">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-popover px-5 py-4">
          <span className="flex items-center gap-2 font-mono text-sm text-foreground"><Network className="size-4 text-primary" />project_graph.nn</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">forward pass active</span>
        </div>

        <div className="neural-grid relative min-h-[34rem] overflow-x-auto p-4 sm:p-6">
          <div className="relative mx-auto h-[30rem] min-w-[52rem] max-w-[64rem]">
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {columns.slice(0, -1).flatMap((column, columnIndex) =>
                column.values.flatMap((_, fromIndex) =>
                  columns[columnIndex + 1].values.map((__, toIndex) => {
                    const isActive = fromIndex === activeIndexes[columnIndex] && toIndex === activeIndexes[columnIndex + 1]
                    return (
                      <line
                        key={`${columnIndex}-${fromIndex}-${toIndex}`}
                        x1={column.x + 2}
                        y1={yPositions[fromIndex]}
                        x2={columns[columnIndex + 1].x - 2}
                        y2={yPositions[toIndex]}
                        className={`network-line ${isActive ? "is-active" : "is-faded"}`}
                      />
                    )
                  }),
                ),
              )}
            </svg>

            {columns.map((column, columnIndex) => (
              <div key={column.label} className="absolute inset-y-0" style={{ left: `${column.x}%` }}>
                <p className="absolute top-1 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{column.label}</p>
                {column.values.map((value, valueIndex) => {
                  const isActive = activeValues.has(value)
                  const isOutput = columnIndex === columns.length - 1
                  const common = `network-neuron absolute -translate-x-1/2 -translate-y-1/2 ${isActive ? "is-active" : "is-faded"}`
                  if (isOutput) {
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedName(value)}
                        className={`${common} network-output w-36 rounded-lg border bg-popover px-3 py-2 text-left font-mono text-[10px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        style={{ top: `${yPositions[valueIndex]}%` }}
                        aria-pressed={value === selectedName}
                      >
                        {value}
                      </button>
                    )
                  }
                  return (
                    <div key={value} className={common} style={{ top: `${yPositions[valueIndex]}%` }}>
                      <span className="neuron-core block size-4 rounded-full border border-border bg-popover" />
                      <span className="absolute left-6 top-1/2 w-24 -translate-y-1/2 font-mono text-[9px] text-muted-foreground">{value}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <article key={selectedProject.name} className="project-detail rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-7" aria-live="polite">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">activated output</p>
            <h4 className="mt-3 text-balance text-2xl font-semibold text-foreground">{selectedProject.name}</h4>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">{selectedProject.description}</p>
          </div>
          <BrainCircuit className="size-8 shrink-0 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {selectedProject.stack.map((tech) => (
            <span key={tech} className="rounded-md border border-border bg-background/70 px-2.5 py-1.5 font-mono text-[10px] text-foreground">{tech}</span>
          ))}
        </div>
        <p className="mt-6 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
          path: {activePath.input} → {activePath.domain} → {activePath.engine} → <span className="text-primary">{selectedProject.name}</span>
        </p>
      </article>
    </div>
  )
}
