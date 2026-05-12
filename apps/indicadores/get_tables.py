import psycopg2, os
from dotenv import load_dotenv
load_dotenv(override=True)
conn = psycopg2.connect(os.getenv('SUPABASE_DB_URI'))
curs = conn.cursor()
curs.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
for row in curs.fetchall(): print(row[0])
