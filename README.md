# 🏛️ Dormitory Maintenance System (DMS)

A role-based web application that digitizes dormitory maintenance reporting at **PNG University of Technology (PNGUoT)**. Students report issues from any device, and every handoff from Student → Sub-Warden → Matron/Patron → Maintenance is instant, trackable, and preserved in a full audit trail. Critical issues — particularly pest infestations — trigger a parallel fast-track alert to Maintenance and Student Support & Facilities.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)

---

## 🌐 Live Demo

**https://dormitory-maintenance-system.vercel.app**

Test accounts (password: `password123`):

| Role | Email | Dormitory |
|---|---|---|
| Student | `test2@example.com` | Dame Jane Kekedo (DJK) |
| Sub-Warden | `subwarden1@example.com` | Dame Jane Kekedo (DJK) |
| Sub-Warden | `subwarden2@example.com` | Poroman South |
| Matron / Patron | `matron1@example.com` | All dorms |
| Maintenance Team | `maintenance1@example.com` | All dorms |
| Student Support & Facilities | `ssf1@example.com` | All dorms |

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
- **Sub-Warden comments** — Sub-Wardens can add a note when confirming an issue, visible to Matron, Maintenance, and the reporting student

### Evidence & Tracking

- **Photo and video attachments** — students attach evidence (max 50 MB) which every role in the chain can view
- **Live status tracking** — students see their report move through Submitted → Confirmed → Approved → In Progress → Resolved

### Feedback & Quality

- **Student feedback system** — after a repair is resolved, students rate the work (1–5 stars) and leave an optional comment. Feedback is visible to the Maintenance Team and Matron/Patron.

### Reporting & Analytics

- **Prioritized maintenance queue** — fast-track and critical reports surface first
- **SSF statistics dashboard** — reports by category, reports by dormitory, summary cards, and filterable report list
- **Annual SSF Report** — screen dashboard with monthly trends + a **print-ready formal PDF** including:
  - Executive summary and KPI tables
  - Monthly distribution
  - Category and dormitory breakdowns
  - **Dormitory × Issue Type Matrix** for cross-tabulation analysis
  - **Renovation Priorities** section with auto-generated budget recommendations
  - Student feedback summary with selected comments

### Security & Access Control

- **University email validation** — signup requires `@student.pnguot.ac.pg` (students/sub-wardens) or `@pnguot.ac.pg` (staff)
- **TAF and Room Number verification** — required for students to prevent non-residential users from misusing the system
- **Gender-filtered dormitory selection** — students only see dorms matching their gender
- **Row Level Security (RLS)** — enforced at the PostgreSQL level

### Experience

- **Light and dark mode** — theme toggle across the entire system, with preference saved to `localStorage`
- **Responsive UI** — works on mobile, tablet, and desktop browsers
- **Modern design system** — Tailwind CSS with a consistent indigo/slate theme, Lucide icons, Inter font, and glass-morphism accents
- **Auto-deploy pipeline** — pushing to `main` triggers a Vercel build automatically

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router, React 19), TypeScript |
| **Styling** | Tailwind CSS 4, Lucide React icons, Inter (via `next/font`) |
| **Backend / API** | Next.js Server Components + Client Components |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth (email/password, domain-restricted) |
| **File Storage** | Supabase Storage |
| **Authorization** | PostgreSQL Row Level Security (RLS) policies |
| **Hosting** | Vercel |
| **Version Control** | Git + GitHub |

---

## 🏗️ Architecture

DMS follows a three-layer architecture:

- **Client Layer** — Web browser (Student, Sub-Warden, Matron/Patron, Maintenance, SSF)
- **Application Layer** — Next.js 16 on Vercel (App Router, React components, auto-deploy from GitHub `main`)
- **Data & Service Layer** — Supabase (PostgreSQL database, Auth, Storage, Row Level Security)

---

## 📂 Project Structure

