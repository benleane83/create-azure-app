# “Startup Cloud”: FY26 Q3/Q4 Product Strategy and Roadmap 

**Owner:** Mandy Whaley, Nir Mashkowski\
**Contributors**: Mandy Whaley, Nir Mashkowski\
**Last Updated**: 2/3/2026\
**Status**: \[In Review\]

# Executive Summary

Startup Cloud is a proposed simplified Azure platform targeting the \$158B custom app market (by 2029) and the 180M+ developers who increasingly expect frictionless, AI-native cloud deployment. It addresses Azure's "last mile" problem—the complexity of getting working code into production—by providing an app-first experience where developers push code and get a running app with zero infrastructure decisions. The platform includes curated built-in primitives (database, storage, secrets, identity, observability), sub-second MicroVM cold starts, GitHub-native CI/CD, and AI-ready capabilities out of the box. A progressive pricing model (free tier → pay-per-execution → cheaper-at-scale) and a seamless "graduation path" to full Azure services ensure Startup Cloud can capture AI-native developers from competitors like Vercel and Cloudflare while retaining them as they scale.

| Element | Content |
|----|----|
| Status | \[On Track\] — Working on a prototype to accompany narrative doc |
| Top Win | Demo to be ready by 2/16 |
| Top Risk | Funding approval |
| Quality | n/a |
| Decision Needed | Approve next steps |
| Key Date | TBD |

Value Proposition\
==================

| Element | Content |
|----|----|
| Solution | A simplified Azure path: push code, get a running app. |
| Outcome | Public Preview acquisition and retention |
| Persona | AI Native developers |
| Insight | AI-Native developers don’t see Azure as a viable hosting platform. We need a simplified cloud platform offering. |
| Urgency | Competitors like Vercel, Cloudflare, and Supabase are rapidly capturing AI-native developers by offering the simplicity Azure lacks—and with 450 million of the next 500 million apps expected to be built by citizen developers who demand frictionless deployment, Azure risks losing this generation of builders entirely. The \$158B market opportunity by 2029 won't wait; every day of complexity pushes developers toward platforms that let them ship today. |

We believe **Startup Cloud** will enable **shipping production apps in minutes instead of weeks** for **AI-native developers building modern applications** because **they need curated primitives (compute, data, identity, observability) that "just work" rather than navigating Azure's complex maze of hundreds of services**. This is critical now because **competitors like Vercel and Supabase are capturing the 180M+ developer market with simpler platforms, and 450 million new apps will be built by citizen developers who will choose whichever cloud lets them ship fastest—representing a \$158B opportunity by 2029 that Azure cannot afford to cede**.

# Position

Over the past 18 months, cloud development has undergone a fundamental shift—applications now embed AI capabilities (reasoning, tool calling, memory) as standard components, and developers increasingly rely on agentic assistants to build and deploy. GitHub's developer population has surged past 180 million, with citizen developers projected to outnumber professionals 4:1 by late 2026, driving an expected 450 million new apps. Meanwhile, Azure has watched competitors like Vercel, Cloudflare, and Supabase capture this AI-native cohort by offering the frictionless "push code, get app" simplicity that Azure's enterprise-focused complexity cannot match. The headline: Azure is losing the next generation of developers to platforms that prioritize velocity over features—and a \$158B market opportunity by 2029 hangs in the balance.

2.1 Performance\
----------------

TBD until project is approved

| Milestone | Metric | Target | Actual | Delta | Learning |
|----|----|----|----|----|----|
| \[Launch/Feature\] | \[Metric name\] | \[Target\] | \[Actual\] | \[+/- %\] | \[One sentence insight\] |

*\[Examples: Milestone: "Public preview launch" \| Metric: "Design partners onboarded" \| Target: "30" \| Actual: "47" \| Delta: "+57%" \| Learning: "Enterprise demand stronger than modeled"\]*

2.2 Customer Signal\
--------------------

