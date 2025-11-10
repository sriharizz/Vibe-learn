# main.py
from fastapi import (
    FastAPI, 
    HTTPException, 
    Depends, 
    File, 
    UploadFile, 
    Body, 
    BackgroundTasks
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any, AsyncGenerator, Tuple

from dotenv import load_dotenv
load_dotenv()

from env.app.deps import get_current_user, oauth_2scheme
from env.app.supabase_client import supabase, supabase_service
from fastapi.security import OAuth2PasswordRequestForm
import pdfplumber
import io
import os
import json
import google.generativeai as genai
from contextlib import asynccontextmanager
from huggingface_hub import InferenceClient
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import requests
from datetime import datetime, timezone
import time
import asyncio # <-- This is correct
from fastapi.middleware.cors import CORSMiddleware
from app_state import ml_models

# ---------- Lifespan (Unchanged) ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("App is starting up...")
    try:
        ml_models["embed_model"] = SentenceTransformer('all-MiniLM-L6-v2')
        print("Embedding model loaded.")
    except Exception as e:
        print(f"Warning: failed to load embedding model: {e}")
    try:
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            genai.configure(api_key=gemini_key)
            print("Gemini API configured.")
        else:
            print("WARNING: GEMINI_API_KEY not found in environment.")
    except Exception as e:
        print(f"Warning: error configuring Gemini: {e}")
    try:
        hf_token = os.environ.get("HF_TOKEN")
        if hf_token:
            ml_models["hf_client"] = InferenceClient(token=hf_token)
            print("Hugging Face InferenceClient configured.")
        else:
            print("HF_TOKEN not found; HF client not configured.")
    except Exception as e:
        print(f"Warning: error configuring HF client: {e}")
    print("App is ready.")
    yield
    print("App is shutting down...")
    ml_models.clear()
    print("Models cleared.")

app = FastAPI(title="VibeLearn API", lifespan=lifespan)

# --- CORS Middleware (Unchanged) ---
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions (Unchanged) ---
def parse_llm_json(llm_output: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(llm_output)
    except Exception:
        try:
            json_start = llm_output.find('{')
            json_end = llm_output.rfind('}') + 1
            if json_start != -1 and json_end != -1 and json_end > json_start:
                json_str = llm_output[json_start:json_end]
                return json.loads(json_str)
        except Exception as e:
            print(f"Error parsing LLM json: {e}\n output was: {llm_output[:400]}")
    return None

def safe_parse_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        return parse_llm_json(text)

# ---------- Pydantic models (Unchanged) ----------
class UserCredentials(BaseModel):
    email: EmailStr
    password: str
class Query(BaseModel):
    question: str
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
class MoodUpdateRequest(BaseModel):
    mood: Optional[str] = None
    energy: Optional[str] = None
class GeneratePlanRequest(BaseModel):
    file_name: str
class FocusPlanResponse(BaseModel):
    mood: str
    study_duration_min: int
    break_duration_min: int
    message: str

# ---------- Auth & simple endpoints (Unchanged) ----------
@app.post("/login", response_model=AuthResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password,
        })
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid login credentials: {e}")

@app.get("/")
async def root():
    return {"ok": True, "msg": "FastAPI is running. Try /supabase-test"}

@app.post('/signup')
async def signup(credentials: UserCredentials):
    try:
        response = supabase.auth.sign_up({
            "email": credentials.email,
            "password": credentials.password
        })
        return {"ok": True, "response": response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/me")
async def me(user = Depends(get_current_user)):
    return {"ok": True, "user": user}


# ---------- HELPER 1: "High-Quality Plan" Generator (Using Gemini) (Unchanged) ----------
def _get_high_quality_plan_gemini(text_content: str) -> Tuple[str, List[str]]:
    print("--- Calling Gemini model for HIGH-QUALITY plan preview ---")
    truncated_text = text_content[:20000] 
    prompt = f"""
    You are an expert curriculum designer. Based *only* on the text below, generate a rich, comprehensive study plan.
    Respond ONLY with a single JSON object with two keys: "plan_title" and "topics".
    - "plan_title": A short, catchy title for the study plan.
    - "topics": A JSON list of 8 to 10 main topic titles (strings) in logical, pedagogical order. Be comprehensive.
    Example:
    {{
        "plan_title": "Mastering Data Structures",
        "topics": [
            "Introduction to Big O Notation", 
            "Understanding Arrays and Strings", 
            "Implementing Linked Lists",
            "Exploring Stacks and Queues",
            "Deep Dive into Hash Tables",
            "Understanding Trees and Tries",
            "Implementing Graphs and Graph Algorithms",
            "Review of Sorting Algorithms"
        ]
    }}
    TEXT:
    ---
    {truncated_text}
    ---
    Respond ONLY with the single JSON object:
    """
    try:
        model = genai.GenerativeModel('models/gemini-pro-latest')
        response = model.generate_content(prompt)
        ai_json = safe_parse_json(response.text)
        if not ai_json or "plan_title" not in ai_json or "topics" not in ai_json:
            raise Exception("Invalid JSON from Gemini model.")
        plan_title = ai_json['plan_title']
        topic_list = ai_json['topics']
        if not topic_list or not isinstance(topic_list, list) or not all(isinstance(t, str) for t in topic_list):
            raise Exception("Invalid topics list from Gemini model.")
        print(f"--- Gemini plan generated: '{plan_title}' with {len(topic_list)} topics ---")
        return plan_title, topic_list
    except Exception as e:
        print(f"!!!!!!!! ERROR: Gemini high-quality plan generation failed: {e} !!!!!!!!")
        return f"Study Plan for Document", ["Topic 1 (Gemini Error)", "Topic 2", "Topic 3"]


# ---------- HELPER 2: Background "Compiler" Task (VIBE-AWARE) (UPDATED) ----------
async def pre_generate_all_content_task(
    plan_id: int, 
    user_id: str, 
    file_name: str, 
    mood: str,  # <-- VIBE IS PASSED IN
    energy: str # <-- VIBE IS PASSED IN
):
    print(f"--- 🚀 ASYNC BACKGROUND JOB STARTED (VIBE: {mood}/{energy}) for plan {plan_id} ---")
    
    context_text = ""
    try:
        results = supabase_service.table("documents").select("content").eq("user_id", user_id).eq("file_name", file_name).execute()
        if not getattr(results, "data", None):
            raise Exception("No document chunks found.")
        context_text = "\n\n".join([r['content'] for r in results.data])
        print(f"  > Loaded {len(results.data)} chunks for context.")
    except Exception as e:
        print(f"  > ERROR: Background task failed to get context: {e}")
        return

    topics_from_db = [] 
    try:
        # --- *** THIS IS THE CHANGE: Only get topics that are NOT generated *** ---
        topic_q = supabase_service.table("study_plan_topics") \
            .select("id, topic_title, step_number") \
            .eq("plan_id", plan_id) \
            .eq("is_content_generated", False) \
            .order("step_number", desc=False) \
            .execute()
        # --- *** END OF CHANGE *** ---
            
        if not getattr(topic_q, "data", None):
            print("  > No topics found needing generation. Checking for final quiz...")
            # We still continue, to check if the quiz needs to be generated
        else:
            topics_from_db = topic_q.data
            print(f"  > Found {len(topics_from_db)} topics to generate.")
            
    except Exception as e:
        print(f"  > ERROR: Background task failed to get topics: {e}")
        return

    # --- Only configure model and run loop if there are topics to generate ---
    if topics_from_db:
        try:
            gemini_key = os.environ.get("GEMINI_API_KEY")
            if not gemini_key:
                raise Exception("GEMINI_API_KEY not found")
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('models/gemini-pro-latest')
        except Exception as e:
            print(f"  > ERROR: Background task failed to configure Gemini: {e}")
            return

        # --- DYNAMIC PROMPTS BASED ON VIBE (Unchanged) ---
        persona = "You are VibeLearn, a helpful AI study assistant."
        lesson_instruction = "Write a clear, easy-to-understand lesson (3-5 paragraphs)."
        
        if energy == "low" or mood == "low" or mood == "stressed":
            persona = "You are VibeLearn, a patient and understanding tutor. The user is low-energy."
            lesson_instruction = "Explain this topic in the **simplest terms possible**. Use short sentences, simple analogies, and a very encouraging tone."
        elif energy == "high" or mood == "focused":
            persona = "You are VibeLearn, an expert-level technical tutor. The user is high-energy and focused."
            lesson_instruction = "Provide a detailed, expert-level explanation of this topic. Include nuances and technical details."

        for topic in topics_from_db: # Use the renamed variable
            topic_id = topic['id']
            topic_title = topic['topic_title']
            step_number = topic['step_number']
            
            print(f"\n  > Generating content for: Topic {step_number}: {topic_title}")

            try:
                # --- PROMPT IS NOW VIBE-AWARE (Unchanged) ---
                prompt = f"""
                {persona}
                The user's current vibe is: mood={mood}, energy={energy}.
                
                Here is the full document text:
                ---
                {context_text}
                ---
                
                Based *only* on the text above, your task is to generate content for the *single* topic: "{topic_title}".

                Respond ONLY with a single, valid JSON object with keys "lesson_content", "key_points", and "checkpoint_questions".
                
                1. "lesson_content": {lesson_instruction} 
                   - Use Markdown for formatting. 
                   - Bold **only the 3-5 most critical keywords** per paragraph.

                2. "key_points": A JSON list of 3-5 strings. 
                   - **IMPORTANT:** Format each string as a "**Term:** Definition" pair.
                   - Example: ["**Descriptive Research:** Describes what exists without controlling variables.", "**Analytical Research:** Uses existing facts for critical evaluation."]

                3. "checkpoint_questions": A JSON list containing *one* multiple-choice question.

                Example JSON:
                {{
                    "lesson_content": "This is the simple, low-energy lesson about **{topic_title}**...",
                    "key_points": ["**Term 1:** Its definition.", "**Term 2:** Its definition."],
                    "checkpoint_questions": [
                        {{"type": "mcq", "q": "What is...?", "options": ["A", "B", "C"], "a": "A"}}
                    ]
                }}
                """
                
                response = model.generate_content(prompt)
                ai_json = safe_parse_json(response.text)

                if not ai_json or "lesson_content" not in ai_json or "key_points" not in ai_json:
                    raise Exception("AI response was invalid JSON.")

                supabase_service.table('study_plan_topics').update({
                    'lesson_content': ai_json.get('lesson_content'),
                    'key_points_json': ai_json.get('key_points'), 
                    'checkpoint_questions_json': ai_json.get('checkpoint_questions'),
                    'is_content_generated': True
                }).eq('id', topic_id).execute()
                
                print(f"  > SUCCESS: Saved VIBE-AWARE content for {topic_title} to DB.")
                
                # --- *** FIX FOR STEP 4 (QUOTA) *** ---
                print("  > ...Waiting 61s for rate limit...")
                await asyncio.sleep(61) # Non-blocking sleep

            except Exception as e:
                print(f"  > ERROR generating content for {topic_title}: {e}")
                # --- *** CHANGE: NO SLEEP ON ERROR *** ---
                # We log the error and continue to the next topic immediately.
                pass
    
    # --- Check if quiz is already generated ---
    try:
        plan_q = supabase_service.table("study_plans").select("is_plan_complete").eq("id", plan_id).limit(1).execute()
        if getattr(plan_q, "data", None) and plan_q.data[0]['is_plan_complete']:
             print("  > Final quiz already exists. Job complete.")
             print(f"--- ✅ ASYNC BACKGROUND JOB FINISHED for plan {plan_id} ---")
             return # Exit the function
    except Exception as e:
        print(f"  > Warning: Could not check if quiz exists: {e}")

    print("\n  > All topics generated (or already existed). Generating final quiz...")
    
    # Get ALL topics for the quiz prompt, not just the ones we just generated
    all_topics_for_quiz = []
    try:
        all_topics_q = supabase_service.table("study_plan_topics").select("step_number, topic_title").eq("plan_id", plan_id).order("step_number", desc=False).execute()
        if not getattr(all_topics_q, "data", None):
            raise Exception("No topics found for quiz prompt.")
        all_topics_for_quiz = all_topics_q.data
    except Exception as e:
        print(f"  > ERROR: Failed to get all topics for quiz: {e}")
        return

    topic_list_str = "\n".join([f"Step {t['step_number']}: {t['topic_title']}" for t in all_topics_for_quiz])
    
    try:
        # --- *** FIX FOR STEP 2 (MCQs ONLY) *** ---
        quiz_prompt = f"""
        You are VibeLearn, an expert AI quiz-maker.
        Based ONLY on the following context, generate a final quiz of 10-15 **multiple-choice ('mcq')** questions that comprehensively covers all the material.
        
        **CRITICAL REQUIREMENT:** For EACH question, you MUST include a "topic_step" key. The value must be the integer step number from the Topic List that the question is testing.
        
        - Example: {{"type": "mcq", "q": "What is...?", "options": ["A", "B", "C"], "a": "A", "topic_step": 1}}
        
        Respond ONLY with a single JSON object with a "questions" key.

        TOPIC LIST:
        ---
        {topic_list_str}
        ---

        RAW TEXT CONTEXT:
        ---
        {context_text}
        ---
        """
        response = model.generate_content(quiz_prompt)
        quiz_json = safe_parse_json(response.text)

        if not quiz_json or "questions" not in quiz_json:
            raise Exception("Invalid quiz JSON from AI")
            
        questions_with_steps = []
        for i, q in enumerate(quiz_json.get("questions", [])):
            if "topic_step" not in q:
                print(f"Warning: Question {i} missing 'topic_step'. Assigning fallback.")
                q["topic_step"] = (i % len(all_topics_for_quiz)) + 1 
            questions_with_steps.append(q)

        supabase_service.table('study_plans').update({
            'final_quiz_json': questions_with_steps, 
            'is_plan_complete': True
        }).eq('id', plan_id).execute()
        
        print("  > SUCCESS: Final quiz (with topic steps) generated and saved.")
        
    except Exception as e:
        print(f"  > ERROR generating final quiz: {e}")

    print(f"--- ✅ ASYNC BACKGROUND JOB FINISHED for plan {plan_id} ---")
# === END OF HELPER 2 ===


# --- *** FIX FOR STEP 3 (CACHING) & RESUMABLE LOGIC *** ---
@app.post("/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    user_id = str(user.id)
    file_name = file.filename
    file_path = f"{user_id}/{file.filename}"

    # --- Get Vibe *first* ---
    mood, energy = "neutral", "medium"
    try:
        vibe_resp = supabase_service.table("user_vibes").select("mood, energy").eq("user_id", user_id).limit(1).execute()
        if getattr(vibe_resp, "data", None):
            row = vibe_resp.data[0]
            mood = (row.get("mood") or mood).strip().lower()
            energy = (row.get("energy") or energy).strip().lower()
        print(f"--- Vibe loaded for compiler: {mood}/{energy} ---")
    except Exception as e:
        print(f"Warning: could not read user_vibes: {e}")

    # --- *** START OF UPDATED CACHING LOGIC *** ---
    try:
        # 1. Check for an existing plan with the same file and vibe
        existing_plan_q = supabase_service.table("study_plans") \
            .select("id, plan_title, generated_mood, generated_energy, is_plan_complete") \
            .eq("user_id", user_id) \
            .eq("file_name", file_name) \
            .limit(1) \
            .execute()

        if getattr(existing_plan_q, "data", None):
            plan = existing_plan_q.data[0]
            
            # 2. Check if vibes match
            if plan.get('generated_mood') == mood and plan.get('generated_energy') == energy:
                print(f"--- CACHE HIT: Found existing plan {plan['id']} with same vibe. ---")
                
                # --- *** NEW RESUMABLE LOGIC *** ---
                # 2a. Check if the plan is *actually* finished
                if not plan.get('is_plan_complete'):
                    print(f"  > Plan {plan['id']} is incomplete. Restarting background task...")
                    background_tasks.add_task(
                        pre_generate_all_content_task, 
                        plan_id=plan['id'],
                        user_id=user_id,
                        file_name=file_name,
                        mood=mood,
                        energy=energy
                    )
                else:
                    print(f"  > Plan {plan['id']} is already complete.")
                # --- *** END OF RESUMABLE LOGIC *** ---
                
                # 2b. Get the topics for the preview
                topics_q = supabase_service.table("study_plan_topics") \
                    .select("step_number, topic_title") \
                    .eq("plan_id", plan['id']) \
                    .order("step_number", desc=False) \
                    .execute()
                topics_preview = getattr(topics_q, "data", [])
                
                # 3. Return the existing plan, DO NOT generate a new one
                return {
                    "message": f"Loaded existing plan '{plan['plan_title']}' from cache.",
                    "total_chunks_created": 0, 
                    "plan_preview": {
                        "plan_id": plan['id'],
                        "plan_title": plan['plan_title'],
                        "topics": topics_preview
                    }
                }
            else:
                # 4. Vibes are different, delete this old plan to make a new one
                print(f"--- Vibe mismatch. Deleting old plan {plan['id']}. ---")
                old_plan_ids = [plan['id']]
                supabase_service.table("study_plan_topics").delete().in_("plan_id", old_plan_ids).execute()
                supabase_service.table("study_plans").delete().in_("id", old_plan_ids).execute()
        
        print("--- CACHE MISS: No existing plan found, or vibe mismatch. Generating new plan. ---")

    except Exception as e:
        print(f"Error during cache check: {e}")
    # --- *** END OF UPDATED CACHING LOGIC *** ---

    # --- (Rest of the function is the same, but now it only runs on a cache miss) ---
    try:
        contents = await file.read()
    except Exception:
        raise HTTPException(status_code=500, detail="Error reading file.")
    finally:
        await file.close()
    try:
        supabase_service.storage.from_("user_uploads").upload(
            path=file_path,
            file=contents,
            file_options={"upsert": "true"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading to Supabase Storage: {str(e)}")

    all_text = ""
    try:
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    all_text += page_text + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF content: {str(e)}")

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, length_function=len)
    text_chunks = text_splitter.split_text(all_text)
    if not text_chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
    model = ml_models.get("embed_model")
    if model is None:
        raise HTTPException(status_code=500, detail="Embedding model is not loaded.")
    embeddings = model.encode(text_chunks)

    try:
        supabase_service.table("documents").delete().eq("user_id", user_id).eq("file_name", file_name).execute()
        data_to_insert = []
        for i, chunk in enumerate(text_chunks):
            data_to_insert.append({
                "user_id": user_id,
                "file_name": file_name,
                "content": chunk,
                "embedding": embeddings[i].tolist()
            })
        insert_resp = supabase_service.table("documents").insert(data_to_insert).execute()
        if getattr(insert_resp, "error", None):
            raise Exception(f"Supabase insert error: {insert_resp.error}")
        print(f"Chunks saved for {file_name}.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving document to pgvector: {str(e)}")
        
    plan_title, topic_list = _get_high_quality_plan_gemini(all_text)
    
    try:
        plan_insert_resp = supabase_service.table("study_plans").insert({
            "user_id": user_id,
            "file_name": file_name,
            "plan_title": plan_title,
            "is_plan_complete": False,
            "generated_mood": mood,
            "generated_energy": energy
        }).execute()
        new_plan_id = plan_insert_resp.data[0]['id']
        topics_to_insert = []
        for i, topic_title_str in enumerate(topic_list):
            topics_to_insert.append({
                "plan_id": new_plan_id,
                "user_id": user_id,
                "step_number": i + 1,
                "topic_title": topic_title_str,
                "topic_summary": "...", 
                "status": "pending",
                "is_content_generated": False
            })
        if topics_to_insert:
            supabase_service.table("study_plan_topics").insert(topics_to_insert).execute()
        print(f"--- High-quality plan preview saved (Plan ID: {new_plan_id}) ---")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving 'shell' plan to DB: {str(e)}")

    background_tasks.add_task(
        pre_generate_all_content_task, 
        plan_id=new_plan_id,
        user_id=user_id,
        file_name=file_name,
        mood=mood,
        energy=energy
    )
    print(f"--- Async background task added for plan {new_plan_id} ---")

    return {
        "message": f"File '{file_name}' processed. Your study plan is being generated!",
        "total_chunks_created": len(text_chunks),
        "plan_preview": {
            "plan_id": new_plan_id,
            "plan_title": plan_title,
            "topics": [{"step_number": i+1, "topic_title": title} for i, title in enumerate(topic_list)]
        }
    }


# ---------- HELPER 3: Gemini Streamer (Unchanged) ----------
async def _stream_gemini_response(prompt: str, model_name: str = 'models/gemini-pro-latest') -> AsyncGenerator[str, None]:
    try:
        model = genai.GenerativeModel(model_name)
        response_stream = await model.generate_content_async(prompt, stream=True)
        async for chunk in response_stream:
            if chunk.text:
                yield chunk.text
                await asyncio.sleep(0.01) 
    except Exception as e:
        print(f"!!!!!!!! ERROR during Gemini stream: {e} !!!!!!!!")
        yield f"\n\n**Error streaming response:** {e}"

# ---------- Ask question (Unchanged) ----------
@app.post('/ask_question')
async def askquestion(query: Query, user = Depends(get_current_user)):
    user_id = user.id
    embed_model = ml_models.get('embed_model')
    if embed_model is None:
        raise HTTPException(status_code=500, detail='AI model is not loaded')
    current_mood = "neutral"
    current_energy = "medium"
    try:
        vibe_result = supabase_service.table('user_vibes').select('mood, energy').eq('user_id', str(user_id)).limit(1).execute()
        if getattr(vibe_result, "data", None):
            row = vibe_result.data[0] if isinstance(vibe_result.data, list) else vibe_result.data
            current_mood = (row.get('mood') or current_mood).strip().lower()
            current_energy = (row.get('energy') or current_energy).strip().lower()
    except Exception as e:
        print(f"Warning: Could not fetch mood/energy for user {user_id}. Using defaults. Error: {e}")
    try:
        question_embedding = embed_model.encode(query.question).tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating query embedding: {str(e)}")
    context_chunks = []
    similarities = []
    try:
        results = supabase_service.rpc(
            "match_all_documents",
            {
                "query_embedding": question_embedding,
                "match_threshold": 0.7,
                "match_count": 3,
                "p_user_id": str(user_id)
            }
        ).execute()
        if getattr(results, "data", None):
            context_chunks = [doc['content'] for doc in results.data]
            similarities = [doc.get('similarity') for doc in results.data]
        else:
            print(f"No relevant chunks found for: {query.question}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying DB: {str(e)}")
    persona_prompt = "You are VibeLearn, a helpful AI learning assistant."
    if current_mood == "focused":
        persona_prompt = "You are VibeLearn, an Expert Technician AI assistant. The user is focused. Be concise and technical."
    elif current_mood == "stressed":
        persona_prompt = "You are VibeLearn, a Patient Tutor. The user is stressed. Be gentle, encouraging and break down steps simply."
    elif current_mood == "tired":
        persona_prompt = "You are VibeLearn, a Gentle Guide. The user is tired. Keep answers brief and kind."
    elif current_mood == "happy":
        persona_prompt = "You are VibeLearn, an upbeat tutor. The user is happy. Keep the tone positive and concise."
    if current_energy == "low":
        persona_prompt += " Use short answers (one or two short paragraphs)."
    elif current_energy == "medium":
        persona_prompt += " Provide a concise but complete answer."
    elif current_energy == "high":
        persona_prompt += " You can provide a more detailed explanation and examples."
    RELEVANCE_THRESHOLD = 0.7
    is_relevant = bool(context_chunks and similarities and similarities[0] and similarities[0] > RELEVANCE_THRESHOLD)
    if is_relevant:
        context_string = "\n\n".join(context_chunks)
        rag_prompt = f"""
{persona_prompt}
User state: mood={current_mood}, energy={current_energy}
Use ONLY the following context to answer the question. If the context does not contain the answer, say "Based on the context provided, I cannot answer the question."
Context:
{context_string}
Question: {query.question}
Answer (based only on context):
"""
        print("--- Streaming RAG response ---")
        return StreamingResponse(
            _stream_gemini_response(rag_prompt, 'models/gemini-pro-latest'), 
            media_type="text/event-stream"
        )
    else:
        general_prompt = f"""
{persona_prompt}
User state: mood={current_mood}, energy={current_energy}
Answer the user's question using general knowledge. If you don't know, say "I don't have information on that topic."
User Question: {query.question}
Answer:
"""
        print("--- Streaming General Knowledge response ---")
        return StreamingResponse(
            _stream_gemini_response(general_prompt, 'models/gemini-flash-latest'), 
            media_type="text/event-stream"
        )

# ---------- Update mood (Unchanged) ----------
@app.post("/update-mood")
async def update_mood(mood_update: MoodUpdateRequest, user = Depends(get_current_user)):
    user_id = str(user.id)
    new_mood = (mood_update.mood or "neutral").strip().lower()
    new_energy = (mood_update.energy or "medium").strip().lower()
    try:
        upd = supabase_service.table("user_vibes").update({
            "mood": new_mood,
            "energy": new_energy,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }).eq("user_id", user_id).execute()
        updated_rows = getattr(upd, "data", None)
        if not updated_rows or len(updated_rows) == 0:
            ins = supabase_service.table("user_vibes").insert({
                "user_id": user_id,
                "mood": new_mood,
                "energy": new_energy,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }).execute()
            if getattr(ins, "error", None):
                raise Exception(ins.error)
        return {
            "message": "Mood and energy updated successfully",
            "mood": new_mood,
            "energy": new_energy
        }
    except Exception as e:
        print("Error upserting user_vibes:", e)
        raise HTTPException(status_code=500, detail=f"Error updating mood/energy: {str(e)}")

# ---------- DEPRECATED: Generate master plan (Unchanged) ----------
@app.post("/generate-master-plan")
async def generate_master_plan(req: GeneratePlanRequest = Body(...), user = Depends(get_current_user)):
    raise HTTPException(
        status_code=400, 
        detail="This endpoint is deprecated. Use /upload-pdf, which now automatically generates the plan."
    )

# ---------- Include session routes (Unchanged) ----------
from routes.session_routes import router as session_router
app.include_router(session_router)

from routes.dashboard_routes import router as dashboard_router
app.include_router(dashboard_router)

# ---------- Supabase smoke test (Unchanged) ----------
@app.get("/supabase-test")
async def supabase_test():
    try:
        resp = supabase.storage.list_buckets()
        if isinstance(resp, dict) and "data" in resp:
            buckets = resp["data"]
        else:
            buckets = resp
        return {"ok": True, "buckets": buckets}
    except AttributeError:
        try:
            resp = supabase.storage.get_buckets()
            if isinstance(resp, dict) and "data" in resp:
                buckets = resp["data"]
            else:
                buckets = resp
            return {"ok": True, "buckets": buckets}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase method mismatch: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase test failed: {e}")