```
dms/
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Homepage / hero
│   ├── layout.tsx            # Root layout (font, nav bar, dark mode script)
│   ├── globals.css           # Global styles, animations, print styles
│   ├── login/                # Login page
│   ├── signup/               # Signup with gender/TAF/room/email validation
│   ├── dashboard/            # Role-aware dashboard
│   ├── report/               # Student report submission
│   ├── my-requests/          # Student report tracking + feedback form
│   ├── sub-warden/           # Sub-Warden confirmation view
│   ├── matron/               # Matron/Patron approval + monitoring
│   ├── maintenance/          # Maintenance prioritized queue
│   └── ssf/                  # SSF overview + yearly report
│       ├── page.tsx          # Overview & statistics
│       └── yearly/           # Annual report with formal PDF
├── components/
│   ├── NavBar.tsx            # Sticky navigation + theme toggle
│   ├── Attachments.tsx       # Reusable photo/video display
│   ├── FeedbackBlock.tsx     # Student rating + comment
│   └── ThemeToggle.tsx       # Floating toggle for auth pages
├── lib/
│   └── supabase/
│       ├── client.ts         # Supabase client (browser)
│       └── server.ts         # Supabase client (server)
├── public/                   # Static assets
├── .env.local                # Local environment variables (gitignored)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🗄️ Database Schema

Eight tables handle the complete workflow:

| Table | Purpose |
|---|---|
| `users` | User profiles + roles + gender + TAF + room (extends Supabase `auth.users`) |
| `dormitory` | Dormitory records (boys' and girls' halls) |
| `category` | Issue categories + default urgency mapping |
| `maintenance_request` | The actual reports, with confirm/approve/resolve metadata and Sub-Warden comments |
| `status_update` | Audit trail — every status change with timestamp and actor |
| `alert` | Fast-track alerts sent to Maintenance and SSF |
| `attachment` | Photo/video evidence linked to reports |
| `feedback` | Student rating (1–5) + optional comment after resolution |

---

## 👥 User Roles

| Role | Can do |
|---|---|
| **Student** | Submit reports with photo/video evidence, track status, leave feedback on resolved repairs |
| **Sub-Warden** | Confirm reports from their dormitory are genuine, add a comment when confirming |
| **Matron / Patron** | Review confirmed reports from all dorms, forward to Maintenance, monitor progress, view student feedback |
| **Maintenance Team** | Work a prioritized queue, update status, view student feedback |
| **Student Support & Facilities** | Monitor critical alerts in real time, analyze reports, generate the annual report |

---

## 🚀 Local Development

### Prerequisites

- **Node.js** 20+ — [download](https://nodejs.org)
- **Git** — [download](https://git-scm.com)
- A free **Supabase** account — [sign up](https://supabase.com)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR-USERNAME/dormitory-maintenance-system.git
cd dormitory-maintenance-system

# 2. Install dependencies
npm install

# 3. Create a .env.local file with your Supabase credentials
#    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 4. Run the database schema in your Supabase SQL Editor
#    (see Database Setup below)

# 5. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

### Database Setup

In your Supabase project's **SQL Editor**, run the schema scripts to create:

1. **Tables and enums** — `users`, `dormitory`, `category`, `maintenance_request`, `status_update`, `alert`, `attachment`, `feedback`
2. **Row Level Security policies** — enforce role-based access at the database level
3. **Seed data** — categories (plumbing, electrical, pest, other) and dormitories
4. **Storage bucket** — `attachments` (public) for photo/video uploads

---

## 🌍 Environment Variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |

Both are required locally (`.env.local`) and in production (Vercel → Project Settings → Environment Variables).

> ⚠️ Never commit `.env.local` to Git — it is already listed in `.gitignore`.

---

## 🚢 Deployment

DMS is deployed on **Vercel** with continuous deployment from GitHub.

**To deploy your own copy:**

1. Fork this repository
2. Sign up at [vercel.com](https://vercel.com) with your GitHub account
3. Click **Add New → Project** and select your fork
4. Add the two environment variables listed above
5. Click **Deploy**

Vercel will build and deploy automatically. Every future push to `main` triggers a redeployment.

---

## 🔒 Security

- **Authentication** handled by Supabase Auth — passwords are never stored or handled by application code
- **Email domain validation** — signups restricted to `@student.pnguot.ac.pg` and `@pnguot.ac.pg`
- **Authorization** enforced at the database level via Row Level Security (RLS) policies
- **HTTPS** by default on all Vercel deployments
- **Secrets** kept in environment variables and never committed to the repository
- **Data minimization** — only the information needed to route and resolve a report is collected

---

## 📈 Success Metrics

| KPI | Target |
|---|---|
| Handoff speed (each stage) | Completes in minutes once actioned, vs. hours/days for the verbal process |
| Pest/critical alert reliability | 100% of pest reports trigger immediate parallel alerts |
| Categorization accuracy | > 90% of test reports assigned the expected category and urgency |
| Role-based access correctness | All 5 roles see only the data scoped to them |
| Status visibility | Every report's current stage visible to the reporting student |

---

## 🎓 About This Project

DMS is a solo student project developed for **IS426 — Information Systems Development Project** at **PNG University of Technology**, Semester 2, 2026.

It is one of two systems developed under the same subject — the other being the **UniForce Incident Reporting & Investigation Management System**.

**Author:** Nyah Resis

---

## 📄 License

This project is submitted as academic coursework for IS426 at PNGUoT. It is not licensed for commercial use.

---

## 🙏 Acknowledgments

- **PNGUoT Student Support & Facilities** — for guidance on dormitory structure and workflow requirements
- **Sub-Warden Student Leaders 2026** — for the official dormitory list
- **Supabase, Vercel, and Next.js** — for free-tier tooling that made a solo cloud-native prototype possible