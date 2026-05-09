import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dwsrwsnzuiwnagjepgtj.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3c3J3c256dWl3bmFnamVwZ3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTIxODksImV4cCI6MjA5MDI4ODE4OX0.JEQ2S2Gyog9caBZMOLTTKet7_pGb0EjxtUVxJ7Hq5h8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);