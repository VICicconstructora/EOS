import streamlit as st
import google.generativeai as genai
import psycopg2
import pandas as pd
import os
import re
from dotenv import load_dotenv

# 1. Configuración inicial
load_dotenv(override=True)
# Asegúrate de que tu archivo .env tiene la clave GEMINI_API_KEY
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Usamos Gemini 1.5 Pro por su gran capacidad de razonamiento lógico y SQL
model = genai.GenerativeModel('gemini-2.5-flash')

st.set_page_config(page_title="Chat ERP Data Agent", page_icon="📊")
st.title("📊 Asistente de Datos - ERP")

# 2. Funciones Auxiliares
@st.cache_resource(validate=lambda conn: conn.closed == 0)
def get_db_connection():
    """Establece conexión directa con Supabase PostgreSQL"""
    # Asegúrate de que tu archivo .env tiene la cadena de conexión SUPABASE_DB_URI
    conn = psycopg2.connect(os.getenv("SUPABASE_DB_URI"))
    conn.autocommit = True
    return conn

import glob

@st.cache_data(ttl=3600)
def get_project_catalog():
    """Consulta el catálogo real de proyectos para que el LLM use nombres EXACTOS en lugar de ILIKE."""
    try:
        conn = get_db_connection()
        df_pry = pd.read_sql_query(
            "SELECT prycodigoproyecto, prynombreproyecto, prydescmacroproy "
            "FROM sinco_ic_raw.adi_dtm_proyectos "
            "WHERE prynombreproyecto IS NOT NULL "
            "ORDER BY prynombreproyecto",
            conn,
        )
        df_vta = pd.read_sql_query(
            "SELECT DISTINCT vtanombreproyecto "
            "FROM sinco_ic_raw.adi_dtm_venta "
            "WHERE vtanombreproyecto IS NOT NULL "
            "ORDER BY vtanombreproyecto",
            conn,
        )
    except Exception as e:
        return f"\n> ⚠️ No se pudo cargar el catálogo de proyectos en vivo: {e}\n"

    bloque = "## CATÁLOGO DE PROYECTOS\n\n"
    bloque += "Valores reales tal como están en la base de datos. Cuando el usuario mencione un proyecto, "
    bloque += "usa **`ILIKE`** (ej: `ILIKE 'Praia Etapa 1'`) para ignorar mayúsculas y minúsculas. Evita usar `%` al final si quieres evitar mezclar etapas (ej: Etapa 1 vs Etapa 10).\n\n"
    bloque += "### Nombres canónicos (`adi_dtm_proyectos.prynombreproyecto`)\n\n"
    bloque += "| prycodigoproyecto | prynombreproyecto | prydescmacroproy |\n"
    bloque += "|---|---|---|\n"
    for _, row in df_pry.iterrows():
        bloque += f"| {row['prycodigoproyecto']} | {row['prynombreproyecto']} | {row['prydescmacroproy'] or ''} |\n"

    bloque += "\n### Nombres tal como aparecen en ventas (`adi_dtm_venta.vtanombreproyecto`)\n\n"
    for v in df_vta["vtanombreproyecto"].tolist():
        bloque += f"- `{v}`\n"

    return "\n" + bloque + "\n"

def get_schema_context():
    """Lee el archivo esquema.md principal, todos los .md secundarios y anexa el catálogo vivo de proyectos."""
    contexto_total = ""
    try:
        with open("esquema.md", "r", encoding="utf-8") as f:
            contexto_total += f.read() + "\n\n### DETALLE ESTRUCTURAL DE LAS TABLAS ###\n\n"
    except FileNotFoundError:
        st.error("Error: No se encontró el archivo 'esquema.md'.")
        return None

    # Leer dinámicamente todo lo que está dentro de 'estructuras md'
    archivos_estructura = glob.glob("estructuras md/**/*.md", recursive=True)
    for archivo in archivos_estructura:
        try:
            with open(archivo, "r", encoding="utf-8") as f:
                contexto_total += f"--- Archivo: {os.path.basename(archivo)} ---\n{f.read()}\n\n"
        except Exception:
            pass

    contexto_total += get_project_catalog()

    return contexto_total