| Category | Customer Name / Segment | Direct Quote or Metric | What This Means for Roadmap |
|----|----|----|----|
| Pain Point | AI-native startups (CTOs, CEOs, Heads of Engineering) | "Testing/evals infrastructure, tool calling with MCP support, memory and state management—all converge on a common foundational requirement: lightweight, isolated, rapidly-instantiable compute" | Build MicroVM-based dev compute as foundational layer for isolated, pay-per-execution environments |
| Pain Point | Startup founders | "Onboarding is slow and fragmented, often requiring days or weeks of back-tracking across portals and services" | Create single, cohesive entry point with fast onboarding that "just works" on first contact |
| Pain Point | All segments | "Lack of cost clarity is a trust breaker and a blocker to production adoption" | Implement transparent pricing with daily visibility, cost forecasting, and clear credit burn tracking |
| Pain Point | AI-native developers | "Leading with .NET or introducing unfamiliar concepts early reinforces perceptions of Microsoft being complex or enterprise-only" | Prioritize Python and TypeScript as first-class experiences over .NET |
| Pain Point | Small teams | "Small teams need deployment automation without a platform team—they want repeatable dev/stage/prod pipelines" | Deliver GitHub-native CI/CD with "golden path" that works out of the box |
| Win | Developers familiar with Azure | "Foundry Apps is seen as a strong enabler for experimentation and a viable path to production—especially for teams already on or adjacent to Azure" | Validates positioning for greenfield projects and rapid experimentation |
| Win | App Service users | "67% use Monitoring, 52% Storage, 35% SQL Database, 31% Azure Table, 19% Key Vault, 19% Queues" | Validates canonical set of built-in services—ship these out of the box |
| Win | Developers | "Developers strongly value being able to build and test locally while connecting to cloud-hosted models" | Invest in strong local dev experience with smooth local-to-cloud workflow |
| Win | Competitor analysis (Render, Railway, Vercel) | "Modern platforms provide first-class support for preview environments and background workers without architectural gymnastics" | Build preview deployments per PR and native background worker support |
| Gap | AI builders | "Examples shown were widely seen as too basic—customers want real agentic behavior: multi-step workflows, tool usage, memory, and agents that act on behalf of users" | Ship compelling agentic demos beyond chat wrappers |
| Gap | AI startups | "Customers need clarity on which models are available, in which regions, with what quotas. Lack of visibility forces multi-region workarounds" | Provide clear AI model/GPU/region availability dashboard |
| Gap | Founders | "Most customers are not heavily invested in agent frameworks—early prompts to choose a framework create confusion rather than confidence" | Offer sensible defaults and guidance over forced framework choices |
| Gap | All segments | "As systems become distributed, founders want unified observability—logs, metrics, and debugging across services and regions" | Ship unified observability with OpenTelemetry from day one |
| Gap | All segments | "I just want to see more complex agents from the get-go. Like, I just think that this basic chat environment doesn't really cut it because you don't even need an agent." | Ship a set of Claude and Copilot CLI skills that interact with the platform (performs control and data plane activities) |
| Gap | Enterprise-adjacent startups | "Customers appreciate abstraction but expect easy region selection and clear 'break glass' path for deeper control when needed" | Build graduation path to full Azure with escape hatches for control |

*Source: "[Foundry Apps – Concept Testing Results](https://microsoft-my.sharepoint.com/:w:/p/irsmoke/IQBGQncrFoP0QKENKh6QZnJNASfwZCYkTOP1mXoxr59UWrw?e=AheDsr)" **Note:** “Foundry Apps” above refers to Startup Cloud.*

## 2.3 Competitive Analysis

