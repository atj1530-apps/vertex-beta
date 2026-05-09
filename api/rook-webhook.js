{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // api/rook-webhook.js\
// Vercel serverless function \'97 receives health data from ROOK\
\
const \{ createClient \} = require('@supabase/supabase-js');\
\
const SUPABASE_URL = 'https://dwsrwsnzuiwnagjepgtj.supabase.co';\
const ROOK_CLIENT_UUID = '90d3793e-e2d1-43e2-9677-7791a94f93ab';\
\
module.exports = async function handler(req, res) \{\
  if (req.method !== 'POST') \{\
    return res.status(405).json(\{ error: 'Method not allowed' \});\
  \}\
\
  try \{\
    const payload = req.body;\
    if (!payload) return res.status(400).json(\{ error: 'No payload' \});\
\
    const supabase = createClient(\
      SUPABASE_URL,\
      process.env.SUPABASE_SERVICE_KEY\
    );\
\
    const user_id = payload.user_id || payload.user_id_string || null;\
    const data_structure = payload.data_structure || '';\
    const today = new Date().toISOString().split('T')[0];\
\
    // Find Supabase user linked to this ROOK user_id\
    const \{ data: profile \} = await supabase\
      .from('user_profiles')\
      .select('id')\
      .eq('rook_user_id', user_id)\
      .single();\
\
    const supabaseUserId = profile?.id || null;\
    if (!supabaseUserId) \{\
      console.log('No matching user for rook_user_id:', user_id);\
      return res.status(200).json(\{ success: true, note: 'user not found' \});\
    \}\
\
    let healthEntry = \{\
      id: 'rk_' + Date.now(),\
      user_id: supabaseUserId,\
      date: today,\
      source: 'rook'\
    \};\
\
    // Body metrics \'97 HRV, RHR, weight\
    if (data_structure === 'body_metrics_event') \{\
      const events = payload?.body_health?.events?.body_metrics_event || [];\
      events.forEach(e => \{\
        if (e.hrv_rmssd) healthEntry.hrv = e.hrv_rmssd;\
        if (e.resting_heart_rate) healthEntry.rhr = e.resting_heart_rate;\
        if (e.weight_kg) healthEntry.weight = Math.round(e.weight_kg * 2.20462 * 10) / 10;\
      \});\
    \}\
\
    // Sleep\
    if (data_structure === 'sleep_event') \{\
      const events = payload?.sleep_health?.events?.sleep_event || [];\
      events.forEach(e => \{\
        if (e.total_sleep_duration_seconds) \{\
          healthEntry.sleep = Math.round((e.total_sleep_duration_seconds / 3600) * 10) / 10;\
        \}\
      \});\
    \}\
\
    // Physical \'97 steps, calories\
    if (data_structure === 'physical_event') \{\
      const events = payload?.physical_health?.events?.physical_event || [];\
      events.forEach(e => \{\
        if (e.steps) healthEntry.steps = e.steps;\
        if (e.active_calories_burnt) healthEntry.cal = e.active_calories_burnt;\
      \});\
    \}\
\
    // Merge with existing entry for today\
    const \{ data: existing \} = await supabase\
      .from('health_logs')\
      .select('*')\
      .eq('user_id', supabaseUserId)\
      .eq('date', today)\
      .maybeSingle();\
\
    const merged = existing\
      ? \{ ...existing, ...Object.fromEntries(Object.entries(healthEntry).filter(([,v]) => v != null)) \}\
      : healthEntry;\
\
    await supabase.from('health_logs').upsert(merged);\
\
    return res.status(200).json(\{ success: true \});\
\
  \} catch (err) \{\
    console.error('ROOK webhook error:', err);\
    return res.status(500).json(\{ error: err.message \});\
  \}\
\};}