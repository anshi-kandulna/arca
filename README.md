# ARCA (Automated Regulatory Compliance Assistant)

ARCA is a highly specialized, autonomous AI platform designed to help banks and financial institutions automate the ingestion, semantic routing, and deterministic validation of regulatory circulars. It drastically reduces manual compliance workflows by extracting Manageable Actionable Points (MAPs) from complex PDF circulars and deploying local offline AI agents to orchestrate their lifecycle.

---

## 🚀 Key Architectural Features

### 1. Multi-Agent AI Framework (Offline-First)
The platform is designed to run in air-gapped or high-security banking environments, utilizing **Ollama** natively to run open-weight models (`qwen2.5:7b`). No data is sent to external APIs (OpenAI, Anthropic).
* **Extraction Agent:** Uses IBM `docling` for local PDF parsing, entirely bypassing standard cloud OCR.
* **Routing Agent:** Employs a deterministic keyword guardrail system alongside a fallback LLM router to intelligently assign MAPs to correct internal departments.
* **Validation Agent:** Automatically evaluates user-submitted evidence against obligations to auto-close MAPs that achieve a $\ge 90\%$ deterministic confidence score.

### 2. Semantic Embedding & Fast Filtering
The system uses `mxbai-embed-large` to generate vector embeddings of active sub-vertical scopes. Before falling back to the LLM router, the pipeline pre-filters options using cosine similarity—cutting latency by over 60% and strictly preventing LLM hallucination of department names.

### 3. Rigorous Audit Logging & RBAC
* Every system action, including actions taken by the autonomous AI agents (e.g. `AUTO_CLOSE`), is cryptographically tied and logged.
* Distinct Role-Based Access Control (RBAC) scopes limit log visibility and actions strictly to the user's domain.

---

## 🛠️ Complete Tech Stack

### Frontend Application
* **Framework:** React 18 with Vite
* **Styling:** Tailwind CSS (configured for Brutalist aesthetics)
* **Routing:** React Router v6
* **Icons:** Lucide React
* **Language:** TypeScript

### Backend Architecture
* **Framework:** FastAPI (Python)
* **Database:** PostgreSQL 16 (via SQLAlchemy ORM)
* **AI Extraction Pipeline:** `docling`, `pandas`
* **AI LLM & Embedding Host:** `Ollama` (`qwen2.5:7b` & `mxbai-embed-large:latest`)
* **File Handling:** Multipart asynchronous uploads direct to local static storage (`/uploads`)

---

## ⚙️ Prerequisites

Before executing the system, ensure the following are installed:
1. **Node.js** (v18+) and `npm`.
2. **Python** (3.10+).
3. **PostgreSQL** running locally (pgAdmin recommended).
4. **Ollama** installed and running locally. You must pull the required models:
    ```bash
    ollama pull qwen2.5:7b
    ollama pull mxbai-embed-large:latest
    ```

---

## 📦 Installation & Setup

### 1. Database Initialization
1. Open pgAdmin and create a new database named `arca`.
2. Run the initialization script `backend/001_init.sql` to create the schema (Users, MAPs, Audit Logs, Validation Verdicts).

### 2. Backend Orchestration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server on port 8000:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 3. Frontend Client
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 📝 High-Level Usage Workflow

1. **Circular Ingestion:** Log in as a `compliance_officer` and upload a regulatory PDF. The system parses it, extracts the MAPs, and routes them to departments.
2. **Action Delegation:** Department Users log in, view assigned MAPs, and execute physical changes (e.g. updating a firewall).
3. **Evidence Upload:** The department user uploads a screenshot or policy doc directly into the platform.
4. **AI Validation (Gate 2):** The Validation Agent analyzes the evidence via a 3-stage LLM pipeline.
5. **Auto-Close / Review:** If the AI confidence is $>90\%$, it auto-closes the MAP. Otherwise, it generates a transparent line-by-line `Signal Breakdown` for the compliance officer to review manually.

---

## 🤝 Project Structure Documentation

For deeper technical understanding of specific agents and UI elements, refer to their dedicated documentation:
* [Downstream Routing Agent Documentation](backend/routing_agent/README.md)
* [Autonomous Validation Agent Documentation](backend/validation_agent/README.md)
* [Frontend Application Architecture](frontend/README.md)