| Competitor | Their Strength | Our Gap | Our Advantage | Trend |
|----|----|----|----|----|
| Vercel | Framework-defined Infrastructure (FdI) treats infrastructure as byproduct of application logic; evolved "Frontend Cloud" into comprehensive AI Cloud; best-in-class developer experience with sub-second deploys | No equivalent "push code, get app" simplicity; fragmented entry points across Azure services | Azure ecosystem depth; enterprise graduation path; native integration with GitHub Copilot and VS Code | ↑ Growing |
| Cloudflare | Massive global edge network (300+ cities); Workers AI for localized, low-latency inference; comprehensive adjacent services (R2, D1, KV, Queues, Vectorize); unlimited free bandwidth | No edge-first compute story; Azure CDN not integrated into dev workflow; no native vector database in simplified offering | Azure AI model breadth (OpenAI, Anthropic); enterprise security and compliance; SRE Agent for automated operations | ↑ Growing |
| Netlify | "Open," framework-agnostic alternative; seamless integration with AI agents and tools like Cursor; native form handling; unlimited team reviewers | Less opinionated approach may appeal to developers who find Azure too prescriptive | GitHub native with Copilot integration; stronger AI model access; enterprise-grade security | → Stable |
| Supabase | "Instant backends" with integrated Postgres, vector database, and Edge Functions; Supabase-like simplicity for data access cited as target experience | No integrated data layer in current Azure simplified offerings; developers must provision separate services | Azure database portfolio depth; global scale; compliance certifications | ↑ Growing |
| Railway | "Full-stack simplicity" with container-native environments; fast setup with templates; excellent developer-friendly UI; native Redis and Postgres plugins | No template-first onboarding; Azure portal complexity intimidates new developers | Enterprise features; graduation path to full Azure; broader service catalog | ↑ Growing |
| Render | Production-grade Postgres with HA, PITR, read replicas; modern architecture with first-class preview environments and background workers; transparent pricing | No integrated managed database in simplified tier; preview deployments require manual configuration | Azure scale and reliability; global presence; enterprise compliance | ↑ Growing |
| Fly.io | Native container support; global edge deployment; multi-region by default; WireGuard-based private networking; SSH access to instances | No micro-VM story for sub-second cold starts; ACA complexity for simple use cases | Broader service ecosystem; enterprise support; AI model access | → Stable |
| AWS Amplify | Full AWS service catalog access; Cognito for auth; comprehensive enterprise integration; mature CI/CD | AWS ecosystem lock-in and complexity similar to Azure's current challenge | GitHub/VS Code integration; Copilot-native development; simpler identity story planned | → Stable |

**Position Summary**: Azure is losing AI-native developers to simpler platforms like Vercel, Cloudflare, and Supabase that offer "push code, get app" experiences—Startup Cloud must match their simplicity while leveraging Azure's unique strengths in AI model access, enterprise graduation paths, and GitHub/Copilot integration.

# IDENTIFY 

# Strategy: Where Should We Invest?

**Investment Thesis:** To capture the \$158B custom app market by 2029 and win the 180M+ AI-native developer cohort, Azure must invest in a simplified "push code, get app" platform that matches competitor velocity while leveraging unique Microsoft advantages in AI models, GitHub integration, and enterprise graduation paths.

**Strategic Investment Priorities**

## Priority 1: Core App Platform (Critical Path)

**Investment Focus:** Deliver the foundational "last mile" experience that makes deploying apps to Azure dramatically simpler.

| Capability | Investment Rationale | Competitive Necessity |
|----|----|----|
| Zero-config deployment | Eliminates the complexity ceiling that drives developers to Vercel/Netlify | Table stakes |
| MicroVM compute | Sub-second cold starts match Cloudflare Workers; enables ephemeral PR environments | Differentiation |
| Integrated data layer | PostgreSQL, blob storage, and Redis built-in—no separate provisioning | Table stakes |
| GitHub-native CI/CD | Automatic pipelines from push to production; preview deployments per PR | Table stakes |
| Built-in identity | Simple auth for users and service-to-service communication | Table stakes |

## Priority 2: Developer Experience (Velocity Multiplier)

**Investment Focus:** Meet developers where they are with agentic, CLI-first workflows.

| Capability | Investment Rationale | Competitive Necessity |
|----|----|----|
| Copilot CLI | Agentic app creation and deployment via natural language | Differentiation |
| MCP-native primitives | All services exposed through MCP for agent-driven provisioning | Differentiation |
| Python/TypeScript first | First-class support for dominant AI-native tech stacks | Table stakes |
| Strong local dev experience | Build and test locally while connecting to cloud models | Table stakes |
| Templates & vibe coding | Curated starters on web portal; AI-assisted development | Differentiation |

## Priority 3: Observability & Operations (Trust Builder)

**Investment Focus:** Total transparency to build trust and enable rapid debugging.

| Capability | Investment Rationale | Competitive Necessity |
|----|----|----|
| Full-stack OpenTelemetry | Unified logs, metrics, and tracing across all services | Table stakes |
| Cost transparency | Daily visibility into spend; predictive cost warnings | Critical for startups |
| SRE Agent integration | Automated scaling, healing, and incident response | Differentiation |
| SSH access to instances | "Break glass" control when developers need it | Table stakes |

## Priority 4: AI-Ready Infrastructure (Future-Proofing)

**Investment Focus:** Native support for AI-powered app components.

