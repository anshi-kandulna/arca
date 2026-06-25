# ARCA Frontend

The frontend for ARCA is a React 18 application built via Vite, TypeScript, and TailwindCSS. It provides an intuitive, high-contrast interface for both departmental implementers and compliance officers to manage regulatory workflows.

---

## 2. Page Directory & Architecture

The application is structured into distinct workflows, mapped directly to specific roles (System Admin, Compliance Officer, Department Head, Department User).

### Core Dashboards & Overviews
* **`LandingPage.tsx`**: The entry point to ARCA. Serves as a simulated login gateway, establishing the brutalist design system and navigating the user into their specific Role-Based Access Control (RBAC) portal.
* **`DashboardPage.tsx`**: The macroscopic "God View" for Compliance Officers and System Admins. Displays high-level compliance metrics, critical system alerts, recent circular influx, and overall completion graphs.

### Circular Ingestion & Management
* **`UploadCircularPage.tsx`**: The intake funnel. Compliance officers drop raw PDF regulatory circulars here. Submitting a file triggers the backend `docling` extraction and the AI Routing pipeline.
* **`CircularsPage.tsx`**: The master ledger of all regulatory circulars processed by the bank. Users can track which circulars have been parsed, how many MAPs (Manageable Actionable Points) were extracted from each, and their global compliance statuses.

### Department & Task Execution
* **`DepartmentHeadPortal.tsx`**: A scoped dashboard tailored for Department Heads (e.g., Head of Risk Management). It aggregates all MAPs routed to their specific department, allowing them to monitor workload distribution, overdue tasks, and their internal department's compliance velocity.
* **`MyTasksPage.tsx` (Gate 1)**: The tactical interface for Departmental Implementers. Lists actionable MAPs assigned specifically to the logged-in user's sub-vertical. Features a multipart evidence upload gateway (`FormData`) enabling users to attach physical `.pdf` or `.docx` proofs and submit them for validation.

### Compliance Validation & Auditing
* **`ValidationSignOffPage.tsx` (Gate 2)**: The final review dashboard for Compliance Officers. Displays pending AI validations. It features a detailed `Signal Breakdown` UI exposing the Validation Agent's line-by-line deterministic reasoning, computed weights, and `MET/NOT_MET` status. Officers can accept the AI verdict or manually request a rework.
* **`MAPReviewPage.tsx`**: A focused, deep-dive interface for a singular Manageable Actionable Point, displaying its full lineage—from the original circular text down to the routing trajectory and final validation status.
* **`AuditPage.tsx`**: A chronologically ordered, tamper-evident ledger. It dynamically filters logs based on the logged-in `user_id` context. It visually differentiates between manual human actions and offline automated AI actions (e.g., "MAP Auto-Closed").

### Utility Pages
* **`NotFoundPage.tsx`**: The 404 error boundary, maintaining the brutalist aesthetic while guiding users back to the safe application pathways.

---

## 2. Development Workflow

The frontend communicates with the local FastAPI backend (defaulting to `http://localhost:8000`).

### Installation
Ensure Node.js (v18+) is installed.
```bash
npm install
```

### Running Locally
```bash
# Starts Vite dev server on port 5173
npm run dev
```

### Building for Production
```bash
# Compiles TypeScript and builds minified assets to /dist
npm run build
```
