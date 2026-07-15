import { GraduationCap, Mail, Phone } from "lucide-react"

/* lucide v1 dropped brand marks, so we ship small inline brand SVGs. */
function Github({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7 0-.7 0-.7 1.2 0 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.5-.3-5.2-1.3-5.2-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.2 5.7.4.3.8 1 .8 2.1v3.1c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  )
}
function Linkedin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33 0-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}
import { certifications, education, highlights, profile, skills } from "@/lib/resume"
import { TypedCode } from "@/components/typed-code"
import { ExperienceNetwork, ProjectsNetwork } from "@/components/neural-network-sections"

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-10 flex items-baseline gap-4">
      <span className="font-mono text-sm text-muted-foreground/60">{index}</span>
      <h2 className="text-pretty font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        <span className="text-primary">{title}</span>
        <span className="text-muted-foreground/60">()</span>
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

/* A frosted panel that lets the fluid glow bleed through subtly. */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-[92vh] flex-col justify-center py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: intro copy */}
        <div>
          <p className="mb-5 font-mono text-sm text-primary">
            <span className="text-muted-foreground/60">$</span> whoami
          </p>
          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            {profile.name}
          </h1>
          <p className="mt-3 font-mono text-xl font-medium text-primary sm:text-2xl">
            {profile.title}
          </p>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            {profile.tagline}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-mono text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              <Mail className="size-4" />
              get_in_touch
            </a>
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 font-mono text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Github className="size-4" />
              GitHub
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 font-mono text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Linkedin className="size-4" />
              LinkedIn
            </a>
          </div>
        </div>

        {/* Right: typed code terminal */}
        <TypedCode />
      </div>

      <dl className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {highlights.map((h) => (
          <Panel key={h.label} className="p-5">
            <dt className="font-mono text-3xl font-bold text-primary">{h.value}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.label}</dd>
          </Panel>
        ))}
      </dl>
    </section>
  )
}

function Experience() {
  return (
    <section id="experience" className="py-20">
      <SectionHeading index="01." title="Experience" />
      <ExperienceNetwork />
    </section>
  )
}

function Projects() {
  return (
    <section id="projects" className="py-20">
      <SectionHeading index="02." title="Projects" />
      <ProjectsNetwork />
    </section>
  )
}

function Skills() {
  return (
    <section id="skills" className="py-20">
      <SectionHeading index="03." title="Skills" />
      <div className="grid gap-5 sm:grid-cols-2">
        {skills.map((skill) => (
          <Panel key={skill.group} className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
              {skill.group}
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {skill.items.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </section>
  )
}

function Education() {
  return (
    <section id="education" className="py-20">
      <SectionHeading index="04." title="Education & Certifications" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          {education.map((edu) => (
            <Panel key={edu.school} className="p-6">
              <div className="flex items-start gap-4">
                <GraduationCap className="mt-0.5 size-6 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">{edu.school}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{edu.degree}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {edu.detail ? `${edu.detail} · ` : ""}
                    {edu.period} · {edu.location}
                  </p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
        <Panel className="p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Certifications
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {certifications.map((cert) => (
              <li key={cert} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{cert}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground/70">{"// what's next?"}</p>
      <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Let&apos;s build something
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
        I&apos;m actively looking for early-career software and machine learning engineering
        roles. If you have an opportunity or just want to talk shop, my inbox is open.
      </p>
      <a
        href={`mailto:${profile.email}`}
        className="mt-10 inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 font-mono text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
      >
        <Mail className="size-4" />
        say_hello()
      </a>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
        <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 hover:text-primary">
          <Mail className="size-4" /> {profile.email}
        </a>
        <span className="inline-flex items-center gap-2">
          <Phone className="size-4" /> {profile.phone}
        </span>
      </div>
    </section>
  )
}

export default function Portfolio() {
  return (
    <main className="relative mx-auto max-w-6xl px-6">
      <Hero />
      <Experience />
      <Projects />
      <Skills />
      <Education />
      <Contact />
      <footer className="border-t border-border py-8 text-center font-mono text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {profile.name}
      </footer>
    </main>
  )
}
