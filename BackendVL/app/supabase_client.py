# supabase_client.py

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
anon_key: str = os.environ.get("SUPABASE_ANON_KEY")
service_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_anon: Client = create_client(url, anon_key)
supabase_service: Client = create_client(url, service_key)
supabase = supabase_anon