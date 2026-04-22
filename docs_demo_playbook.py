from fpdf import FPDF
from datetime import datetime, timezone

output = '/root/projects/providerpilot/ProviderPilot_Interview_Demo_Playbook.pdf'

class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(30,30,30)
        self.cell(0, 8, 'ProviderPilot — Interview Demo Playbook (Wonderschool)', 0, 1, 'L')
        self.set_draw_color(210,210,210)
        self.line(10, 18, 200, 18)
        self.ln(3)

    def footer(self):
        self.set_y(-12)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(120,120,120)
        self.cell(0, 8, f'Page {self.page_no()}', 0, 0, 'C')

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()

# Title block
pdf.set_font('Helvetica', 'B', 20)
pdf.set_text_color(15,15,20)
pdf.multi_cell(0, 10, 'ProviderPilot\nInterview Demo Playbook', align='L')
pdf.ln(1)
pdf.set_font('Helvetica', '', 11)
pdf.set_text_color(70,70,70)
now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
pdf.multi_cell(0, 6, f'Prepared for: Wonderschool Interview\nPresenter: Adriano Viera dos Santos\nVersion: 1.0\nGenerated: {now}')
pdf.ln(3)

pdf.set_font('Helvetica', 'B', 12)
pdf.set_text_color(25,25,25)
pdf.cell(0, 7, 'Presentation Intent', ln=1)
pdf.set_font('Helvetica', '', 11)
pdf.set_text_color(40,40,40)
pdf.multi_cell(0, 6,
"Show a reliable, production-minded autonomous onboarding system that solves a real provider licensing bottleneck across multiple states. "
"The tone should be direct, calm, and technical: no hype, no theatrics, no hand-waving.")

sections = [
("1) 30-Second Opening Script",
"Hi, I am Adriano. This is ProviderPilot — a 40-agent onboarding factory for home-based childcare providers. "
"The system takes one intake and executes a full pipeline: state routing, document extraction, compliance check, form prefill, confidence gating, and human escalation. "
"I built this as an interview-grade, observable system to show reliability engineering under non-deterministic model behavior."),

("2) Architecture You Should Show On Screen",
"Layer 1 (Frontend): Next.js UI with intake, live status timeline, review queue, and org chart view.\n"
"Layer 2 (Orchestration): Paperclip company model with executive, VP, state director, specialist, and validator roles.\n"
"Layer 3 (Runtime): OpenClaw-integrated backend + model calls + PostgreSQL tracking + streaming updates.\n\n"
"Key point to say: This is not just a chat workflow; it is an operational control plane with ownership, escalation, and visibility."),

("3) 4-Minute Live Demo Script (Minute-by-Minute)",
"Minute 0-1: Open the homepage and explain the objective in one sentence.\n"
"Minute 1-2: Submit a provider intake (Texas or California).\n"
"Minute 2-3: Open status page and narrate the execution timeline: CEO -> VP -> State Director -> 4 parallel specialists -> ConfidenceGate -> CostMonitor.\n"
"Minute 3-4: Open Paperclip and show generated tasks for the same onboarding; then show review queue behavior if confidence is below threshold.\n\n"
"Close line: The value is controlled autonomy — high-throughput automation with explicit guardrails."),

("4) Reliability Talking Points (Use These Exact Ideas)",
"- Independent confidence gate: specialist outputs are scored by a separate judge profile, not self-reported confidence.\n"
"- Human-in-the-loop threshold: below 0.90 confidence routes to review queue.\n"
"- Retry discipline: specialist calls retry with backoff before degraded fallback.\n"
"- Deterministic audit trail: every step stored with timestamps, outputs, tokens, and cost estimate.\n"
"- State-aware context: specialists receive state-specific regulatory knowledge, not generic prompts."),

("5) Expected Interview Questions + Strong Answers",
"Q: Why 40 agents?\n"
"A: To mirror production-scale organizational coordination and failure surfaces. In production, I would collapse roles where evals show no quality lift.\n\n"
"Q: Is this over-engineered?\n"
"A: It is intentionally structured to demonstrate control, governance, and observability at scale. The architecture supports simplification by measurement, not opinion.\n\n"
"Q: What are current limitations?\n"
"A: Full model isolation and complete Paperclip issue-state mutation APIs are still maturing. I mitigated that by enforcing explicit backend traces and queue-based escalation."),

("6) Cold, Honest Trade-Off Statement",
"This system optimizes interview-relevant clarity: explicit execution graph, measurable reliability patterns, and state-specific compliance reasoning. "
"It is not pretending to be fully enterprise-complete. Where interfaces are immature, the design exposes that honestly and isolates risk instead of hiding it."),

("7) Production-Readiness Checklist (Say What You Would Do Next)",
"- Add auth + RBAC for all operator surfaces\n"
"- Add signed webhooks and idempotency keys for mutating endpoints\n"
"- Add formal eval dashboard with threshold sweeps and regression deltas\n"
"- Add queue-backed execution workers for horizontal scale\n"
"- Add SLO dashboards (p95 latency, failure rate, queue depth, cost per onboarding)\n"
"- Add policy tests for cross-state compliance regressions"),

("8) Final 20-Second Closing Script",
"ProviderPilot demonstrates one thing clearly: autonomous systems are only useful when they are observable, governable, and recoverable. "
"I focused on that foundation first — then built the UX so operators can trust what the agents are doing in real time.")
]

for title, body in sections:
    pdf.ln(2)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(20,20,20)
    pdf.multi_cell(0, 7, title)
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(45,45,45)
    pdf.multi_cell(0, 6, body)

# Appendix page
pdf.add_page()
pdf.set_font('Helvetica', 'B', 13)
pdf.set_text_color(20,20,20)
pdf.cell(0, 8, 'Appendix A — Demo Run Checklist (Operational)', ln=1)
pdf.set_font('Helvetica', '', 11)
checklist = [
"1. Open: https://providerpilot.adrianovs.net",
"2. Submit one onboarding intake (TX or CA)",
"3. Open live status page and verify 9-step pipeline progression",
"4. Verify ConfidenceGate score and review-queue behavior",
"5. Open Paperclip dashboard and show generated onboarding tasks",
"6. Show metrics dashboard (completed vs review-needed, token/cost trends)",
"7. Conclude with trade-offs and next production steps"
]
for item in checklist:
    pdf.multi_cell(0, 7, f'- {item}')

pdf.ln(4)
pdf.set_font('Helvetica', 'B', 12)
pdf.cell(0, 8, 'Appendix B — Messaging Style Guide', ln=1)
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6,
"Speak like an engineer, not a marketer.\n"
"Use short, concrete statements.\n"
"Name limitations before they are discovered.\n"
"Tie every design choice to reliability, operator trust, and measurable outcomes.")

pdf.output(output)
print(output)
