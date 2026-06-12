import psycopg2, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'), override=True)
conn = psycopg2.connect(os.getenv('SUPABASE_DB_URI'))
curs = conn.cursor()
tables = ['adi_dtm_venta', 'adi_dtm_tramites', 'adi_dtm_tramitespredet', 'adi_dtm_desistimientostramites']
for t in tables:
    curs.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='sinco_ic_raw' AND table_name='{t}';")
    cols = curs.fetchall()
    if cols:
        print(f"\nTABLE: {t}")
        print([c[0] for c in cols])