| Capability | Investment Rationale | Competitive Necessity |
|----|----|----|
| Easy model access | Seamless integration with Azure OpenAI and third-party models | Differentiation |
| Secure tool execution | Sandboxed environments for MCP tool calling | Differentiation |
| State management | Memory and context persistence for agentic workflows | Emerging need |
| Model/GPU/region visibility | Clear dashboard showing availability and quotas | Table stakes |

## Capabilities for Product-Market Fit

## Must-Have for Launch (MVP)

These capabilities are required to achieve initial product-market fit with AI-native developers:

- **Push code → running app** with URL, SSL, and routing in under 60 seconds

- **Integrated PostgreSQL** with automated backups

- **Redis/KV storage** for caching and sessions

- **Blob storage** for files and assets

- **Secrets management** built-in

- **Environment variables** per environment (dev/staging/prod)

- **Preview deployments** for every PR

- **Build logs and runtime logs** accessible in real-time

- **GitHub integration** with automatic deployments on push

- **CLI tool** for local development and deployment

- **MCP support** for IDE and CLI integration

- **CLI Skills** for Copilot and Claude Code cli

## Should-Have for Growth

These capabilities drive retention and expansion:

- **Background workers** and cron job scheduling

- **Custom domains** with automatic SSL

- **Auto-scaling** based on traffic patterns

- **Team collaboration** with role-based access

- **Terraform provider** for IaC adoption

- **Web analytics** built-in

- **Image optimization** via CDN

- **Pricing** that is predictable and optimized for usage

## Could-Have for Differentiation

These capabilities create competitive moats:

- **SRE Agent** for automated operations

- **AI Gateway** for model routing and cost optimization

- **Vector database** for RAG applications

- **Workflow orchestration** for multi-step agent tasks

- **A/B testing** and feature flags

## 3.1 Personas and JTBD

| Persona | JTBD | Success Metric | \[Product\] Capability |
|----|----|----|----|
| AI-Native Developer (startup, 1-10 person team) | Deploy my AI-powered app to production without becoming an infrastructure expert | Deployment time \< 5 minutes; zero infrastructure decisions required | Zero-config deployment with URL, SSL, and routing out of the box |
| AI-Native Developer | Test and iterate on agentic workflows locally before deploying to cloud | Local-to-cloud workflow works seamlessly; no environment drift | Strong local dev experience with cloud model connectivity |
| AI-Native Developer | Add AI capabilities (chat, reasoning, tool use) to my app as easy components | AI features integrated in \< 1 hour; no separate infrastructure projects | Native model access and secure tool execution environments |
| Startup Founder / CTO | Understand exactly what I'm spending on cloud before I run out of credits | Daily cost visibility; predictive warnings before overage | Cost transparency dashboard with credit burn tracking |
| Startup Founder / CTO | Get my MVP to production fast so I can start getting customer feedback | Code to production in \< 1 day; repeatable deploys | Templates, vibe coding, and Copilot CLI for rapid scaffolding |
| Startup Founder / CTO | Set up dev/staging/prod environments without hiring a platform team | Environments created automatically; CI/CD works out of the box | GitHub-native pipelines with preview deployments per PR |
| Citizen Developer (business user building with AI) | Build and deploy an app using familiar tools without learning cloud infrastructure | App running in production using only Python/TypeScript; no Azure portal navigation | Python/TypeScript first-class support; plain-language onboarding |
| Citizen Developer | Get guidance on best practices without being forced to make decisions I don't understand | Sensible defaults applied; clear "why" explanations | Guidance over forced choices; opinionated security defaults |
| Small Team Engineer (2-10 engineers) | Add teammates with the right permissions without navigating multiple portals | Team member added in \< 2 minutes with correct access | Simple identity and RBAC in single cohesive entry point |
| Small Team Engineer | Debug production issues quickly without deep cloud expertise | Root cause identified in \< 30 minutes; unified view across services | Full-stack OpenTelemetry with unified logs, metrics, and tracing |
| Small Team Engineer | Run background jobs and scheduled tasks without architectural gymnastics | Cron job or worker running in \< 10 minutes | Native background workers and cron scheduling |
| Platform Engineer (scale-up, 20-100 person org) | Provide developers a fast path to production while maintaining security standards | Developers deploy independently; security policies enforced automatically | "Born secure" projects with pre-configured security and CI/CD |
| Platform Engineer | Have a clear path to enterprise Azure features as we scale | Migration to full Azure without rewriting core logic | Graduation path with same container images and data models |
| Platform Engineer | Use Infrastructure as Code that matches our startup constraints | IaC working in \< 1 day; no Terraform complexity required | Startup-friendly IaC with templates and MCP-native provisioning |

