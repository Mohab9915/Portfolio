export const profile = {
  name: "Mohab Haedarea",
  title: "AI & Software Engineer",
  tagline:
    "I build production LLM systems — voice agents, RAG pipelines, and multi-agent platforms — and the full-stack infrastructure that ships them.",
  email: "mohabhae9915@gmail.com",
  phone: "+970 59 829 6208",
  linkedin: "https://linkedin.com/in/mohab-haidaria",
  github: "https://github.com/Mohab9915",
}

export const highlights = [
  { value: "22%", label: "profit increase from a conversational commerce agent" },
  { value: "80%", label: "lower staffing costs via AI automation" },
  { value: "50%", label: "performance speedup from an infra migration" },
  { value: "6+", label: "AI/software engineering roles across the stack" },
]

export interface ExperienceItem {
  company: string
  location: string
  role: string
  period: string
  points: string[]
}

export const experience: ExperienceItem[] = [
  {
    company: "ASAL Technologies",
    location: "Palestine",
    role: "AI Software Engineer",
    period: "May 2026 – Present",
    points: [
      "Built a modular Arabic (Palestinian/Jordanian dialect) Voice AI agent for car leasing using Pipecat, with custom pipeline components, type-safe configs, and real-time audio transport.",
      "Engineered low-latency voice pipeline processors for smooth, responsive conversational flow.",
      "Built a web portal and WhatsApp chatbot integration for lease inquiries, pricing, documents, and real-time sync.",
      "Built a DSPy pipeline to migrate prompts from GPT-4 to Grok, Gemini, and Llama using Bayesian search (MIPROv2) and genetic mutation (GEPA) to prevent output regressions.",
    ],
  },
  {
    company: "PalTech Hub",
    location: "Remote",
    role: "AI Engineer — Part Time",
    period: "Sep 2025 – Present",
    points: [
      "Built a multi-tenant AI customer-service platform integrating Facebook, Instagram, and WhatsApp with e-commerce backends, featuring multi-agent orchestration and semantic search via Qdrant.",
      "Built AI tools to auto-generate high-converting product summaries and translate product pages into any language.",
      "Built a multi-modal RAG chatbot (LlamaIndex, Qdrant, Gemini) to guide employees through HR procedures.",
    ],
  },
  {
    company: "Fawri",
    location: "Palestine",
    role: "Backend & AI Engineer",
    period: "Aug 2025 – May 2026",
    points: [
      "Built an e-commerce conversational agent for human-like interaction and order processing — a 22% profit increase and 80% lower staffing costs.",
      "Unified Facebook, Instagram, and WhatsApp messaging with in-house order processing.",
      "Led a systems migration achieving a 50% performance speedup and 70% lower operating costs.",
      "Cut manual data entry by 80% with a custom vendor scraper and built an AI ad-bidding optimization system.",
    ],
  },
  {
    company: "Co. Te. De.",
    location: "Remote",
    role: "Backend Developer Intern",
    period: "Jul – Oct 2025",
    points: [
      "Assisted in building scalable APIs, optimizing backend performance, and writing maintainable code using modern frameworks.",
    ],
  },
  {
    company: "Partners for Development & USAID",
    location: "Palestine",
    role: "AI Engineer Trainee",
    period: "Nov 2024 – Jan 2025",
    points: [
      "Developed and tested real-world AI proof-of-concepts using TensorFlow and PyTorch to support organizational development goals.",
    ],
  },
  {
    company: "Manipal Institute of Technology",
    location: "India",
    role: "AI Intern",
    period: "Jul – Sep 2024",
    points: [
      "Developed solar energy forecasting models on real-world datasets using Random Forests, SVMs, Linear Regression, and Gradient Boosting.",
    ],
  },
]

export interface ProjectItem {
  name: string
  stack: string[]
  description: string
}

export const projects: ProjectItem[] = [
  {
    name: "DeepCrawl AI",
    stack: ["Python", "FastAPI", "React", "Supabase", "RAG"],
    description: "AI-powered web crawler with a RAG chatbot interface to interact with scraped data.",
  },
  {
    name: "Quantum Matching",
    stack: ["Python", "Qiskit", "Streamlit"],
    description: "Applied quantum techniques to biological data matching.",
  },
  {
    name: "Solar Forecasting",
    stack: ["Python", "Scikit-Learn"],
    description: "ML model predicting solar power production from real-time weather data.",
  },
  {
    name: "Flower Classifier",
    stack: ["TensorFlow", "MobileNetV2"],
    description: "Fine-tuned image classifier for flower species identification.",
  },
  {
    name: "Dictionary App",
    stack: ["PHP", "MySQL", "Docker", "Jenkins"],
    description: "Web app with a full CI/CD pipeline and containerized deployment.",
  },
]

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["Python", "SQL", "JavaScript", "TypeScript", "Java", "C++"] },
  {
    group: "AI & LLM Engineering",
    items: [
      "DSPy",
      "LlamaIndex",
      "Pipecat",
      "Qdrant",
      "RAG Pipelines",
      "Multi-Agent Orchestration",
      "TensorFlow",
      "PyTorch",
      "Scikit-Learn",
      "OpenCV",
      "Pandas",
      "NumPy",
    ],
  },
  {
    group: "Web Development",
    items: ["FastAPI", "React", "Node.js", "PHP", "MySQL", "Supabase", "HTML/CSS"],
  },
  { group: "DevOps & Cloud", items: ["Docker", "GitHub Actions", "Microsoft Azure", "CI/CD"] },
  {
    group: "Other",
    items: ["Streamlit", "Matplotlib", "Qiskit", "Linux (Ubuntu Server Admin)"],
  },
]

export const education = [
  {
    school: "An-Najah National University",
    location: "Nablus, PS",
    degree: "B.Sc. in Computer Science",
    detail: "GPA: 3.22",
    period: "2021 – 2025",
  },
  {
    school: "Udacity & Google (Palestine Launchpad)",
    location: "Remote",
    degree: "AI Programming & Data Analyst Nanodegrees",
    detail: "",
    period: "2024 – 2025",
  },
]

export const certifications = [
  "Microsoft Certified: Azure Fundamentals (2025)",
  "AI Programming with Python Nanodegree — Udacity/Google/Spark (2025)",
  "Data Analyst Nanodegree — Udacity/Google (2025)",
]
