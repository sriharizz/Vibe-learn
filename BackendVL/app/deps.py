# env/app/deps.py
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from app.supabase_client import supabase_anon as supabase

oauth_2scheme=OAuth2PasswordBearer(tokenUrl='login')

async def get_current_user(token: str=Depends(oauth_2scheme)):
   try:
      user_resp=supabase.auth.get_user(token)
   except Exception as e:
      raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail=f'Invalid or expired tokes:{e}')
   
   user=user_resp.user
   if not user:
      raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not fetch user from Supabase")

   return user