# Persona Deep Dives

## Persona 1: AI-Native Developer

**Who they are:** Developer building apps that incorporate AI capabilities (chat, reasoning, tool calling, memory) as natural components. Uses Python or TypeScript. Expects to use AI assistants (Copilot, Cursor) in the IDE to build, test, and deploy.

**Context:** Part of the 180M+ GitHub developer cohort; 80% engage with AI coding assistants in first week. Building approximately 450M of the 500M new apps expected by late 2026.

**Key frustrations today:**

- "Getting an app into Azure requires navigating a complex maze of services"

- "Leading with .NET reinforces perceptions of Microsoft being complex"

- "Examples shown were too basic—I want real agentic behavior"

**What success looks like:** Push code, get a running app with AI capabilities, without infrastructure decisions.

## Persona 2: Startup Founder / CTO

**Who they are:** Technical founder or early-stage CTO at a 2-15 person startup. Makes technology decisions. Extremely cost-conscious. Needs to move fast to find product-market fit.

**Context:** Represents the startup funnel that feeds directly into enterprise either as workforce or vendors.

**Key frustrations today:**

- "Onboarding is slow and fragmented, often requiring days or weeks"

- "Lack of cost clarity is a trust breaker"

- "I don't have a platform team—I need deployment automation that just works"

**What success looks like:** Idea to running production app in hours, not weeks, with clear cost visibility throughout.

## Persona 3: Citizen Developer

**Who they are:** Business user or non-traditional developer using AI to build applications. Projected to outnumber professional developers 4:1 by late 2026. 80% of tech products will be built by non-technology professionals.

**Context:** Fueled by democratization of coding through GenAI. May be "vibe-coding" founders with limited infrastructure expertise.

**Key frustrations today:**

- "Cloud and AI offerings are full of jargon I don't understand"

- "I'm prompted to choose frameworks before I understand the tradeoffs"

- "I need practical security guidance, not specialist documentation"

**What success looks like:** Build and deploy a working app using natural language and familiar tools, with the platform handling infrastructure complexity.

## Persona 4: Small Team Engineer

**Who they are:** Engineer at a startup or scale-up (2-50 person org) responsible for shipping features and maintaining production systems. No dedicated platform or DevOps team.

**Context:** Needs to be a generalist—frontend, backend, infrastructure, and operations.

**Key frustrations today:**

- "As systems become distributed, I can't diagnose issues quickly"

- "Simple identity and team access shouldn't require multiple portals"

- "I need repeatable pipelines without building them from scratch"

**What success looks like:** Ship features fast, debug issues faster, without becoming an infrastructure specialist.

## Persona 5: Platform Engineer

**Who they are:** Engineer at a scale-up (20-100+ person org) responsible for enabling developer productivity while maintaining security and compliance. Thinking about enterprise readiness.

**Context:** Evaluating whether to build internal platforms or adopt managed solutions. Concerned about lock-in but needs to move fast.

**Key frustrations today:**

- "Customers appreciate abstraction but expect a 'break glass' path for control"

- "We need to know there's a graduation path as we scale"

- "IaC shouldn't require full Terraform complexity early on"

**What success looks like:** Developers ship independently within guardrails; clear path to enterprise Azure when needed.

**Strategic Context:** We are prioritizing the AI-Native Developer and Startup Founder/CTO personas because they represent the entry point for the 180M+ developer cohort that will build 450 million new apps by late 2026—and they are actively being captured by competitors like Vercel, Cloudflare, and Supabase who offer the simplicity Azure lacks. By solving the "last mile" problem for these personas first, we create a high-velocity acquisition funnel that feeds the enterprise through two paths: startups that scale into enterprise customers (graduation path), and AI-native developers who enter the workforce already standardized on Microsoft tools. The Citizen Developer persona amplifies this strategy by expanding our addressable market 4x beyond professional developers, while Platform Engineers represent the retention and expansion motion—ensuring customers don't churn as they grow. This sequencing allows us to win developers at the moment of choice (greenfield projects), build trust through transparency, and capture long-term value through Azure's unique enterprise graduation advantage.

**3.2 Table Stakes Capabilities:\**

## Critical Capabilities Assessment

