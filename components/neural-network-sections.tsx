"use client"

import { useState } from "react"
import { BrainCircuit, MapPin, Network, Sparkles } from "lucide-react"
import { experience, projects } from "@/lib/resume"

const projectInputs = ["Python", "RAG", "Vision", "Forecasting", "Backend"]

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h3>
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  )
}

export function ExperienceNetwork() {
  const [selected, setSelected] = useState(0)
  const job = experience[selected]

  return (
    <div className="neural-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro
        eyebrow="career model · 6 layers"
        title="A network trained on shipping real systems."
        copy="Each neuron is a role. Follow the signal from foundational ML research to production voice agents, RAG systems, and AI commerce."
      />

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <div className="relative min-h-[27rem] overflow-hidden rounded-2xl border border-border bg-background/40 p-5">
          <div className="absolute inset-0 neural-grid opacity-40" aria-hidden="true" />
          <svg className="pointer-events-none absolute inset-0 hidden size-full lg:block" viewBox="0 0 600 430" preserveAspectRatio="none" aria-hidden="true">
            {experience.slice(0, -1).map((_, index) => {
              const y1 = 48 + index * 68
              const y2 = 48 + (index + 1) * 68
              const x1 = index % 2 === 0 ? 165 : 430
              const x2 = (index + 1) % 2 === 0 ? 165 : 430
              return <path key={index} d={`M ${x1} ${y1} C 300 ${y1}, 300 ${y2}, ${x2} ${y2}`} className={index < selected ? "network-line is-trained" : index === selected || index === selected - 1 ? "network-line is-active" : "network-line"} />
            })}
          </svg>

          <div className="relative flex flex-col gap-3">
            {experience.map((item, index) => (
              <button
                key={item.company + item.period}
                type="button"
                onClick={() => setSelected(index)}
                aria-pressed={selected === index}
                className={`neuron-row group flex min-h-14 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-[58%] ${index % 2 ? "lg:self-end" : "lg:self-start"} ${selected === index ? "is-selected border-primary bg-primary/10" : "border-border bg-popover/80 hover:border-primary/60"}`}
              >
                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/60 bg-background font-mono text-xs font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                  {selected === index && <span className="signal-ring absolute inset-0 rounded-full border border-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{item.role}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{item.company}</span>
                </span>
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">L{index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <article className="flex flex-col rounded-2xl border border-primary/30 bg-popover/90 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">active neuron</span>
            <BrainCircuit className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6">
            <p className="font-mono text-xs text-muted-foreground">{job.period}</p>
            <h4 className="mt-2 text-xl font-semibold text-foreground">{job.role}</h4>
            <p className="mt-1 text-primary">@ {job.company}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{job.location}</p>
          </div>
          <div className="my-6 h-px bg-border" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">learned representations</p>
          <ul className="mt-4 flex flex-col gap-3">
            {job.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  )
}

export function ProjectsNetwork() {
  const [selected, setSelected] = useState(0)
  const project = projects[selected]

  return (
    <div className="neural-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro
        eyebrow="inference graph · live"
        title="Skills flow in. Products emerge."
        copy="Select an output neuron to inspect the project and see the capabilities that power it. The graph is a map of how I turn ML building blocks into usable software."
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-background/40 p-5 sm:p-8">
        <div className="absolute inset-0 neural-grid opacity-40" aria-hidden="true" />
        <svg className="pointer-events-none absolute inset-0 hidden size-full md:block" viewBox="0 0 900 420" preserveAspectRatio="none" aria-hidden="true">
          {projectInputs.flatMap((_, inputIndex) => projects.map((__, projectIndex) => (
            <path
              key={`${inputIndex}-${projectIndex}`}
              d={`M 155 ${60 + inputIndex * 72} C 360 ${60 + inputIndex * 72}, 520 ${60 + projectIndex * 72}, 720 ${60 + projectIndex * 72}`}
              className={projectIndex === selected ? "network-line is-active" : "network-line"}
            />
          )))}
        </svg>

        <div className="relative grid gap-8 md:grid-cols-[0.65fr_1fr_0.85fr] md:items-center">
          <div className="flex flex-wrap gap-2 md:flex-col">
            <p className="w-full font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">input layer</p>
            {projectInputs.map((input) => {
              const active = project.stack.some((tech) => tech.toLowerCase().includes(input.toLowerCase())) || (input === "Vision" && project.name === "Flower Classifier") || (input === "Forecasting" && project.name === "Solar Forecasting") || (input === "Backend" && ["DeepCrawl AI", "Dictionary App"].includes(project.name))
              return <span key={input} className={`rounded-full border px-3 py-2 font-mono text-xs ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-popover text-muted-foreground"}`}>{input}</span>
            })}
          </div>

          <div className="hidden items-center justify-center md:flex" aria-hidden="true">
            <div className="relative flex size-36 items-center justify-center rounded-full border border-primary/40 bg-popover/90">
              <span className="signal-ring absolute inset-3 rounded-full border border-primary/60" />
              <Network className="size-9 text-primary" />
              <span className="absolute bottom-7 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">latent space</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">output layer</p>
            {projects.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setSelected(index)}
                aria-pressed={selected === index}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected === index ? "border-primary bg-primary/10" : "border-border bg-popover/80 hover:border-primary/60"}`}
              >
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-background">
                  <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                  {selected === index && <span className="signal-ring absolute inset-0 rounded-full border border-primary" />}
                </span>
                <span className="text-sm font-medium text-foreground">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <article className="grid gap-6 rounded-2xl border border-primary/30 bg-popover/90 p-6 md:grid-cols-[0.7fr_1fr] md:items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">model output {String(selected + 1).padStart(2, "0")}</p>
          <h4 className="mt-3 text-2xl font-semibold text-foreground">{project.name}</h4>
        </div>
        <div>
          <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Technology stack">
            {project.stack.map((tech) => <li key={tech} className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-secondary-foreground">{tech}</li>)}
          </ul>
        </div>
      </article>
    </div>
  )
}
