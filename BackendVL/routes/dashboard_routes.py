# routes/dashboard_routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# --- Add sys.path code to find other modules ---
import sys
from os.path import abspath, dirname

project_root = dirname(dirname(abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
# --- End of sys.path fix ---

from env.app.deps import get_current_user
from env.app.supabase_client import supabase_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# --- Pydantic Models for our new responses ---
class UserStats(BaseModel):
    total_subjects: int
    total_quizzes: int
    average_score: float

class SimplePlan(BaseModel):
    id: int
    plan_title: str
    file_name: str
    created_at: str
    progress: float  # (This was already correct)

# --- *** THIS IS CHANGE 1 of 2 *** ---
class TopicToReview(BaseModel):
    file_name: str
    topic: str
    last_score: int
    plan_id: int    # <-- ADDED
    topic_step: int # <-- ADDED


# --- Endpoint for Profile Page Stats (Unchanged) ---
@router.get("/my-stats", response_model=UserStats)
async def get_user_stats(user = Depends(get_current_user)):
    user_id = str(user.id)
    
    try:
        # 1. Get total subjects (plans)
        plan_count_resp = supabase_service.table("study_plans") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .execute()
        
        total_subjects = plan_count_resp.count or 0

        # 2. Get quiz stats
        quiz_stats_resp = supabase_service.table("quiz_history") \
            .select("score", count="exact") \
            .eq("user_id", user_id) \
            .execute()
            
        total_quizzes = quiz_stats_resp.count or 0
        
        # 3. Calculate average score
        average_score = 0.0
        if total_quizzes > 0 and getattr(quiz_stats_resp, "data", None):
            scores = [item['score'] for item in quiz_stats_resp.data if 'score' in item]
            if scores:
                average_score = round(sum(scores) / len(scores), 1)

        return {
            "total_subjects": total_subjects,
            "total_quizzes": total_quizzes,
            "average_score": average_score
        }

    except Exception as e:
        print(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user statistics.")


# --- Endpoint for Dashboard "Suggested Topics" (Unchanged) ---
@router.get("/my-plans", response_model=List[SimplePlan])
async def get_my_plans(user = Depends(get_current_user)):
    user_id = str(user.id)
    
    try:
        # Step 1: Get all plans
        plans_resp = supabase_service.table("study_plans") \
            .select("id, plan_title, file_name, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()

        if not getattr(plans_resp, "data", None):
            return []
            
        plans = plans_resp.data
        plan_ids = [p['id'] for p in plans]

        # Step 2: Get all topic statuses for those plans
        topics_resp = supabase_service.table("study_plan_topics") \
            .select("plan_id, status") \
            .eq("user_id", user_id) \
            .in_("plan_id", plan_ids) \
            .execute()

        # Step 3: Process the topic data into dictionaries for easy lookup
        plan_topic_counts = {}
        plan_completed_counts = {}

        if getattr(topics_resp, "data", None):
            for topic in topics_resp.data:
                pid = topic['plan_id']
                if pid not in plan_topic_counts:
                    plan_topic_counts[pid] = 0
                    plan_completed_counts[pid] = 0
                
                plan_topic_counts[pid] += 1
                if topic['status'] == 'completed':
                    plan_completed_counts[pid] += 1

        # Step 4: Build the final response
        plans_with_progress = []
        for plan in plans:
            plan_id = plan['id']
            total = plan_topic_counts.get(plan_id, 0)
            completed = plan_completed_counts.get(plan_id, 0)
            
            progress = 0.0
            if total > 0:
                progress = round((completed / total) * 100, 1)

            plans_with_progress.append({
                "id": plan_id,
                "plan_title": plan['plan_title'],
                "file_name": plan['file_name'],
                "created_at": plan['created_at'],
                "progress": progress
            })

        return plans_with_progress

    except Exception as e:
        print(f"Error getting user plans with progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user plans.")


# --- *** THIS IS CHANGE 2 of 2 *** ---
# --- Endpoint for Dashboard "Topics to Review" (UPDATED) ---
@router.get("/topics-to-review", response_model=List[TopicToReview])
async def get_topics_to_review(user = Depends(get_current_user)):
    user_id = str(user.id)
    PASS_THRESHOLD = 70
    
    try:
        # Update the select query to get the new columns
        review_resp = supabase_service.table("quiz_history") \
            .select("file_name, topic, score, plan_id, topic_step") \
            .eq("user_id", user_id) \
            .lt("score", PASS_THRESHOLD) \
            .order("created_at", desc=True) \
            .limit(5) \
            .execute()

        if getattr(review_resp, "data", None):
            # Build the new response object with all fields
            topics = [
                {
                    "file_name": item["file_name"], 
                    "topic": item["topic"], 
                    "last_score": item["score"],
                    "plan_id": item["plan_id"],       # <-- ADDED
                    "topic_step": item["topic_step"]  # <-- ADDED
                }
                for item in review_resp.data
                # Add a filter to make sure we only get rows that have the new data
                if "plan_id" in item and item["plan_id"] is not None and "topic_step" in item and item["topic_step"] is not None
            ]
            return topics
        else:
            return []

    except Exception as e:
        print(f"Error getting topics to review: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve topics for review.")