| \# | Capability | Current State | Gap to Close |
|----|----|----|----|
| 1 | Zero-config deployment (push code → running app with URL/SSL) | Missing | No unified "last mile" experience; developers navigate complex maze of compute, networking, identity services |
| 2 | Integrated data layer (PostgreSQL, Redis, blob storage built-in) | Missing | Developers must provision separate Azure services; no Supabase-like instant backend experience |
| 3 | GitHub-native CI/CD with automatic preview deployments per PR | Partial | GitHub Actions exists but requires manual setup; no "just works" pipeline with branch previews |
| 4 | Cost transparency with daily visibility and predictive warnings | Partial | Azure Cost Management exists but not startup-friendly; no credit burn tracking or proactive alerts |
| 5 | Unified observability (logs, metrics, tracing in single view) | Partial | Azure Monitor exists but fragmented across services; no OpenTelemetry-native unified experience |

## Why These Five

## 1. Zero-config deployment

**Blocking if missing:** Competitors (Vercel, Netlify, Railway) offer "push code, get app" in under 60 seconds. Research shows "the primary bottleneck for developers is the 'last mile' between having working code and running a production app on Azure." Without this, AI-native developers will not consider Azure.

## 2. Integrated data layer

**Blocking if missing:** 87% of App Service customers use storage (52%) or databases (35% SQL, 31% Table). Supabase's "instant backends" are a top reason startups choose them. Requiring separate service provisioning creates friction that drives developers to integrated competitors.

## 3. GitHub-native CI/CD with preview deployments

**Blocking if missing:** Every major competitor offers automatic deployments on push with preview URLs per PR. Small teams "need deployment automation without a platform team." Manual CI/CD setup is a trust breaker for the target persona.

## 4. Cost transparency

**Blocking if missing:** Research explicitly states "lack of cost clarity is a trust breaker and a blocker to production adoption." Startups cite this as their \#1 concern. Without daily visibility and predictive warnings, founders won't risk production workloads.

## 5. Unified observability

**Blocking if missing:** "As systems become distributed, founders want unified observability—logs, metrics, and debugging across services and regions—so they can diagnose issues quickly without deep cloud expertise." Fragmented monitoring prevents production adoption.

## What We Explicitly Deprioritized

The following capabilities are important but NOT table stakes for initial adoption:

| Capability | Rationale for De-prioritization |
|----|----|
| Multi-region deployment | Important for scale, not for initial adoption |
| SSO/SAML | Enterprise feature; startups use simpler auth first |
| AI Gateway / Vector DB | Differentiator, not blocker; developers can integrate external AI services |
| Background workers / Cron | High value but developers can work around initially |
| SRE Agent automation | Differentiator for retention, not acquisition |

## Validation Criteria

Each capability is validated as "complete" when:

| \# | Capability | Validation Criteria |
|----|----|----|
| 1 | Zero-config deployment | New user deploys app from GitHub repo in \< 5 minutes with zero portal navigation |
| 2 | Integrated data layer | App connects to managed Postgres, Redis, and blob storage without separate provisioning steps |
| 3 | GitHub-native CI/CD | Push to branch automatically creates preview deployment with shareable URL |
| 4 | Cost transparency | User sees current spend, projected spend, and receives warning before exceeding threshold |
| 5 | Unified observability | User views logs, metrics, and traces for all services in single dashboard |

## 3.3 Differentiators: Why Microsoft can Win

## Strategic Differentiators

| \# | Capability | Persona Served | Why We Win | Evidence |
|----|----|----|----|----|
| 1 | Native AI model access with integrated tool execution | AI-Native Developer, Startup Founder/CTO | Only platform with seamless access to Azure OpenAI, Anthropic, and first-party models combined with secure MicroVM sandboxes for MCP tool calling—competitors require multi-vendor integrations | AI-native engineering leaders cited "tool calling with MCP support" and "multi-model orchestration" as top unmet needs; 178% YoY growth in LLM SDK repositories |
| 2 | GitHub + Copilot agentic development workflow | AI-Native Developer, Citizen Developer | Only platform offering end-to-end agentic experience from IDE to cloud—Copilot CLI for natural language deployment, MCP-native primitives, and VS Code integration that competitors cannot replicate | 80% of new developers engage with AI coding assistants in first week; GitHub has 180M+ users; research shows developers expect "agentic dev experience in IDE or CLI to build, test, and deploy" |
| 3 | Enterprise graduation path with SRE Agent | Platform Engineer, Startup Founder/CTO | Only simplified platform architected natively on Azure with seamless transition to full enterprise controls—same container images, data models, and compliance certifications; automated operations via SRE Agent that no competitor offers | Research shows customers "appreciate abstraction but expect clear path for deeper control"; 20% of startups on simplified platforms churn when hitting scale limits on competitors |

