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

function TrainingTerminal({
  activeEpoch,
  progressList,
}: {
  activeEpoch: number
  progressList: number[]
}) {
  const epoch = trainingEpochs[activeEpoch]
  const p = progressList[activeEpoch] ?? 0
  const pct = Math.floor(p * 100)

  const allDone = progressList.every((p) => p >= 0.99)
  const noneStarted = progressList.every((p) => p === 0)

  let phase = "SYSTEM_INITIALIZATION"
  if (allDone) {
    phase = "EVALUATION_COMPLETE"
  } else if (!noneStarted && epoch) {
    phase = `${epoch.role} @ ${epoch.company}`.toUpperCase()
  }

  // Linear metrics calculation
  const loss = (0.85 - p * 0.8318).toFixed(4)
  const acc = (0.45 + p * 0.5434).toFixed(4)

  return (
    <aside
      className="training-terminal sticky top-28 overflow-hidden rounded border border-[#555] bg-black shadow-2xl text-[#c0c0c0] w-full h-auto min-h-0 max-h-none"
      style={{
        fontFamily: "'Lucida Console', 'Consolas', 'Courier New', monospace",
        fontSize: "11px",
        lineHeight: "1.4",
      }}
      aria-label="Career training terminal"
      aria-live="polite"
    >
      {/* Classic Windows CMD Title Bar */}
      <div className="flex items-center justify-between bg-[#2d2d2d] border-b border-[#555] px-2.5 py-1 select-none">
        <div className="flex items-center gap-2">
          {/* Retro terminal title box */}
          <div className="size-3.5 border border-[#888] flex items-center justify-center text-[7px] font-bold text-[#888] font-mono leading-none">
            c:\
          </div>
          <span className="text-[10px] text-[#c0c0c0] font-sans">
            C:\Windows\System32\cmd.exe
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#888] font-sans">
          <span className="hover:text-white cursor-pointer">_</span>
          <span className="hover:text-white cursor-pointer">▢</span>
          <span className="hover:text-white cursor-pointer hover:bg-red-600 hover:text-white px-1">✕</span>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4 flex flex-col gap-3 h-auto">
        <div className="text-[#888] space-y-0.5">
          <p>Microsoft Windows [Version 10.0.22631]</p>
          <p>(c) Microsoft Corporation. All rights reserved.</p>
        </div>

        <div>
          <p>C:\Users\Mohab\Portfolio&gt; python train_career.py</p>
        </div>

        <div className="border-t border-[#333] pt-2.5 pb-1 space-y-0.5 text-[#aaa]">
          <p className="text-white font-bold">Phase: {phase}</p>
        </div>

        {/* List of epochs */}
        <div className="flex flex-col gap-3 border-t border-[#222] pt-2.5 h-auto">
          {trainingEpochs.map((epoch, idx) => {
            const epProgress = progressList[idx] ?? 0
            const isCompleted = epProgress >= 0.99
            const isActive = idx === activeEpoch && !allDone
            const isPresent = epoch.period.toLowerCase().includes("present")

            if (isCompleted) {
              if (isPresent) {
                return (
                  <div key={idx} className="space-y-0.5 text-green-400/90 border-l border-green-500/30 pl-2">
                    <p className="text-green-400 font-semibold">
                      ✓ [DEPLOYED/PROD] Epoch {idx + 1}/6 : {epoch.company} — {epoch.role}
                    </p>
                    <p className="text-[#888] text-[10px] font-bold">
                      [====================] 100% | status: ACTIVE | dev: ONLINE | live: production.ckpt
                    </p>
                  </div>
                )
              }
              return (
                <div key={idx} className="space-y-0.5 text-gray-500 border-l border-primary/40 pl-2">
                  <p className="text-white font-semibold">
                    ✓ [SUCCESS] Epoch {idx + 1}/6 : {epoch.company} — {epoch.role}
                  </p>
                  <p className="text-[#888] text-[10px]">
                    [====================] 100% | loss: 0.0125 | acc: 0.9912 | saved: epoch_{idx + 1}.ckpt
                  </p>
                </div>
              )
            }

            if (isActive) {
              const totalBars = 20
              const filledBars = Math.min(totalBars, Math.floor(p * totalBars))
              const emptyBars = Math.max(0, totalBars - filledBars - 1)
              const barString = "=".repeat(filledBars) + (filledBars < totalBars ? ">" : "") + ".".repeat(emptyBars)

              const numPointsToShow = Math.floor(p * (epoch.points.length + 1))
              const pointsShown = epoch.points.slice(0, numPointsToShow)

              return (
                <div key={idx} className="space-y-1.5 text-[#ccc] border-l border-[#888] pl-2 py-0.5 leading-normal bg-[#111]/30">
                  <p className="text-white font-bold">
                    ➔ [TRAINING] Epoch {idx + 1}/6 : {epoch.company} — {epoch.role}
                  </p>
                  <p>
                    [{barString}] {pct}% | loss: {loss} | acc: {acc}
                  </p>
                  {pointsShown.length > 0 && (
                    <div className="space-y-0.5 text-[10px] text-[#aaa] pl-1">
                      {pointsShown.map((pt, pIdx) => (
                        <p key={pIdx}>- {pt}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={idx} className="text-[#555]">
                <p className="font-semibold text-[11px]">[QUEUED] Epoch {idx + 1}/6 : {epoch.company}</p>
                <p className="text-[10px]">[....................] 0% | loss: ---- | acc: ----</p>
              </div>
            )
          })}
        </div>

        {allDone && (
          <div className="space-y-1 border-t border-[#333] pt-2 text-[#aaa]">
            <p className="text-white font-bold">✓ Model training completed successfully.</p>
            <p className="text-white">✓ Checkpoints saved to ./checkpoints/saved_model.ckpt</p>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#666] border-t border-[#222] pt-2">
          {allDone ? (
            <span>&gt; Training complete. Ready for evaluation.</span>
          ) : (
            <span>&gt; scroll down to train next epoch...</span>
          )}
          <span className="caret">_</span>
        </div>
      </div>
    </aside>
  )
}

export function ExperienceNetwork() {
  const [progressList, setProgressList] = useState<number[]>(() =>
    new Array(trainingEpochs.length).fill(0)
  )
  const epochRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const handleScroll = () => {
      const viewportHeight = window.innerHeight
      const nextProgressList = trainingEpochs.map((_, index) => {
        const el = epochRefs.current[index]
        if (!el) return 0
        const rect = el.getBoundingClientRect()

        // Training starts when the top of the slot is at 80% of viewport
        // and finishes when the top reaches 20% of viewport.
        const start = viewportHeight * 0.8
        const end = viewportHeight * 0.2

        if (rect.top > start) {
          return 0
        } else if (rect.top < end) {
          return 1
        } else {
          return (start - rect.top) / (start - end)
        }
      })

      setProgressList((prev) => {
        const hasChanged = prev.some((val, idx) => Math.abs(val - nextProgressList[idx]) > 0.005)
        return hasChanged ? nextProgressList : prev
      })
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  let activeEpoch = progressList.findIndex((p) => p < 0.99)
  if (activeEpoch === -1) {
    activeEpoch = trainingEpochs.length - 1
  }

  return (
    <div className="training-shell flex flex-col gap-10 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro
        eyebrow="career_model.fit(history)"
        title="Scroll the training run. Watch each role compile."
        copy="The terminal narrates the real work from each position, then generates its checkpoint card. Every line is grounded in my CV."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
        <div className="flex flex-col">
          {trainingEpochs.map((epoch, index) => {
            const progress = progressList[index] ?? 0
            const active = index === activeEpoch
            const isPresent = epoch.period.toLowerCase().includes("present")

            // Accomplishments streaming threshold inside card
            const numPointsToShow = Math.floor(progress * (epoch.points.length + 1))

            // Card highlight rules
            let cardStyle = "opacity-30 scale-[0.98] border-border"
            if (progress > 0) {
              if (isPresent) {
                cardStyle = "opacity-100 scale-100 border-green-500/30 bg-[#09110c]/75 shadow-lg shadow-green-500/5"
              } else {
                cardStyle = "opacity-100 scale-100 border-primary/40 bg-background/70 shadow-lg shadow-primary/5"
              }
            }

            return (
              <div
                key={`${epoch.company}-${epoch.role}`}
                ref={(node) => {
                  epochRefs.current[index] = node
                }}
                className="relative min-h-[32rem] py-6 flex flex-col justify-center"
              >
                {/* Rich Job Card (always visible, transitions style dynamically based on progress) */}
                <article
                  className={`epoch-card rounded-2xl border p-5 sm:p-7 transition-all duration-500 ease-out transform ${cardStyle} ${active ? "is-active" : ""} ${isPresent ? "is-present-role" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`epoch-index mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-all duration-500 ${
                        progress >= 0.99
                          ? isPresent
                            ? "border-green-500 text-green-400 animate-pulse"
                            : "border-primary text-primary animate-pulse"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {progress >= 0.99 ? <Check className="size-4" /> : String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
                        <p className={isPresent && progress > 0 ? "text-green-400 font-semibold" : "text-primary font-semibold"}>
                          Epoch {index + 1}/{trainingEpochs.length} · {progress >= 0.99 ? isPresent ? "Deployed (Prod)" : "Compiled" : active ? "Compiling..." : "Queued"}
                        </p>
                        <div className="flex flex-col items-end gap-1 shrink-0 select-none text-right">
                          <p className="text-white/90 font-bold tracking-normal">{epoch.period}</p>
                          {isPresent && progress > 0 && (
                            <div 
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-green-500/30 bg-green-500/10 font-bold uppercase tracking-wider text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.05)]"
                              style={{ 
                                fontFamily: "'Lucida Console', 'Consolas', 'Courier New', monospace",
                                fontSize: "8px"
                              }}
                            >
                              <span className="relative flex size-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex size-1.5 rounded-full bg-green-500"></span>
                              </span>
                              Live Production
                            </div>
                          )}
                        </div>
                      </div>
                      <h4 className="mt-5 text-balance text-xl font-semibold text-foreground sm:text-2xl">
                        {epoch.role}
                      </h4>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{epoch.company}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {epoch.location}
                        </span>
                      </div>
                      <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        what I learned, built, and delivered
                      </p>
                      <ul className="mt-4 flex flex-col gap-4">
                        {epoch.points.map((point, ptIdx) => {
                          const shown = ptIdx < numPointsToShow
                          return (
                            <li
                              key={point}
                              className={`flex gap-3 text-sm leading-relaxed transition-all duration-500 transform ${
                                shown
                                  ? "opacity-90 translate-x-0"
                                  : "opacity-0 -translate-x-4 pointer-events-none"
                              } sm:text-[15px]`}
                            >
                              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${isPresent && progress > 0 ? "bg-green-500" : "bg-primary"}`} />
                              <span>{point}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
        </div>
        <TrainingTerminal activeEpoch={activeEpoch} progressList={progressList} />
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

const activePaths = [
  { input: 0, hidden1: 0, hidden2: 1, output: 0 }, // DeepCrawl AI
  { input: 1, hidden1: 2, hidden2: 0, output: 1 }, // Quantum Matching
  { input: 2, hidden1: 1, hidden2: 3, output: 2 }, // Solar Forecasting
  { input: 3, hidden1: 4, hidden2: 2, output: 3 }, // Flower Classifier
  { input: 4, hidden1: 3, hidden2: 4, output: 4 }, // Dictionary App
]

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

export function ProjectsNetwork() {
  const [selectedName, setSelectedName] = useState(projects[0].name)
  const selectedProject = projects.find((project) => project.name === selectedName) ?? projects[0]
  const route = routes[selectedProject.name]

  const projectIdx = projects.findIndex((p) => p.name === selectedName)
  const path = activePaths[projectIdx] ?? activePaths[0]

  const activeInputIdx = path.input
  const activeHidden1Idx = path.hidden1
  const activeHidden2Idx = path.hidden2
  const activeOutputIdx = path.output

  // Layers coordinates
  const layer0X = 15
  const layer1X = 38
  const layer2X = 61
  const layer3X = 84

  const ys = [20, 35, 50, 65, 80]

  const inputNodes = ys.map((y, i) => ({ x: layer0X, y, label: ["Web pages", "Biological data", "Live weather", "Flower images", "Word queries"][i] }))
  const hidden1Nodes = ys.map((y, i) => ({ x: layer1X, y, label: ["Crawl + index", "Encode features", "Engineer signals", "Extract features", "Search records"][i] }))
  const hidden2Nodes = ys.map((y, i) => ({ x: layer2X, y, label: ["RAG / Supabase", "Qiskit / Streamlit", "Scikit-Learn", "MobileNetV2", "MySQL / Docker"][i] }))
  const outputNodes = ys.map((y, i) => ({ x: layer3X, y, label: ["DeepCrawl AI", "Quantum Matching", "Solar Forecasting", "Flower Classifier", "Dictionary App"][i] }))

  // Connections Layer 0 -> Layer 1
  const connections0to1 = inputNodes.flatMap((n0, i) =>
    hidden1Nodes.map((n1, j) => {
      const active = i === activeInputIdx && j === activeHidden1Idx
      return { key: `c01-${i}-${j}`, from: n0, to: n1, active }
    })
  )

  // Connections Layer 1 -> Layer 2
  const connections1to2 = hidden1Nodes.flatMap((n1, j) =>
    hidden2Nodes.map((n2, k) => {
      const active = j === activeHidden1Idx && k === activeHidden2Idx
      return { key: `c12-${j}-${k}`, from: n1, to: n2, active }
    })
  )

  // Connections Layer 2 -> Layer 3
  const connections2to3 = hidden2Nodes.flatMap((n2, k) =>
    outputNodes.map((n3, l) => {
      const active = k === activeHidden2Idx && l === activeOutputIdx
      return { key: `c23-${k}-${l}`, from: n2, to: n3, active }
    })
  )

  const allLines = [...connections0to1, ...connections1to2, ...connections2to3]

  return (
    <div className="network-shell flex flex-col gap-8 rounded-3xl border border-border bg-card p-5 backdrop-blur-md sm:p-8">
      <SectionIntro eyebrow="network.forward(projects)" title="Pick a project. Fire its neural pathway." copy="Five different problems, five distinct routes. Choose an output to see data transform into a working system." />

      <div className="project-selector grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Choose a project">
        {projects.map((project, index) => {
          const isActive = selectedName === project.name
          return (
            <button
              key={project.name}
              type="button"
              onClick={() => setSelectedName(project.name)}
              aria-pressed={isActive}
              className={`project-choice relative flex min-h-32 flex-col items-start justify-between gap-4 rounded-xl border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive ? "is-active border-primary/50 shadow-md shadow-primary/5 bg-[#1a120b]/30" : "border-border hover:border-muted-foreground/45"
              }`}
            >
              {isActive && (
                <span className="absolute top-3.5 right-3.5 flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
                </span>
              )}
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">OUTPUT {String(index + 1).padStart(2, "0")}</span>
              <span className="text-balance text-sm font-semibold text-foreground leading-snug">{project.name}</span>
              <span className="font-mono text-[9px] text-primary">{routes[project.name].cue} →</span>
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-black/45">
        {/* Graph Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-popover/40 px-5 py-3.5">
          <span className="flex items-center gap-2 font-mono text-xs text-foreground/90">
            <Network className="size-4 text-primary" />
            {selectedProject.name}.forward()
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-primary animate-pulse">
            <Zap className="size-3 text-primary" />
            signal activated
          </span>
        </div>

        {/* Neural Pathway Grid Panel */}
        <div key={selectedName} className="neural-grid network-stage relative min-h-[30rem] overflow-hidden p-6 sm:min-h-[33rem]">
          {/* Animated SVG Path Curves (Straightened lines) */}
          <svg className="absolute inset-0 hidden size-full sm:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {allLines.map((line) => (
              <path
                key={line.key}
                d={curvePath(line.from, line.to)}
                className={line.active ? "network-line is-active" : "network-line"}
                style={line.active ? { "--edge": 0 } as React.CSSProperties : {}}
              />
            ))}
          </svg>

          {/* Mobile Pathway: Vertical Sequence of Neurons */}
          <div className="network-route-mobile flex h-full flex-col items-stretch justify-center gap-4 sm:hidden">
            {[
              { type: "source data", value: route.source },
              { type: "hidden neuron 01", value: route.transforms[0] },
              { type: "hidden neuron 02", value: route.transforms[1] },
              { type: "engineering stack", value: route.tools },
              { type: "activated output", value: selectedProject.name }
            ].map((node, index, list) => (
              <div key={node.type} className="flex flex-col items-center gap-2">
                <div className="w-full flex items-center gap-4 rounded-xl border border-primary/20 bg-black/60 p-3.5">
                  <div className={`relative flex shrink-0 items-center justify-center rounded-full border-2 ${index === list.length - 1 ? "size-6 border-primary bg-primary/20" : "size-5 border-primary/60 bg-black"} shadow-md`}>
                    <span className={`rounded-full bg-primary animate-pulse ${index === list.length - 1 ? "size-2.5" : "size-1.5"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{node.type}</span>
                    <p className={`mt-0.5 text-xs font-semibold ${index === list.length - 1 ? "text-primary font-bold" : "text-white/95"}`}>{node.value}</p>
                  </div>
                </div>
                {index < list.length - 1 && (
                  <div className="flex flex-col items-center py-0.5">
                    <div className="w-0.5 h-4 border-l border-dashed border-primary/50" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Pathway: Fully Connected Neural Network Diagram */}
          <div className="hidden sm:block">
            {/* Column Headers */}
            <div className="absolute top-4 left-[15%] -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-primary/70 font-semibold select-none">Input Layer</div>
            <div className="absolute top-4 left-[38%] -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-primary/70 font-semibold select-none">Hidden Layer 1</div>
            <div className="absolute top-4 left-[61%] -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-primary/70 font-semibold select-none">Hidden Layer 2</div>
            <div className="absolute top-4 left-[84%] -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-primary/70 font-semibold select-none">Output Layer</div>

            {/* Input Nodes (Layer 0) */}
            {inputNodes.map((node, i) => {
              const active = i === activeInputIdx
              return (
                <div
                  key={`n0-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                      active
                        ? "size-5 border-2 border-primary bg-black shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                        : "size-4 border border-[#333] bg-[#0c0c0c]/85 opacity-30 group-hover:opacity-75"
                    }`}
                  >
                    {active && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <span
                    className={`absolute right-[140%] top-1/2 -translate-y-1/2 text-right whitespace-nowrap font-mono text-[9px] uppercase tracking-wider transition-opacity duration-300 ${
                      active
                        ? "opacity-100 text-white font-bold"
                        : "opacity-25 group-hover:opacity-75 text-muted-foreground pointer-events-none"
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
              )
            })}

            {/* Hidden 1 Nodes (Layer 1) */}
            {hidden1Nodes.map((node, i) => {
              const active = i === activeHidden1Idx
              return (
                <div
                  key={`n1-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                      active
                        ? "size-5 border-2 border-primary bg-black shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                        : "size-4 border border-[#333] bg-[#0c0c0c]/85 opacity-30 group-hover:opacity-75"
                    }`}
                  >
                    {active && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <span
                    className={`absolute left-[140%] top-1/2 -translate-y-1/2 text-left whitespace-nowrap font-mono text-[9px] uppercase tracking-wider transition-opacity duration-300 ${
                      active
                        ? "opacity-100 text-white font-bold"
                        : "opacity-25 group-hover:opacity-75 text-muted-foreground pointer-events-none"
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
              )
            })}

            {/* Hidden 2 Nodes (Layer 2) */}
            {hidden2Nodes.map((node, i) => {
              const active = i === activeHidden2Idx
              return (
                <div
                  key={`n2-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                      active
                        ? "size-5 border-2 border-primary bg-black shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                        : "size-4 border border-[#333] bg-[#0c0c0c]/85 opacity-30 group-hover:opacity-75"
                    }`}
                  >
                    {active && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <span
                    className={`absolute right-[140%] top-1/2 -translate-y-1/2 text-right whitespace-nowrap font-mono text-[9px] uppercase tracking-wider transition-opacity duration-300 ${
                      active
                        ? "opacity-100 text-white font-bold"
                        : "opacity-25 group-hover:opacity-75 text-muted-foreground pointer-events-none"
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
              )
            })}

            {/* Output Nodes (Layer 3) */}
            {outputNodes.map((node, i) => {
              const active = i === activeOutputIdx
              return (
                <div
                  key={`n3-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                      active
                        ? "size-6 border-2 border-primary bg-primary/20 shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse"
                        : "size-4 border border-[#333] bg-[#0c0c0c]/85 opacity-30 group-hover:opacity-75"
                    }`}
                  >
                    {active && <span className="size-2.5 rounded-full bg-primary" />}
                  </div>
                  <span
                    className={`absolute left-[140%] top-1/2 -translate-y-1/2 text-left whitespace-nowrap font-mono text-[9px] uppercase tracking-wider transition-opacity duration-300 ${
                      active
                        ? "opacity-100 text-primary font-bold"
                        : "opacity-25 group-hover:opacity-75 text-muted-foreground pointer-events-none"
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
              )
            })}

            {/* Mathematical Annotations (from requested image layout) */}
            <div className="absolute bottom-4 left-[15%] -translate-x-1/2 flex flex-col items-center font-mono text-[9px] text-muted-foreground/60 text-center select-none leading-tight">
              <span>Input</span>
              <span>[N, 5]</span>
            </div>
            <div className="absolute bottom-4 left-[38%] -translate-x-1/2 flex flex-col items-center font-mono text-[9px] text-muted-foreground/60 text-center select-none leading-tight">
              <span>W₁ [5, 5]</span>
              <span>f₁ (ReLU)</span>
            </div>
            <div className="absolute bottom-4 left-[61%] -translate-x-1/2 flex flex-col items-center font-mono text-[9px] text-muted-foreground/60 text-center select-none leading-tight">
              <span>W₂ [5, 5]</span>
              <span>f₂ (ReLU)</span>
            </div>
            <div className="absolute bottom-4 left-[84%] -translate-x-1/2 flex flex-col items-center font-mono text-[9px] text-muted-foreground/60 text-center select-none leading-tight">
              <span>W_o [5, 5]</span>
              <span>Output [N, 5]</span>
            </div>
          </div>
        </div>
      </div>

      <article key={selectedProject.name} className="project-detail rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-7" aria-live="polite">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">activated project · {route.cue}</p>
            <h4 className="mt-3 text-balance text-2xl font-semibold text-foreground sm:text-3xl">{selectedProject.name}</h4>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">{selectedProject.description}</p>
          </div>
          <BrainCircuit className="size-9 shrink-0 text-primary animate-pulse" aria-hidden="true" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {selectedProject.stack.map((tech) => (
            <span key={tech} className="rounded-md border border-border bg-background/70 px-2.5 py-1.5 font-mono text-[10px] text-foreground hover:border-primary/40 transition-colors">
              {tech}
            </span>
          ))}
        </div>
        <p className="mt-6 border-t border-border pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
          route: {route.source} → {route.transforms.join(" → ")} → {route.tools} → <span className="text-primary">{selectedProject.name}</span>
        </p>
      </article>
    </div>
  )
}
