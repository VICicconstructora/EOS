import psycopg2, os
from dotenv import load_dotenv
load_dotenv(override=True)
conn = psycopg2.connect(os.getenv('SUPABASE_DB_URI'))
curs = conn.cursor()
curs.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'sinco_ic_raw' AND table_name = 'adi_dtm_tramites';")
for r in curs.fetchall(): print(r)