## Why These Three

## 1. Native AI Model Access + Tool Execution

**Unique advantage:** Vercel has AI SDK but limited model access. Cloudflare has Workers AI but no enterprise models. Supabase has no AI story. Only Microsoft can offer:

- Azure OpenAI (GPT-4, o1, o3)

- Anthropic Claude via Azure

- First-party models (Phi, etc.)

- Secure MicroVM sandboxes for tool execution

**Persona fit:** AI-Native Developers building agentic apps need multi-model orchestration and secure execution environments for MCP tool calling—this is their \#1 unmet need per interviews.

## 2. GitHub + Copilot Agentic Workflow

**Unique advantage:** Microsoft owns GitHub (180M+ developers) and Copilot. No competitor can offer:

- Copilot CLI for natural language "create and deploy"

- MCP-native primitives for agent-driven provisioning

- VS Code deep integration

- GitHub-native CI/CD with Copilot-assisted debugging

**Persona fit:** 80% of new developers use AI assistants in their first week. Citizen Developers (4:1 ratio vs. professionals) need natural language interfaces. This is where developer journeys start.

## 3. Enterprise Graduation Path + SRE Agent

**Unique advantage:** Vercel, Cloudflare, and Supabase are destinations, not pathways. Only Startup Cloud offers:

- Same container images work in full Azure

- Same data models, no migration required

- Full Azure compliance (SOC 2, HIPAA, PCI DSS, FedRAMP)

- SRE Agent for automated scaling, healing, and incident response

**Persona fit:** Platform Engineers need confidence that choosing Startup Cloud doesn't create a dead-end. Founders need to know they won't have to re-platform at Series B.

## What We Explicitly Did NOT Bet On

| Potential Differentiator | Why Not a Bet |
|----|----|
| Edge computing / global network | Cloudflare's 300+ city edge network is unassailable; we compete on AI, not latency |
| Lowest price | Race to bottom; we win on value and graduation path, not cost |
| Framework-defined infrastructure | Vercel owns this with Next.js; we win with model-defined infrastructure via MCP |
| Built-in forms / CMS | Niche features; not where AI-native developers differentiate |

## Evidence Summary

| Signal | Source | Implication |
|----|----|----|
| 178% YoY growth in LLM SDK repos | GitHub Octoverse 2025 | AI-native apps are the growth vector |
| 80% of new devs use AI assistants in first week | GitHub Blog Dec 2025 | Copilot integration is where journeys start |
| 180M+ developers on GitHub | GitHub Octoverse 2025 | Owned distribution channel |
| "Tool calling with MCP support" as top gap | AI-native leader interviews | Model access + execution is unmet need |
| "Break glass path for deeper control" | Customer research | Graduation path matters for production adoption |
| 450M apps by citizen developers | Gartner 2026 | Natural language interfaces expand TAM 4x |

# Success Metrics

**Note:** metrics below are aspirational depending on project greenlight.

| Metric                               | Current | Q3 Target | Q4 Target | Owner |
|--------------------------------------|---------|-----------|-----------|-------|
| Primary – Public Preview Adoption    | *N/A*   | *N/A*     | *N/A*     | TBD   |
| Secondary – Public Preview Retention | *N/A*   | *N/A*     | *N/A*     | *TBD* |
| Counter – Revenue                    | *N/A*   | *N/A*     | *N/A*     | *TBD* |

**Metric Rationale**: Assuming the project gets approved, we will focus on adoption for top of funnel customers (validating that there is interest in the product) and once we have customers we will focus on retention (validating that customers find value in the product).

# EXECUTE 

# Execution

**Approach:** We want to create a unique, new service experience for developers who are building apps. To do that we will focus on an end-to-end experience, making sure the backend is thought through together with the developer experience to improve performance and ease-of-use. We also acknowledge that getting started is a unique feature and that it is critical to nail the top of the funnel experience all the way from marketing to docs to free offer to deploying a first app.

## 5.1 Workstreams:

