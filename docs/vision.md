# Vision Document — GitHub & Copilot Dashboard

## Purpose

The GitHub & Copilot Dashboard is an internal management tool built to give organizational leadership — including the Head of Development, Tech Managers, and other business stakeholders — clear, actionable visibility into how the organization's GitHub plan is being used, with a primary focus on GitHub Copilot adoption and return on investment.

## Problem Statement

As organizations scale their GitHub Copilot deployments, the following questions become difficult to answer without dedicated tooling:

- Are developers actually using Copilot, and how actively?
- Which teams, languages, or IDEs see the highest benefit?
- Is the investment translating into measurable productivity gains?
- Are users accepting Copilot suggestions, or ignoring them?
- Which AI models are being used, and which ones drive more premium token consumption (billable cost)?
- How is adoption trending over time — are we getting better at using AI?

The GitHub API provides rich Copilot telemetry, but it requires technical knowledge to query and interpret. This dashboard surfaces that data in a visual, accessible format tailored to non-technical stakeholders and decision-makers.

## Target Audience

| Role | Primary Interest |
|---|---|
| Head of Development | Overall ROI, strategic adoption progress, cost justification |
| Tech Managers | Team-level engagement, language/IDE preferences, acceptance rates |
| Business Managers | Cost vs. value metrics, seat utilization, high-level trend summaries |
| Finance Stakeholders | License cost vs. estimated value generated, premium token billing |

## Strategic Goals

1. **Adoption Visibility** — Track how many developers are actively using Copilot versus how many seats are allocated.
2. **Effectiveness Measurement** — Measure suggestion acceptance rates to gauge Copilot's usefulness in practice.
3. **ROI Justification** — Translate usage metrics into estimated monetary value using configurable assumptions (hours saved, blended hourly rate).
4. **Usage Intelligence** — Understand which languages, IDEs, and AI models are driving the most value and cost.
5. **Executive Reporting** — Provide a single, always-up-to-date dashboard that can be shared in leadership reviews without manual data preparation.
6. **Premium Token Awareness** — Identify which models and usage patterns generate the most billable premium token consumption to inform cost optimization decisions.

## Long-Term Vision

The dashboard should evolve into a comprehensive GitHub organizational intelligence platform, eventually covering:

- **Per-user Copilot activity** (who is using it most, who is not yet onboarded)
- **Team-level segmentation** (adoption by squad/department)
- **Model benchmarking** (which AI model yields the highest acceptance rate vs. cost)
- **Premium token billing breakdown** (cost attribution by model, editor, and team)
- **Trend alerting** (notify managers when adoption drops or acceptance rate declines)
- **Historical reporting** (exportable reports for quarterly business reviews)

## Non-Goals (Current Phase)

- This tool does not manage or modify GitHub settings, seats, or permissions.
- It does not replace GitHub's own analytics portal but complements it with a tailored view for leadership.
- It is not intended for individual developer performance reviews; the focus is on team and org-level patterns.

## Access Model

Access is restricted to a pre-configured allowlist of GitHub usernames (`ALLOWED_USERS`). Authentication is handled via GitHub OAuth, ensuring only authorized stakeholders can view organizational data. This is intentional — Copilot usage data is sensitive and should not be exposed broadly.
