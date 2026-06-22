# ARCA (Automated Regulatory Compliance Assistant)

Suraksha (ARCA) is an AI-powered regulatory compliance platform designed to help banks and financial institutions automate the processing, extraction, and routing of regulatory circulars. It drastically reduces manual compliance workflows by extracting Manageable Actionable Points (MAPs) from complex PDF circulars and automatically assigning them to the relevant internal business vertical using LLM-based intelligent routing.

## 🚀 Key Features

*   **Intelligent Circular Processing:** Upload PDF circulars and automatically extract obligations, deadlines, and priorities using Docling and local LLMs.
*   **AI Routing Agent:** Employs a semantic keyword matcher and a fallback LLaMA 3.2 router to intelligently assign MAPs to correct internal departments (e.g., Risk Management, Digital Banking).
*   **Brutalist UI Aesthetics:** A highly opinionated, high-contrast, brutalist user interface ensuring high readability, clarity, and an "art-directed" feel—avoiding generic AI slop.
*   **Role-Based Access Control (RBAC):** Distinct roles for `system_admin`, `compliance_officer`, `department_head`, and `department_user`.
*   **Real-time Notifications:** Automated routing triggers real-time alerts to the specific department users, ensuring prompt accountability.
*   **Audit Logging:** Every system action is cryptographically tied and logged for rigorous compliance trailing.
*   **Department Validation:** Integrated evidence upload and multi-stage sign-off workflows for tracking compliance adherence.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 18 with Vite
*   **Styling:** Tailwind CSS (configured for Brutalist / Neo-brutalist aesthetics)
*   **Routing:** React Router v6
*   **Icons:** Lucide React
*   **Language:** TypeScript

### Backend & AI
*   **Framework:** FastAPI (Python)
*   **Database:** PostgreSQL 16 (via SQLAlchemy ORM & pgAdmin)
*   **AI Extraction Pipeline:** Docling, Pandas
*   **AI Routing Agent:** Ollama (`llama3.2:latest`)
*   **File Handling:** Local static storage (`/uploads`)

## ⚙️ Prerequisites

Before you begin, ensure you have met the following requirements:
*   **Node.js** (v18+) and `npm` installed.
*   **Python** (3.10+) installed.
*   **PostgreSQL** running locally (pgAdmin recommended).
*   **Ollama** installed and running locally. You must pull the llama3.2 model:
    ```bash
    ollama pull llama3.2:latest
    ```

## 📦 Installation & Setup

### 1. Database Setup
1. Open pgAdmin and create a new database (e.g., `arca`).
2. Run the initialization script `backend/001_init.sql` to create all tables and schema.
3. If you have generated additional migration scripts (e.g., `audit_log_schema.sql`, `notifications_schema.sql`), run them to ensure the schema is completely up-to-date.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 Usage Workflow

1. **Login:** Log in as a `compliance_officer` (e.g., `co@suraksha.com`).
2. **Upload Circular:** Navigate to the "Upload Circular" page. Upload a regulatory PDF.
3. **AI Pipeline:** The backend triggers the `run_pipeline.py` script. Docling extracts the text, and Ollama identifies MAPs. The Routing Agent assigns them to departments.
4. **Notification:** Log in as a `department_user`. Notice the bell icon in the top right, indicating new assigned obligations.
5. **Validation:** Review the MAP, submit evidence, and process it through the validation workflow.

## 🤝 Contributing

This project is actively developed. Ensure any UI modifications strictly adhere to the brutalist design philosophy established in the codebase—high contrast, solid borders, offset shadows, and purposeful micro-interactions.