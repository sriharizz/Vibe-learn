# routes/session_routes.py
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Any, Dict, Tuple
from datetime import datetime, timezone
import os
import google.generativeai as genai
import json

# --- (Sys path fix is unchanged) ---
import sys
from os.path import abspath, dirname
project_root = dirname(dirname(abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
# --- END OF FIX ---

from env.app.deps import get_current_user
from env.app.supabase_client import supabase_service
from app_state import ml_models 

# ---------- Utility helpers (Unchanged) ----------
def parse_llm_json(llm_output: str) -> Optional[Dict[str, Any]]:
    """
    Try a robust extraction of JSON from an LLM output string.
    """
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

router = APIRouter(prefix="/session", tags=["session"])

# --- Pydantic Models (Unchanged) ---
class StartSessionRequest(BaseModel):
    plan_id: int
class StartSessionResponse(BaseModel):
    session_id: int
    plan_id: int
    plan_title: str
    session_timer_seconds: int
    mood: str
    energy: str
    first_topic_preview: dict 
class TopicContentResponse(BaseModel):
    step_number: int
    topic_title: str
    main_content: str
    key_points: List[str]
    checkpoint_questions: List[dict]
class QuizQuestion(BaseModel):
    type: str
    q: str
    options: Optional[List[str]] = None
    a: str
    topic_step: Optional[int] = None
class CumulativeQuizResponse(BaseModel):
    session_id: int
    plan_id: int
    topic_step: int
    questions: List[QuizQuestion]
class FinalQuizResponse(BaseModel):
    session_id: int
    plan_id: int
    questions: List[QuizQuestion]
class SubmitQuizRequest(BaseModel):
    final_score: float
    topic_scores: Dict[str, float] 
class SubmitQuizResponse(BaseModel):
    message: str
    history_id: int
    session_status: str
    passed: bool
    failed_topics_logged: int

# --- Helper Functions (Unchanged) ---
def _compute_session_seconds(mood: str, energy: str) -> int:
    m = (mood or "neutral").lower()
    e = (energy or "medium").lower()
    energy_minutes = {"low": 20, "medium": 30, "high": 45}
    base = energy_minutes.get(e, 30)
    mood_adj = {
        "happy": 1.2,
        "focused": 1.15,
        "neutral": 1.0,
        "stressed": 0.8,
        "tired": 0.7
    }
    factor = mood_adj.get(m, 1.0)
    minutes = int(round(base * factor))
    return minutes * 60

# --- /start-session (Unchanged) ---
@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest, user = Depends(get_current_user)):
    user_id = str(user.id)
    mood, energy = "neutral", "medium"
    try:
        vibe_q = supabase_service.table("user_vibes").select("mood,energy").eq("user_id", user_id).limit(1).execute()
        if getattr(vibe_q, "data", None):
            row = vibe_q.data[0]
            mood = (row.get("mood") or "neutral").strip().lower()
            energy = (row.get("energy") or "medium").strip().lower()
    except Exception as e:
        print(f"Warning: could not get user vibe: {e}")
    session_seconds = _compute_session_seconds(mood, energy)
    plan_title = "Study Plan"
    first_topic_preview = {"step_number": 1, "topic_title": "Introduction"}
    try:
        pr = supabase_service.table("study_plans").select("plan_title").eq("id", req.plan_id).limit(1).execute()
        if getattr(pr, "data", None):
            plan_title = pr.data[0].get("plan_title")
        first_topic_q = supabase_service.table("study_plan_topics") \
            .select("step_number, topic_title") \
            .eq("plan_id", req.plan_id) \
            .order("step_number", desc=False) \
            .limit(1) \
            .execute()
        if getattr(first_topic_q, "data", None):
            first_topic = first_topic_q.data[0]
            first_topic_preview = {
                "step_number": first_topic.get("step_number", 1),
                "topic_title": first_topic.get("topic_title", "Introduction")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plan details: {e}")
    new_session = {
        "user_id": user_id,
        "plan_id": req.plan_id,
        "status": "active",
        "session_timer_seconds": session_seconds,
        "session_started_at": datetime.now(timezone.utc).isoformat(),
        "mood": mood,
        "energy": energy,
        "last_read_step": 0
    }
    try:
        ins = supabase_service.table("study_sessions").insert(new_session).execute()
        if getattr(ins, "error", None):
            raise Exception(ins.error)
        session_id = ins.data[0].get("id")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed creating session: {e}")
    return {
        "session_id": session_id,
        "plan_id": req.plan_id,
        "plan_title": plan_title,
        "session_timer_seconds": session_seconds,
        "mood": mood,
        "energy": energy,
        "first_topic_preview": first_topic_preview
    }


# --- /get_topic_content (Unchanged) ---
@router.get("/session/{session_id}/topic/{step_number}", response_model=TopicContentResponse)
async def get_topic_content(session_id: int, step_number: int, user = Depends(get_current_user)):
    user_id = str(user.id)
    try:
        session_q = supabase_service.table("study_sessions").select("plan_id").eq("id", session_id).eq("user_id", user_id).limit(1).execute()
        if not getattr(session_q, "data", None):
             raise HTTPException(status_code=404, detail="Session not found")
        plan_id = session_q.data[0]["plan_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session: {e}")
    try:
        topic_q = supabase_service.table("study_plan_topics") \
            .select("topic_title, lesson_content, key_points_json, checkpoint_questions_json, is_content_generated") \
            .eq("plan_id", plan_id) \
            .eq("step_number", step_number) \
            .limit(1) \
            .execute()
        if not getattr(topic_q, "data", None):
            raise HTTPException(status_code=404, detail=f"Topic {step_number} not found in plan {plan_id}.")
        topic_data = topic_q.data[0]
        topic_title = topic_data.get("topic_title", "Topic")
        if not topic_data.get("is_content_generated"):
            return {
                "step_number": step_number,
                "topic_title": topic_title,
                "main_content": f"### ⏳ Your lesson for '{topic_title}' is being generated...\n\nThis course is still being compiled by our AI. This topic should be ready in a few minutes. Please try again shortly!",
                "key_points": ["Compiling..."],
                "checkpoint_questions": []
            }
        return {
            "step_number": step_number,
            "topic_title": topic_title,
            "main_content": topic_data.get("lesson_content") or "No content generated.",
            "key_points": topic_data.get("key_points_json") or [],
            "checkpoint_questions": topic_data.get("checkpoint_questions_json") or []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching topic content from DB: {e}")


# --- /cumulative-quiz (Unchanged) ---
@router.get("/session/{session_id}/cumulative-quiz/{topic_step}", response_model=CumulativeQuizResponse)
async def get_cumulative_quiz(session_id: int, topic_step: int, user = Depends(get_current_user)):
    user_id = str(user.id)
    try:
        session_q = supabase_service.table("study_sessions").select("plan_id").eq("id", session_id).eq("user_id", user_id).limit(1).execute()
        if not getattr(session_q, "data", None):
             raise HTTPException(status_code=404, detail="Session not found")
        plan_id = session_q.data[0]["plan_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session: {e}")
    try:
        plan_q = supabase_service.table("study_plans") \
            .select("final_quiz_json, is_plan_complete") \
            .eq("id", plan_id) \
            .limit(1) \
            .execute()
        if not getattr(plan_q, "data", None):
            raise HTTPException(status_code=404, detail="Study plan not found")
        plan_data = plan_q.data[0]
        if not plan_data.get("is_plan_complete") or not plan_data.get("final_quiz_json"):
            return {
                "session_id": session_id,
                "plan_id": plan_id,
                "topic_step": topic_step,
                "questions": [{
                    "type": "short",
                    "q": "Your quiz is still being compiled by our AI. Please wait a few more minutes!",
                    "options": [],
                    "a": "OK",
                    "topic_step": 0
                }]
            }
        all_questions = plan_data.get("final_quiz_json", [])
        cumulative_questions = [
            q for q in all_questions 
            if isinstance(q, dict) and "topic_step" in q and q["topic_step"] <= topic_step
        ]
        if not cumulative_questions:
            return {
                "session_id": session_id,
                "plan_id": plan_id,
                "topic_step": topic_step,
                "questions": [{
                    "type": "short",
                    "q": "No quiz questions are ready for these topics yet.",
                    "options": [],
                    "a": "OK",
                    "topic_step": 0
                }]
            }
        return {
            "session_id": session_id,
            "plan_id": plan_id,
            "topic_step": topic_step,
            "questions": cumulative_questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching cumulative quiz from DB: {e}")

# --- /get_final_quiz (Unchanged) ---
@router.get("/session/{session_id}/final-quiz", response_model=FinalQuizResponse)
async def get_final_quiz(session_id: int, user = Depends(get_current_user)):
    user_id = str(user.id)
    try:
        session_q = supabase_service.table("study_sessions").select("plan_id").eq("id", session_id).eq("user_id", user_id).limit(1).execute()
        if not getattr(session_q, "data", None):
            raise HTTPException(status_code=404, detail="Session not found")
        plan_id = session_q.data[0]["plan_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session: {e}")
    try:
        plan_q = supabase_service.table("study_plans") \
            .select("final_quiz_json, is_plan_complete") \
            .eq("id", plan_id) \
            .limit(1) \
            .execute()
        if not getattr(plan_q, "data", None):
            raise HTTPException(status_code=404, detail="Study plan not found")
        plan_data = plan_q.data[0]
        if not plan_data.get("is_plan_complete"):
            return {
                "session_id": session_id,
                "plan_id": plan_id,
                "questions": [{
                    "type": "short",
                    "q": "Your final quiz is still being generated by our AI. Please check back in a few minutes!",
                    "options": [],
                    "a": "OK"
                }]
            }
        questions = plan_data.get("final_quiz_json") or []
        if not questions:
            questions = [{
                "type": "short",
                "q": "An error occurred, or no questions were generated for this plan.",
                "options": [],
                "a": "Error"
            }]
        return {
            "session_id": session_id,
            "plan_id": plan_id,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching final quiz from DB: {e}")

# --- /submit-final-quiz (UPDATED) ---
@router.post("/session/{session_id}/submit-final-quiz", response_model=SubmitQuizResponse)
async def submit_final_quiz_score(session_id: int, req: SubmitQuizRequest, user = Depends(get_current_user)):
    user_id = str(user.id)
    score_decimal = req.final_score 
    score_percentage = int(round(score_decimal * 100))
    PASS_THRESHOLD = 70 
    passed = score_percentage >= PASS_THRESHOLD
    
    # 1. Get Session & Plan info
    try:
        session_q = supabase_service.table("study_sessions").select("plan_id").eq("id", session_id).eq("user_id", user_id).limit(1).execute()
        if not getattr(session_q, "data", None):
            raise HTTPException(status_code=404, detail="Session not found")
        plan_id = session_q.data[0]["plan_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session: {e}")

    # 2. Get Plan meta-data (for file name)
    history_name = "Study Session Quiz"
    plan_title = "Study Plan"
    try:
        plan_q = supabase_service.table("study_plans").select("file_name, plan_title").eq("id", plan_id).limit(1).execute()
        if getattr(plan_q, "data", None):
            row = plan_q.data[0]
            history_name = row.get("file_name") or row.get("plan_title") or history_name
            plan_title = row.get("plan_title") or plan_title
    except Exception as e:
        print(f"Warning: could not fetch plan details for history: {e}")

    # 3. Save the *main* quiz history entry
    main_history_id = -1
    try:
        hist_insert = {
            "user_id": user_id,
            "file_name": history_name, 
            "topic": "Cumulative Quiz (Checkpoint)", # Marked as checkpoint
            "score": score_percentage,
            "plan_id": plan_id # Store plan_id for main entry too
        }
        ins_resp = supabase_service.table("quiz_history").insert(hist_insert).execute()
        if not getattr(ins_resp, "data", None):
            raise Exception("Failed to save main quiz history.")
        main_history_id = ins_resp.data[0]['id']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving quiz history: {e}")

    # 4. *** NEW LOGIC: Log failed topics ***
    failed_topics_logged = 0
    topics_to_log = []
    
    # Get all topic titles for this plan first for better logging
    topic_titles_map = {}
    try:
        topics_q = supabase_service.table("study_plan_topics").select("step_number, topic_title").eq("plan_id", plan_id).execute()
        if getattr(topics_q, "data", None):
            for t in topics_q.data:
                topic_titles_map[str(t['step_number'])] = t['topic_title'] # Use string key
    except Exception as e:
        print(f"Warning: could not fetch topic titles for review logging: {e}")

    for topic_step_str, topic_score_decimal in req.topic_scores.items():
        topic_score_percent = int(round(topic_score_decimal * 100))
        
        # If score is below threshold, log it for review
        if topic_score_percent < PASS_THRESHOLD:
            failed_topics_logged += 1
            
            # Get the proper topic title, or create a fallback
            topic_title = topic_titles_map.get(topic_step_str, f"Topic {topic_step_str}")
            
            # --- *** THIS IS THE CHANGE FOR STEP 6 *** ---
            topics_to_log.append({
                "user_id": user_id,
                "file_name": history_name, # The name of the subject
                "topic": topic_title,      # The specific topic name (e.g., "Intro to Arrays")
                "score": topic_score_percent, # The failing score
                "plan_id": plan_id,           # <-- ADDED
                "topic_step": int(topic_step_str) # <-- ADDED (and cast to int)
            })
            # --- *** END OF CHANGE *** ---
    
    # 5. Batch-insert all failed topics
    if topics_to_log:
        try:
            supabase_service.table("quiz_history").insert(topics_to_log).execute()
            print(f"Logged {failed_topics_logged} topics for review for user {user_id}")
        except Exception as e:
            print(f"ERROR: Failed to batch-insert topics for review: {e}")

    # 6. Create response message
    message = ""
    if passed:
        message = f"Great job! You scored {score_percentage}%. Time for a well-deserved break."
    else:
        message = f"You scored {score_percentage}%. It's a good idea to review the material before your next session."
        if failed_topics_logged > 0:
            message += f" We've bookmarked {failed_topics_logged} topic(s) for you to review."

    return {
        "message": message,
        "history_id": main_history_id,
        "session_status": "active", # Session is still active
        "passed": passed,
        "failed_topics_logged": failed_topics_logged
    }

# --- /mark_topic_complete (Unchanged) ---
@router.post("/session/{session_id}/topic/{step_number}/complete", status_code=204)
async def mark_topic_complete(session_id: int, step_number: int, user = Depends(get_current_user)):
    user_id = str(user.id)
    
    # 1. Get the plan_id from the session
    try:
        session_q = supabase_service.table("study_sessions").select("plan_id").eq("id", session_id).eq("user_id", user_id).limit(1).execute()
        if not getattr(session_q, "data", None):
             raise HTTPException(status_code=404, detail="Session not found")
        plan_id = session_q.data[0]["plan_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session: {e}")
        
    # 2. Update the topic status in the database
    try:
        update_resp = supabase_service.table("study_plan_topics") \
            .update({"status": "completed"}) \
            .eq("plan_id", plan_id) \
            .eq("step_number", step_number) \
            .eq("user_id", user_id) \
            .execute()
            
        if not getattr(update_resp, "data", None):
            # This isn't critical, but good to know if it failed
            print(f"Warning: Failed to mark topic {step_number} as complete.")
            
    except Exception as e:
        # Don't crash the app, just log the error
        print(f"Error marking topic complete: {e}")
        
    # Return a 204 "No Content" success response
    return