**Note:** Below workstreams are a suggestion only based on what we know right now and are subject to change if the project gets greenlit. **\**

<table>
<colgroup>
<col style="width: 23%" />
<col style="width: 13%" />
<col style="width: 24%" />
<col style="width: 21%" />
<col style="width: 16%" />
</colgroup>
<thead>
<tr>
<th>Workstream</th>
<th>PM Owners</th>
<th>Objective</th>
<th>Key Deliverable</th>
<th>Ship Date</th>
</tr>
</thead>
<tbody>
<tr>
<td>Core Infra</td>
<td><em>TBD</em></td>
<td><em>MicroVM based data plane is ready</em></td>
<td>Compute-unit CRUD works</td>
<td><em>TBD</em></td>
</tr>
<tr>
<td>Deployment</td>
<td><em>TBD</em></td>
<td><em>Apps can be deployed and published</em></td>
<td>Select set of apps can be deployed at competitive duration</td>
<td><em>TBD</em></td>
</tr>
<tr>
<td>Control plane</td>
<td><em>TBD</em></td>
<td><em>Public API exists to consume the platform</em></td>
<td><em>Control plane MCP / API (including monitoring)</em></td>
<td><em>TBD</em></td>
</tr>
<tr>
<td>Developer Experience</td>
<td><em>TBD</em></td>
<td><em>High quality, delightful developer experience</em></td>
<td><p><em>Ephemeral development environment</em></p>
<p><em>Full end-to-end cycle available through Copilot CLI and VS Code</em></p></td>
<td><em>TBD</em></td>
</tr>
</tbody>
</table>

## **Note: Removed roadmap sections (5.2 – 6.0 pending project greenlight)** 

Constraints\
============

**Risk Posture**: We have a couple of risk categories for the Startup Cloud proposal. One is the overall speed of AI tech and standards, even though some of the dynamics of cloud computing has been well understood, we know iterations will be faster moving forward. Secondly, the product branding and positioning has to be devised as we need to weigh several branding, pricing and positioning options.

6.1 Risks\
N/A pending project greenlight
------------------------------

## 6.2 Dependencies

N/A pending project greenlight\
\
6.3 Underfunded
-------------------------------

N/A pending project greenlight\
-------------------------------

6.4 Non-Goals/Out-of-scope\
---------------------------

| Area | Rationale | Revisit Trigger |
|----|----|----|
| Matching App Service feature set | App Service has a rich feature set that is not necessarily needed. We want to learn from current customers. | Large number of customers attempting to move from App Service to Startup cloud. |
| Exposing Azure | Our goal is to avoid the complexity of Azure and provide a clean, modern experience. | Large demand from Startup Cloud customers to expose Azure/ |
| Multi-Cloud | We are building the startup cloud to increase attach to Microsoft properties by providing a frictionless entry point | Community interest and business model that would justify supporting other clouds |
|  |  |  |

# 7. Quality

**N/A pending project greenlight**

8. Decisions Needed\
====================

**N/A pending project greenlight**

## 

## Appendix A – Reference Information 

| Source | Link |
|----|----|
| Gartner Forecast Analysis: AI Services, Worldwide (2025) | [<u>Gartner</u>](https://www.gartner.com/en/documents/forecast-analysis) |
| GitHub Octoverse 2025 Report | [<u>GitHub Blog</u>](https://github.blog/) |
| Foundry Apps - Concept Testing Results | [<u>SharePoint</u>](https://microsoft-my.sharepoint.com/:w:/p/irsmoke/IQBGQncrFoP0QKENKh6QZnJNASfwZCYkTOP1mXoxr59UWrw?e=GPomDL) |
| SDC Needs and Tech Stacks Research | [<u>SharePoint</u>](https://microsoft-my.sharepoint.com/:w:/p/kipierce/IQDH3-lh33eCTYz76UlPz36HAT5UOIxVFB9xnU2qafiNQmk?e=c3recb) |
| Stack Overflow Developer Survey 2025 | [<u>Stack Overflow</u>](https://stackoverflow.com/survey) |
| JetBrains State of Developer Ecosystem 2025 | [<u>JetBrains</u>](https://www.jetbrains.com/lp/devecosystem-2025/) |
| Making Software Like LEGO (Aspire) | [<u>Medium</u>](https://medium.com/@davidfowl) |
| What is SST | [<u>SST</u>](https://sst.dev/) |