def extract_sql(text):
    """Extrae la consulta SQL en caso de que Gemini la envuelva en bloques de markdown"""
    sql_match = re.search(r'```sql\n(.*?)\n```', text, re.DOTALL)
    if sql_match:
        return sql_match.group(1).strip()
    # Si no hay bloque markdown, asume que toda la respuesta es SQL
    return text.strip().replace('```', '')

# 3. Lógica del Agente
def generate_sql(pregunta_usuario, esquema):
    prompt = f"""
    Eres un experto en PostgreSQL. Tu única tarea es convertir preguntas de lenguaje natural en consultas SQL válidas para la base de datos descrita a continuación.

    AQUÍ TIENES EL ESQUEMA Y CONTEXTO DE LA BASE DE DATOS:
    {esquema}

    PREGUNTA DEL USUARIO:
    "{pregunta_usuario}"

    REGLAS ESTRICTAS:
    1. Responde ÚNICAMENTE con la consulta SQL.
    2. NO incluyas explicaciones, saludos, ni texto introductorio como "Aquí está la consulta:".
    3. Usa los nombres de tablas y columnas exactamente como se describen en el esquema. Recuerda que siempre están en el esquema sinco_ic_raw (Ej: SELECT * FROM sinco_ic_raw.adi_dtm_venta;).
    4. No generes sentencias que modifiquen la base de datos (UPDATE, DELETE, DROP, etc.). Solo genera sentencias SELECT.
    """
    response = model.generate_content(prompt)
    return extract_sql(response.text)

def get_natural_language_response(pregunta, datos_json):
    prompt = f"""
    El usuario hizo esta pregunta: "{pregunta}"

    Se ejecutó una consulta en la base de datos y este es el resultado en formato JSON:
    {datos_json}

    Tu tarea es redactar una respuesta amigable, clara y concisa en español, respondiendo a la pregunta del usuario basándote EXCLUSIVAMENTE en los datos proporcionados.
    - Si los datos están vacíos o no hay resultados, indica claramente que no se encontraron resultados para la consulta.
    - Si hay datos, resume la información principal.
    """
    response = model.generate_content(prompt)
    return response.text

# 4. Interfaz de Chat con Streamlit
if "messages" not in st.session_state:
    st.session_state.messages = []

# Mostrar historial de chat
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "dataframe" in message and message["dataframe"] is not None:
            st.dataframe(message["dataframe"])

# Capturar nueva entrada del usuario
if prompt := st.chat_input("Ej: ¿Cuáles fueron las 5 ventas más caras?"):
    # Mostrar la pregunta del usuario
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Analizando pregunta y generando SQL..."):
            try:
                # Paso A: Obtener el esquema y generar SQL
                esquema_md = get_schema_context()
                if esquema_md:
                    consulta_sql = generate_sql(prompt, esquema_md)

                    with st.expander("Ver consulta SQL generada"):
                        st.code(consulta_sql, language="sql")

                    # Paso B: Ejecutar SQL en Supabase
                    conn = get_db_connection()
                    df = pd.read_sql_query(consulta_sql, conn)

                    # Paso C: Traducir resultados a lenguaje natural
                    if df.empty:
                        respuesta_final = "No se encontraron datos para tu consulta."
                        df_to_show = None
                    else:
                        # Convertimos los primeros registros a JSON para que Gemini los lea
                        datos_str = df.head(50).to_json(orient="records", force_ascii=False, indent=2)
                        respuesta_final = get_natural_language_response(prompt, datos_str)
                        df_to_show = df

                    # Mostrar resultados
                    st.markdown(respuesta_final)
                    if df_to_show is not None:
                        st.dataframe(df_to_show)

                    # Guardar en historial
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": respuesta_final,
                        "dataframe": df_to_show
                    })

            except psycopg2.Error as db_err:
                st.error(f"Error de base de datos: La consulta SQL generada podría ser inválida. Detalles: {db_err}")
            except Exception as e:
                st.error(f"Ocurrió un error inesperado: {e}")

