
# 🧠 VibeLearn: Adaptive AI Study Assistant

> **Learning that adapts to *you*, not the other way around.**

VibeLearn is a full-stack, **GenAI-powered educational platform** that dynamically personalizes study material, quiz complexity, and session pacing based on the user's real-time emotional state (Mood & Energy).

Built with a **FastAPI** backend and **React** frontend, it solves the problem of "cognitive mismatch" by ensuring the difficulty of the material matches the user's current capacity to learn.

[Watch the VibeLearn Demo](https://youtu.be/NuquJz_gWXs)

---

## 🚀 Key Features

* **🎭 Vibe-Aware Content Generation:** The AI tutor adopts different personas (e.g., "Patient Tutor" vs. "Expert Technician") and adjusts lesson complexity based on whether you are "Stressed" or "Focused."
* **⏱️ Dynamic Pomodoro Timer:** Study session durations are automatically calculated based on your energy levels (e.g., shorter sprints for low energy, deep work blocks for high energy).
* **🔄 Resumable Background Compilation:** A robust asynchronous pipeline that generates full courses from PDFs. It includes smart caching and **auto-resumption logic** to ensure course generation completes reliably, even if interrupted by API rate limits.
* **🤖 RAG-Powered Q&A:** Chat with your PDF. The system uses vector search (pgvector) to answer questions based *strictly* on your uploaded document context.
* **📊 Granular Progress & Review:** Tracks performance per specific topic. If you fail a quiz section, the dashboard provides deep links to review *only* the concepts you missed.

---

## 🧠 How the "Vibe" Adaptivity Works (The Core Logic)

This is the core intelligence of VibeLearn. The system doesn't just change the color theme; it fundamentally restructures the learning experience in two distinct ways:

### 1. Topic Adaptivity (Content Generation)
The backend creates a unique version of the lesson material for every topic based on the user's mental state at the time of generation.

| User State | AI Persona | Content Adaptation Result |
| :--- | :--- | :--- |
| **🔴 Stressed / Low Energy** | **"The Empathetic Tutor"** | Topics are generated using simple analogies, an encouraging tone, and minimal technical jargon to reduce cognitive load. Focuses on core concepts ("Explain like I'm 5"). |
| **🟢 Focused / High Energy** | **"The Expert Technician"** | Topics are generated with high-density technical details, nuance, edge cases, and complex implementation examples to maximize learning velocity. |

### 2. Timer Adaptivity (Pacing)
The Pomodoro timer dynamically calculates the optimal session length to prevent burnout based on the user's energy input.

* **Low Energy:** Sets a **20-minute** "sprint" timer (short bursts).
* **Medium Energy:** Sets a **30-minute** standard timer.
* **High Energy:** Sets a **45+ minute** "deep work" timer.

---

## 🛠️ Tech Stack

### **Backend (Python)**
* **Framework:** FastAPI (Asynchronous)
* **AI Engine:** Google Gemini Flash (High-volume generation)
* **Embeddings:** Hugging Face (`all-MiniLM-L6-v2`)
* **Vector Search:** Supabase pgvector
* **Task Management:** Python `asyncio` & `BackgroundTasks`

### **Frontend (TypeScript)**
* **Framework:** React (Vite)
* **Styling:** Tailwind CSS
* **State Management:** React Context API
* **HTTP Client:** Axios

### **Database & Infra**
* **Supabase:** PostgreSQL database, Authentication, Storage, and Vector Store.

---

## 🏗️ System Architecture

1.  **Input:** User uploads a PDF and sets Vibe (Mood/Energy).
2.  **Cache Layer:** System checks the `study_plans` database for an existing plan with the **same file hash AND same vibe**.
    * *Cache Hit:* Loads instantly.
    * *Partial Hit (Resumable):* If a plan exists but was interrupted (e.g., by API quotas), the system **auto-resumes** generation only for the missing topics.
3.  **Processing:**
    * PDF is parsed, chunked, and embedded into vectors.
    * Background worker sequentially calls Gemini API to generate Lessons, Key Points, and Quizzes (enforcing JSON output).
4.  **Session Flow:** User studies topic-by-topic.
    * **"Next Topic"** marks progress in DB.
    * **"Timer End"** triggers a cumulative quiz.
5.  **Analytics:** Quiz results are analyzed per topic. Failed topics are logged to the `quiz_history` table to populate the "Topics to Review" dashboard.

---

## 💻 Local Setup Guide

### Prerequisites
* Node.js & npm
* Python 3.10+
* Supabase Account
* Google Gemini API Key
### 1. Clone the Repository

git clone https://github.com/sriharizz/Vibe-learn.git
cd Vibe-learn

cd BackendVL
python -m venv env
source env/bin/activate # (or .\env\Scripts\activate on Windows)
pip install -r requirements.txt

 Create a .env file in the /BackendVL folder with these keys:
 * SUPABASE_URL=your_supabase_url
 * SUPABASE_SERVICE_ROLE_KEY=your_service_key
 * GEMINI_API_KEY=your_gemini_key
 * HF_TOKEN=your_huggingface_token

uvicorn main:app --reload

cd ../FrontendVL
npm install
npm run dev `c


## 🔮 Future Roadmap

We are actively working on extending VibeLearn with these advanced features:

  * **📸 Passive Vibe Check (Biometric Sensing):**

      * **Goal:** Remove manual input.
      * **Tech:** Implement a webcam-based emotion detection system using **OpenCV** and **DeepFace**.
      * **Function:** Automatically detects signs of fatigue or stress during a session and dynamically prompts the user to take a break or lowers the quiz difficulty in real-time.

  * **📹 Integrated Recommendations Engine:**

      * **Goal:** Provide external context for difficult topics.
      * **Tech:** A custom scraping engine.
      * **Function:** When a user fails a topic, the system will automatically fetch relevant YouTube videos and LeetCode/GeeksforGeeks practice problems specific to that failed concept.

  * **☁️ Microservices Architecture:**

      * **Goal:** Massive scalability.
      * **Tech:** **Celery** + **Redis**.
      * **Function:** Decoupling the compilation worker from the main API to handle thousands of concurrent PDF uploads without blocking the server.

## 👤 Author & Project Status

**VibeLearn** is a personal portfolio project developed by **Sri Hari** to demonstrate full-stack engineering capabilities, specifically in:

* Asynchronous System Design (FastAPI/Python)
* Generative AI Integration (RAG, Prompt Engineering)
* React/TypeScript Frontend Architecture

**Status:** ✅ MVP Complete
If you have any feedback or suggestions, feel free to reach out!
