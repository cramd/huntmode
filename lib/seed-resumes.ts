import type { ResumeCategory } from "./types";

export interface SeedResume {
  name: string;
  category: ResumeCategory;
  sections: {
    summary: string;
    experience: string;
    skills: string;
    education: string;
    certifications?: string;
  };
}

export const SEED_RESUMES: SeedResume[] = [
  // ── Version 1: Technical GTM & Product Marketing Focus ──
  {
    name: "Technical GTM & Product Marketing",
    category: "gtm",
    sections: {
      summary: `Growth and GTM leader with over a decade of experience scaling technical B2B SaaS and infrastructure products through product-led growth (PLG) and lifecycle automation. A proven 0→1 builder who specializes in translating complex technical platforms and LLM capabilities into clear, high-converting product narratives and commercial outcomes. Combines analytical rigor with hands-on execution across funnel optimization and cross-functional leadership alongside engineering teams to drive AI adoption.`,
      experience: `**HoneOSS** | Vancouver, BC
*Founder & PLG Strategist* | Jan 2026–Present
- Advise B2B SaaS organizations on product-led growth (PLG) strategy, top-of-funnel conversion optimization, and technical-to-commercial product positioning.
- Founded a strategic consultancy operating with a 0→1 mentality to help technical and open-source platforms improve monetization and scale toward $10M+ ARR.
- Develop and implement monetization frameworks that convert high-usage developer communities into sustainable recurring revenue (Net ARR) without disrupting initial user adoption.

**Victoria Metrics**
*Technical Marketing & PLG Specialist* | Nov 2024–Feb 2026
- Translated complex infrastructure capabilities into simplified, verticalized product narratives and case studies for commercial enterprise buyers.
- Owned and managed core PLG initiatives focused on top-of-funnel activation, trial expansion, user onboarding, and continuous conversion optimization.
- Designed, tested, and deployed AI-powered automation workflows that significantly reduced manual operational tasks and improved overall GTM efficiency.

**Docker, Inc.**
*Senior Technical GTM Manager, AI/ML* | Jan 2023–Jul 2024
- Served as the primary AI/ML subject matter expert, supporting executive leadership in defining product GTM strategy and emerging technology positioning.
- Developed highly targeted enterprise case studies and technical marketing content for strategic ecosystem partners, including IKEA.
- Bridged the gap between engineering and sales by translating complex developer infrastructure concepts into commercially effective adoption strategies.

**Oracle**
*Global Solutions Manager, Open Source Services* | Sep 2021–Sep 2022
- Led global GTM launch initiatives and product positioning for OpenSearch and Data Lake services on Oracle Cloud Infrastructure (OCI).
- Drove cross-functional alignment across technical enablement and product marketing to scale enterprise customer adoption strategies.

**MariaDB (SkySQL)**
*North American Marketing Manager* | Jan 2013–May 2015
- Led the organizational transition toward an inbound-driven, product-led demand generation model.
- Architected and implemented a closed-loop marketing automation system fully integrated with CRM infrastructure to track full-funnel activation.`,
      skills: `**Product-Led Growth:** Enterprise GTM strategy, Product positioning, Top-of-funnel conversion, User activation & onboarding.
**Technical Marketing & AI:** Narrative verticalization, Case study development, LLM workflow automation, AI-assisted GTM systems.
**Data & Analytics:** Full-funnel optimization, CAC/LTV optimization, Cohort & retention analysis.`,
      education: "",
    },
  },

  // ── Version 2: Sales & Sales Operations Focus ──
  {
    name: "Sales & Sales Operations",
    category: "sales_ops",
    sections: {
      summary: `Revenue-driven GTM leader with over a decade of experience optimizing sales velocity and commercial operations for complex B2B SaaS and infrastructure products. Expert in leveraging lifecycle automation, CRM systems, and AI-enabled workflows to turn technical adoption into Net ARR. Proven track record of bridging engineering and corporate sales teams while establishing high-performance sales processes and operations.`,
      experience: `**Elastic & Splunk**
*Senior Sales & GTM Leadership Roles* | Apr 2018–Nov 2021
- Achieved 139% quota attainment at Splunk by architecting successful cloud migration and infrastructure modernization engagements for enterprise clients.
- Built Elastic's market presence across Western Canada through targeted market development, technical sales support, and strategic networking.
- Collaborated directly with enterprise users to build solutions addressing compliance, observability, and complex infrastructure scaling challenges.

**Victoria Metrics**
*Technical Marketing & PLG Specialist* | Nov 2024–Feb 2026
- Built internal AI applications leveraging local LLMs and OpenAI-based frameworks to enhance sales velocity and workflow productivity.
- Managed core PLG initiatives focused on trial expansion, user onboarding, and continuous trial-to-paid conversion optimization.
- Deployed AI-powered automation workflows that reduced manual operational tasks and improved overall GTM efficiency.

**HoneOSS** | Vancouver, BC
*Founder & PLG Strategist* | Jan 2026–Present
- Develop and implement monetization frameworks that convert high-usage developer communities into sustainable recurring revenue (Net ARR) without disrupting initial user adoption.
- Help technical and open-source platforms improve monetization and scale toward $10M+ ARR.

**Docker, Inc.**
*Senior Technical GTM Manager, AI/ML* | Jan 2023–Jul 2024
- Bridged the gap between engineering and sales by translating complex developer infrastructure concepts into commercially effective adoption strategies.
- Supported executive leadership in defining product GTM strategy and emerging technology positioning.

**Oracle**
*Global Solutions Manager, Open Source Services* | Sep 2021–Sep 2022
- Drove cross-functional alignment across technical enablement and product marketing to scale enterprise customer adoption strategies.

**MariaDB (SkySQL)**
*North American Marketing Manager* | Jan 2013–May 2015
- Architected and implemented a closed-loop automation system fully integrated with CRM infrastructure to track full-funnel activation data.`,
      skills: `**Sales Operations & Analytics:** HubSpot & CRM reporting, CAC/LTV optimization, Cohort & retention analysis, Full-funnel tracking.
**Sales Enablement & AI Velocity:** Internal AI applications, Technical enablement, LLM workflow automation, AI-assisted GTM systems.
**Commercial Strategy:** Trial-to-paid conversion, Self-serve monetization, Enterprise GTM strategy, Quota attainment.`,
      education: "",
    },
  },

  // ── Version 3: Revenue Problem Solver & Special Projects Focus ──
  {
    name: "Revenue Problem Solver & Special Projects",
    category: "marketing",
    sections: {
      summary: `Strategic 0→1 builder and revenue problem solver with over a decade of experience tackling non-traditional business scaling challenges in technical B2B SaaS and infrastructure sectors. Expert at combining analytical rigor with advanced AI, automation, and operational engineering to eliminate growth bottlenecks and drive Net ARR. Adept at managing high-stakes, outside-the-box projects that connect deeply technical platforms with commercial reality.`,
      experience: `**HoneOSS** | Vancouver, BC
*Founder & PLG Strategist* | Jan 2026–Present
- Founded a strategic consultancy operating with a 0→1 mentality to help technical and open-source platforms improve monetization and scale toward $10M+ ARR.
- Develop and implement monetization frameworks that convert high-usage developer communities into sustainable recurring revenue (Net ARR) without disrupting initial user adoption.
- Advise B2B SaaS organizations on top-of-funnel conversion optimization and technical-to-commercial product positioning.

**Victoria Metrics**
*Technical Marketing & PLG Specialist* | Nov 2024–Feb 2026
- Designed, tested, and deployed AI-powered automation workflows that significantly reduced manual operational tasks and improved overall GTM efficiency.
- Built custom internal AI applications leveraging local LLMs and OpenAI-based frameworks to enhance operational sales velocity and workflow productivity.

**Docker, Inc.**
*Senior Technical GTM Manager, AI/ML* | Jan 2023–Jul 2024
- Partnered cross-functionally with a UC Berkeley engineering team to successfully launch a 0→1 LLM-powered automation agent for complex customer workflows.
- Served as the primary AI/ML subject matter expert, supporting executive leadership in defining emerging technology positioning.
- Bridged the gap between core engineering and sales by translating complex developer infrastructure concepts into effective commercial adoption strategies.

**Elastic & Splunk**
*Senior Sales & GTM Leadership Roles* | Apr 2018–Nov 2021
- Collaborated directly with enterprise users to build bespoke solutions addressing complex infrastructure scaling, compliance, and observability challenges.
- Deployed creative enterprise engagements to drive cloud migration and infrastructure modernization, leading to 139% quota attainment at Splunk.

**Oracle**
*Global Solutions Manager, Open Source Services* | Sep 2021–Sep 2022
- Aligned highly technical product teams with product marketing to launch and scale enterprise customer adoption for OpenSearch and Data Lake services on OCI.`,
      skills: `**Advanced AI & Tech Ops:** LLM workflow automation, OpenAI & Vercel AI SDK integrations, Prompt engineering & AI Agents, Custom internal AI applications.
**0→1 Growth Strategy:** Monetization frameworks, Self-serve monetization, Technical-to-commercial transformation, Open-source commercialization.
**Complex System Architecture:** Full-funnel automation, Infrastructure modernization, Cross-functional engineering leadership.`,
      education: "",
    },
  },
];
