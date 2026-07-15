"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BrainCircuit, Check, MapPin, Terminal } from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { experience, projects } from "@/lib/resume"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chronologicalExperience = [...experience].reverse()
const complexity = [18, 31, 43, 68, 82, 96]
const epochData = chronologicalExperience.map((job, index) => ({
  epoch: `E${index + 1}`,
  complexity: complexity[index],
  company: job.company,
}))

const chartConfig = {
  complexity: { label: "System complexity", color: "var(--chart-1)" },
} satisfies ChartConfig

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h3 className="max-w-3xl text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h3>
      <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  )
}

function TrainingTelemetry({ activeEpoch }: { activeEpoch: number }) {
  return (
    <aside className="sticky top-6 hidden flex-col gap-5 rounded-2xl border border-border bg-popover/95 p-5 shadow-2xl lg:flex" aria-label="Career training telemetry">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">live telemetry</p>
          <p className="mt-1 text-sm font-medium text-foreground">career_model.fit()</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-xs text-primary"><span className="training-status size-2 rounded-full bg-primary" />training</span>
      </div>
      <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
        <LineChart data={epochData} margin={{ left: -24, right: 12, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="epoch" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ReferenceLine x={`E${activeEpoch + 1}`} stroke="var(--primary)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="complexity" stroke="var(--color-complexity)" strokeWidth={3} dot={{ fill: "var(--color-complexity)", r: 4 }} isAnimationActive />
        </LineChart>
      </ChartContainer>
      <div className="rounded-xl border border-border bg-background/70 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">active checkpoint</p>
        <p className="mt-2 text-sm font-medium text-foreground">Epoch {activeEpoch + 1} · {chronologicalExperience[activeEpoch].company}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="epoch-progress h-full rounded-full bg-primary" style={{ width: `${((activeEpoch + 1) / chronologicalExperience.length) * 100}%` }} /></div>
        <p className="mt-2 text-right font-mono text-[10px] text-muted-foreground">{activeEpoch + 1}/{chronologicalExperience.length} epochs</p>
      </div>
    </aside>
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
      { rootMargin: "-22% 0px -48%", threshold: [0.15, 0.35, 0.6] },
    )
    epochRefs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="model.fit(career_history)" title="Six positions. Six training epochs." copy="Each role starts training as it enters the viewport. The achievements are the weight updates—the measurable work that changed what I can build next." />
      <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-background/75">
          <div className="flex items-center justify-between gap-4 border-b border-border bg-popover px-4 py-3 font-mono">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Terminal className="size-4 text-primary" />career_train.py</span>
            <span className="text-[10px] text-muted-foreground">epochs={chronologicalExperience.length}</span>
          </div>
          <div className="flex flex-col">
            {chronologicalExperience.map((job, index) => {
              const state = index < activeEpoch ? "complete" : index === activeEpoch ? "training" : "queued"
              return (
                <article key={`${job.company}-${job.period}`} ref={(node) => { epochRefs.current[index] = node }} data-epoch={index} className={`epoch-panel min-h-[70vh] border-b border-border p-5 last:border-b-0 sm:p-7 ${state === "training" ? "is-training bg-primary/5" : state === "complete" ? "is-complete" : "is-queued"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`epoch-index mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${state !== "queued" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{state === "complete" ? <Check className="size-4" /> : String(index + 1).padStart(2, "0")}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
                        <span className="text-primary">Epoch {index + 1}/{chronologicalExperience.length}</span>
                        <span className={state === "training" ? "text-primary" : "text-muted-foreground"}>[{state}]</span>
                      </div>
                      <h4 className="mt-4 text-xl font-semibold text-foreground">{job.role}</h4>
                      <p className="mt-1 text-sm font-medium text-primary">@ {job.company}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground"><span>{job.period}</span><span className="flex items-center gap-1.5"><MapPin className="size-3" />{job.location}</span></div>
                      <div className={`training-log mt-5 rounded-lg border border-border bg-popover/80 px-3 py-2 font-mono text-[10px] text-muted-foreground ${state === "training" ? "is-running" : ""}`}><span className="text-primary">{state === "queued" ? "$ waiting" : state === "training" ? "$ training" : "$ checkpoint_saved"}</span> --epoch {index + 1} --company &quot;{job.company}&quot;</div>
                      <div className="mt-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">weight updates / what I shipped</p>
                        <ul className="mt-4 flex flex-col gap-4">
                          {job.points.map((point, pointIndex) => (
                            <li key={point} className="flex gap-3 text-sm leading-relaxed text-foreground/90"><span className="mt-1.5 font-mono text-xs text-primary">{String(pointIndex + 1).padStart(2, "0")}</span><span>{point}</span></li>
                          ))}
                        </ul>
                      </div>
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

type NetworkNode = { id: string; label: string }
type ProjectPath = { nodes: string[]; trace: string[] }

const layers: { id: string; label: string; nodes: NetworkNode[] }[] = [
  { id: "input", label: "Input", nodes: [{ id: "curiosity", label: "Curiosity" }, { id: "data", label: "Real-world data" }, { id: "docs", label: "Documentation" }] },
  { id: "knowledge", label: "Knowledge", nodes: [{ id: "rag", label: "RAG" }, { id: "ml", label: "Classic ML" }, { id: "vision", label: "Computer Vision" }, { id: "quantum", label: "Quantum" }, { id: "web", label: "Web systems" }] },
  { id: "reasoning", label: "Reasoning", nodes: [{ id: "retrieval", label: "Retrieval" }, { id: "forecast", label: "Forecasting" }, { id: "classification", label: "Classification" }, { id: "matching", label: "Matching" }, { id: "search", label: "Search" }] },
  { id: "engineering", label: "Engineering", nodes: [{ id: "python", label: "Python" }, { id: "fastapi", label: "FastAPI" }, { id: "tensorflow", label: "TensorFlow" }, { id: "qiskit", label: "Qiskit" }, { id: "php", label: "PHP" }] },
  { id: "optimization", label: "Optimization", nodes: [{ id: "evaluation", label: "Evaluation" }, { id: "finetuning", label: "Fine-tuning" }, { id: "cicd", label: "CI/CD" }, { id: "deployment", label: "Deployment" }] },
]

const paths: Record<string, ProjectPath> = {
  "DeepCrawl AI": { nodes: ["curiosity", "docs", "rag", "web", "retrieval", "search", "python", "fastapi", "evaluation", "deployment"], trace: ["Documentation + web data", "RAG retrieval and semantic search", "Python + FastAPI service", "Evaluation and deployment"] },
  "Quantum Matching": { nodes: ["curiosity", "data", "quantum", "matching", "python", "qiskit", "evaluation"], trace: ["Biological data", "Quantum feature representation", "Qiskit matching routine", "Evaluation"] },
  "Solar Forecasting": { nodes: ["data", "docs", "ml", "forecast", "python", "evaluation", "deployment"], trace: ["Weather and solar data", "Classical model selection", "Forecasting in Python", "Evaluation and serving"] },
  "Flower Classifier": { nodes: ["data", "docs", "vision", "classification", "python", "tensorflow", "finetuning", "evaluation"], trace: ["Flower image data", "Computer vision classification", "TensorFlow + MobileNetV2", "Fine-tuning and evaluation"] },
  "Dictionary App": { nodes: ["curiosity", "docs", "web", "search", "php", "cicd", "deployment"], trace: ["Dictionary requirements", "Web search workflow", "PHP + MySQL implementation", "CI/CD and container deployment"] },
}

export function ProjectsNetwork() {
  const [selected, setSelected] = useState(projects[0].name)
  const project = projects.find((item) => item.name === selected) ?? projects[0]
  const activePath = paths[project.name]
  const activeNodes = useMemo(() => new Set(activePath.nodes), [activePath])

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="network.forward(problem)" title="Select an output. Trace the intelligence behind it." copy="Every project is an output neuron connected to the knowledge, reasoning, engineering, and optimization decisions that produced it." />
      <div className="overflow-hidden rounded-2xl border border-border bg-background/75">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-popover px-5 py-4"><span className="flex items-center gap-2 font-mono text-sm text-foreground"><BrainCircuit className="size-4 text-primary" />semantic_project_network</span><span className="font-mono text-[10px] uppercase tracking-widest text-primary">forward pass active</span></div>
        <div className="network-scroll overflow-x-auto p-5 sm:p-7">
          <div className="neural-grid min-w-[950px] rounded-2xl border border-border bg-popover/50 p-6">
            <div className="grid grid-cols-6 gap-5">
              {layers.map((layer, layerIndex) => (
                <div key={layer.id} className="flex flex-col gap-4">
                  <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{String(layerIndex + 1).padStart(2, "0")} · {layer.label}</p>
                  <div className="flex min-h-80 flex-col justify-around gap-4">
                    {layer.nodes.map((node) => <div key={node.id} className={`network-node relative flex min-h-14 items-center justify-center rounded-full border px-3 text-center text-xs ${activeNodes.has(node.id) ? "is-active border-primary bg-primary/10 text-foreground" : "is-dimmed border-border bg-background/75 text-muted-foreground"}`}><span>{node.label}</span>{layerIndex < layers.length - 1 && activeNodes.has(node.id) && <span className="network-connector absolute left-full top-1/2 w-5 border-t border-primary" />}</div>)}
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-4">
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">06 · Output</p>
                <div className="flex min-h-80 flex-col justify-around gap-3">
                  {projects.map((item) => <button key={item.name} type="button" aria-pressed={selected === item.name} onClick={() => setSelected(item.name)} className={`network-output min-h-14 rounded-full border px-3 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === item.name ? "is-active border-primary bg-primary text-primary-foreground" : "border-border bg-background/80 text-muted-foreground hover:border-primary hover:text-foreground"}`}>{item.name}</button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid border-t border-border lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">selected output neuron</p>
            <h4 className="mt-3 text-2xl font-semibold text-foreground">{project.name}</h4>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{project.description}</p>
            <ul className="mt-5 flex flex-wrap gap-2">{project.stack.map((tech) => <li key={tech} className="rounded-md border border-border bg-popover px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">{tech}</li>)}</ul>
          </div>
          <div className="border-t border-border bg-popover/60 p-5 sm:p-7 lg:border-t-0 lg:border-l">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">activation trace</p>
            <ol className="mt-4 flex flex-col gap-3">{activePath.trace.map((step, index) => <li key={step} className="flex items-center gap-3 text-sm text-foreground"><span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary font-mono text-[9px] text-primary">{index + 1}</span><span>{step}</span></li>)}</ol>
          </div>
        </div>
      </div>
    </div>
  )
}
