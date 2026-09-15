# 🏛️ Dormitory Maintenance System (DMS)

A role-based web application that digitizes dormitory maintenance reporting at **PNG University of Technology (PNGUoT)**. Students report issues from any device, and every handoff from Student → Sub-Warden → Matron/Patron → Maintenance is instant, trackable, and preserved in a full audit trail. Critical issues — particularly pest infestations — trigger a parallel fast-track alert to Maintenance and Student Support & Facilities.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 🌐 Live Demo

**https://dormitory-maintenance-system.vercel.app**

Test accounts (password: `password123`):

| Role | Email |
|---|---|
| Student | `test2@example.com` |
| Sub-Warden | `subwarden1@example.com` |
| Matron / Patron | `matron1@example.com` |
| Maintenance Team | `maintenance1@example.com` |
| Student Support & Facilities | `ssf1@example.com` |

---

## 📖 The Problem

Dormitory maintenance reporting at PNGUoT follows a defined confirm-and-approve chain — Student → Sub-Warden → Matron/Patron → Maintenance — that exists for good reason: it verifies issues before committing resources. But because it currently runs entirely by word of mouth, it has four concrete problems:

1. **Delay** — each handoff depends on someone being physically available.
2. **No prioritization** — a dripping tap can sit ahead of a genuine safety hazard.
3. **No fast path for critical issues** — pest infestations in particular travel the full chain before anyone is even aware.
4. **No visibility** — students have no way to check whether their report has been confirmed, forwarded, or acted on.

DMS solves all four without removing the verification step that makes the chain trustworthy.

---

## ✨ Features

### Core Workflow
- **Role-based access** — five user roles, each with a purpose-built view of the same data
- **Confirm-and-approve chain** — preserved digitally: Sub-Warden confirms → Matron/Patron approves → Maintenance resolves
- **Full audit trail** — every status change recorded with timestamp, actor, and note
- **Parallel fast-track alerts** — pest/critical reports notify Maintenance and SSF immediately, without waiting for the chain to complete
- **Automatic categorization & urgency** — based on category (e.g., pest defaults to Critical)

### Evidence & Tracking
- **Photo and video attachments** — students attach evidence (max 50 MB) which every role in the chain can view
- **Live status tracking** — students see their report move through Submitted → Confirmed → Approved → In Progress → Resolved

### Reporting & Analytics
- **Prioritized maintenance queue** — fast-track and critical reports surface first
- **SSF statistics dashboard** — reports by category, reports by dormitory, summary cards, and filterable report list for annual maintenance planning

### Experience
- **Responsive UI** — works on mobile, tablet, and desktop browsers
- **Modern design system** — Tailwind CSS with a consistent indigo/slate theme, Lucide icons, Inter font
- **Auto-deploy pipeline** — pushing to `main` triggers a Vercel build automatically

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router, React 19), TypeScript |
| **Styling** | Tailwind CSS 4, Lucide React icons, Inter (via `next/font`) |
| **Backend / API** | Next.js Server Components + Client Components |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth (email/password) |
| **File Storage** | Supabase Storage |
| **Authorization** | PostgreSQL Row Level Security (RLS) policies |
| **Hosting** | Vercel |
| **Version Control** | Git + GitHub |

---

## 🏗️ Architecture

DMS follows a three-layer architecture:
