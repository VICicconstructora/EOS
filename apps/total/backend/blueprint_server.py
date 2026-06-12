"""
Blueprint Analysis Server
Analyzes architectural blueprints using Google Gemini.
API key is loaded from .env — no need to send it from the frontend.
"""

import os
import io
import json
import sys
import uuid
import base64
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai as google_genai
from google.genai import types as genai_types

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import fitz as pymupdf  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

# Force UTF-8 mode on Windows
os.environ.setdefault('PYTHONUTF8', '1')
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
SKILLS_FILE = os.path.join(os.path.dirname(__file__), 'skills.json')

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

# ── Prompt template ────────────────────────────────────────────────────────────
BLUEPRINT_BASE_PROMPT = """
You are an expert architectural blueprint analyzer. Analyze the provided blueprint image
following these strict rules:

{skill_rules}

## RESTRICTION VARIABLES:
{restrictions}

## BOUNDING BOX INSTRUCTIONS:
For every item in `elementos_encontrados` and `restricciones_cruzadas`, include:
- `bbox`: normalized coordinates [x_min, y_min, x_max, y_max], each value between 0.0 and 1.0,
  indicating where in the page that element or violation is located.
  x_min/y_min = top-left corner, x_max/y_max = bottom-right corner.
  Omit or set to null if location is unclear or spans the whole image.
  Be precise — bbox should tightly surround the relevant area.
- `page`: 1-based page number where the element is found (use 1 if single-page or unknown).

## RESPONSE FORMAT (respond in Spanish, use JSON):
{{
  "resumen": "Brief general description of the blueprint",
  "elementos_encontrados": [
    {{
      "tipo": "element type",
      "descripcion": "description",
      "dimensiones": "dimensions if visible",
      "ubicacion": "approximate location in blueprint",
      "bbox": [0.1, 0.2, 0.4, 0.5]
    }}
  ],
  "restricciones_cruzadas": [
    {{
      "restriccion": "restriction name",
      "cumple": true/false,
      "comentario": "detailed comment on compliance",
      "bbox": [0.1, 0.2, 0.4, 0.5]
    }}
  ],
  "observaciones": ["General observation 1"],
  "alertas": ["Critical alert if any"]
}}
"""


# ── Skills helpers ─────────────────────────────────────────────────────────────

def load_skills() -> dict:
    try:
        with open(SKILLS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"directions": []}


def save_skills(data: dict):
    with open(SKILLS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def find_chapter(data: dict, chapter_id: str):
    """Returns (direction, chapter) or (None, None)."""
    for direction in data.get('directions', []):
        for chapter in direction.get('chapters', []):
            if chapter['id'] == chapter_id:
                return direction, chapter
    return None, None


def find_skill(data: dict, skill_id: str):
    """Returns (direction, chapter, skill) or (None, None, None)."""
    for direction in data.get('directions', []):
        for chapter in direction.get('chapters', []):
            for skill in chapter.get('skills', []):
                if skill['id'] == skill_id:
                    return direction, chapter, skill
    return None, None, None


def get_active_skill_rules() -> str:
    data = load_skills()
    rules = []
    for direction in data.get('directions', []):
        for chapter in direction.get('chapters', []):
            for skill in chapter.get('skills', []):
                if not skill.get('active'):
                    continue
                dir_name = direction.get('name', '')
                ch_name = chapter.get('name', '')
                sk_name = skill.get('name', '')
                sk_desc = skill.get('description', '')
                header = f"### [{dir_name} / {ch_name}] {sk_name}\n{sk_desc}"
                instructions = skill.get('instructions', skill.get('prompt', ''))
                if isinstance(instructions, list):
                    instr_text = "\n".join(f"- {i}" for i in instructions)
                else:
                    instr_text = f"- {instructions}"
                rules.append(f"{header}\n{instr_text}")
    return "\n\n".join(rules) if rules else "No hay skills activos configurados."


def pdf_page_to_image_bytes(pdf_bytes: bytes, page_num: int = 0) -> bytes | None:
    """Render a PDF page to PNG bytes using PyMuPDF at 2× resolution."""
    if not PYMUPDF_AVAILABLE:
        return None
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_idx = max(0, min(page_num, len(doc) - 1))
        page = doc[page_idx]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
        return pix.tobytes("png")
    except Exception:
        return None


def crop_snapshot(image_bytes: bytes, bbox: list, padding: float = 0.10) -> str | None:
    """Crop a region with context, draw a red highlight box at the exact bbox, return base64 PNG."""
    if not PIL_AVAILABLE or not bbox or len(bbox) != 4:
        return None
    try:
        from PIL import ImageDraw
        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
        w, h = img.size

        # Exact problem area in pixels (for the red box)
        ex0, ey0 = int(bbox[0] * w), int(bbox[1] * h)
        ex1, ey1 = int(bbox[2] * w), int(bbox[3] * h)

        # Draw the red rectangle directly on the full image before cropping
        draw = ImageDraw.Draw(img)
        line_w = max(2, int(min(w, h) * 0.004))
        draw.rectangle([ex0, ey0, ex1, ey1], outline=(220, 38, 38), width=line_w)
        # Small filled corner markers for better visibility
        m = line_w * 4
        for cx, cy in [(ex0, ey0), (ex1, ey0), (ex0, ey1), (ex1, ey1)]:
            draw.ellipse([cx - m // 2, cy - m // 2, cx + m // 2, cy + m // 2],
                         fill=(220, 38, 38))

        # Crop with generous padding to provide spatial context
        x0 = max(0, int((bbox[0] - padding) * w))
        y0 = max(0, int((bbox[1] - padding) * h))
        x1 = min(w, int((bbox[2] + padding) * w))
        y1 = min(h, int((bbox[3] + padding) * h))
        if x1 <= x0 or y1 <= y0:
            return None
        cropped = img.crop((x0, y0, x1, y1))

        max_dim = 640
        if max(cropped.width, cropped.height) > max_dim:
            ratio = max_dim / max(cropped.width, cropped.height)
            cropped = cropped.resize(
                (int(cropped.width * ratio), int(cropped.height * ratio)),
                PILImage.LANCZOS,
            )
        buf = io.BytesIO()
        cropped.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return None


def _attach_snapshots(result: dict, file_data: bytes, is_pdf: bool = False):
    """Mutate result in-place: add base64 snapshot to each item that has a valid bbox."""
    # Cache rendered PDF pages so we don't re-render for every item
    pdf_page_cache: dict = {}

    def get_image_bytes(item: dict):
        if not is_pdf:
            return file_data
        page_num = max(0, int(item.get("page", 1)) - 1)
        if page_num not in pdf_page_cache:
            pdf_page_cache[page_num] = pdf_page_to_image_bytes(file_data, page_num)
        return pdf_page_cache[page_num]

    for collection in ("restricciones_cruzadas", "elementos_encontrados"):
        for item in result.get(collection, []):
            bbox = item.get("bbox")
            if not isinstance(bbox, list):
                continue
            img = get_image_bytes(item)
            if img:
                snap = crop_snapshot(img, bbox)
                if snap:
                    item["snapshot"] = snap


def _get_media_type(filename_lower: str) -> str:
    if filename_lower.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if filename_lower.endswith(".gif"):
        return "image/gif"
    if filename_lower.endswith(".webp"):
        return "image/webp"
    if filename_lower.endswith(".pdf"):
        return "application/pdf"
    return "image/png"


def _extract_json(response_text: str) -> dict:
    json_start = response_text.find("{")
    json_end = response_text.rfind("}") + 1
    if json_start >= 0 and json_end > json_start:
        return json.loads(response_text[json_start:json_end])
    return {
        "resumen": response_text,
        "elementos_encontrados": [],
        "restricciones_cruzadas": [],
        "observaciones": [],
        "alertas": ["No se pudo estructurar la respuesta automáticamente."],
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "blueprint-analyzer",
                    "api_key_configured": bool(GEMINI_API_KEY)})


# ── Direction endpoints ────────────────────────────────────────────────────────

@app.route("/api/skills", methods=["GET"])
def get_skills():
    return jsonify(load_skills())


@app.route("/api/skills/direction", methods=["POST"])
def add_direction():
    body = request.get_json() or {}
    name = body.get('name', '').strip()
    if not name:
        return jsonify({"error": "El nombre de la dirección es requerido."}), 400
    data = load_skills()
    new_dir = {"id": str(uuid.uuid4()), "name": name, "chapters": []}
    data['directions'].append(new_dir)
    save_skills(data)
    return jsonify(new_dir), 201


@app.route("/api/skills/direction/<dir_id>", methods=["PATCH"])
def rename_direction(dir_id):
    body = request.get_json() or {}
    name = body.get('name', '').strip()
    if not name:
        return jsonify({"error": "El nombre es requerido."}), 400
    data = load_skills()
    for direction in data['directions']:
        if direction['id'] == dir_id:
            direction['name'] = name
            save_skills(data)
            return jsonify(direction)
    return jsonify({"error": "Dirección no encontrada."}), 404


@app.route("/api/skills/direction/<dir_id>", methods=["DELETE"])
def delete_direction(dir_id):
    data = load_skills()
    data['directions'] = [d for d in data['directions'] if d['id'] != dir_id]
    save_skills(data)
    return jsonify({"success": True})


# ── Chapter endpoints ──────────────────────────────────────────────────────────

@app.route("/api/skills/chapter", methods=["POST"])
def add_chapter():
    body = request.get_json() or {}
    direction_id = body.get('direction_id', '')
    name = body.get('name', '').strip()
    if not direction_id or not name:
        return jsonify({"error": "direction_id y name son requeridos."}), 400
    data = load_skills()
    for direction in data['directions']:
        if direction['id'] == direction_id:
            new_ch = {"id": str(uuid.uuid4()), "name": name, "skills": []}
            direction['chapters'].append(new_ch)
            save_skills(data)
            return jsonify(new_ch), 201
    return jsonify({"error": "Dirección no encontrada."}), 404


@app.route("/api/skills/chapter/<chapter_id>", methods=["PATCH"])
def rename_chapter(chapter_id):
    body = request.get_json() or {}
    name = body.get('name', '').strip()
    if not name:
        return jsonify({"error": "El nombre es requerido."}), 400
    data = load_skills()
    _, chapter = find_chapter(data, chapter_id)
    if chapter is None:
        return jsonify({"error": "Capítulo no encontrado."}), 404
    chapter['name'] = name
    save_skills(data)
    return jsonify(chapter)


@app.route("/api/skills/chapter/<chapter_id>", methods=["DELETE"])
def delete_chapter(chapter_id):
    data = load_skills()
    for direction in data['directions']:
        direction['chapters'] = [c for c in direction['chapters'] if c['id'] != chapter_id]
    save_skills(data)
    return jsonify({"success": True})


# ── Skill endpoints ────────────────────────────────────────────────────────────

@app.route("/api/skills/skill", methods=["POST"])
def add_skill():
    body = request.get_json() or {}
    chapter_id = body.get('chapter_id', '')
    name = body.get('name', '').strip()
    description = body.get('description', '').strip()
    instructions = body.get('instructions', [])
    usage_example = body.get('usage_example', '').strip()
    if not chapter_id or not name or not description:
        return jsonify({"error": "chapter_id, name y description son requeridos."}), 400
    if isinstance(instructions, str):
        instructions = [l.strip() for l in instructions.splitlines() if l.strip()]
    data = load_skills()
    _, chapter = find_chapter(data, chapter_id)
    if chapter is None:
        return jsonify({"error": "Capítulo no encontrado."}), 404
    new_skill = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "instructions": instructions,
        "usage_example": usage_example,
        "active": True,
    }
    chapter['skills'].append(new_skill)
    save_skills(data)
    return jsonify(new_skill), 201


@app.route("/api/skills/skill/<skill_id>", methods=["PATCH"])
def edit_skill(skill_id):
    body = request.get_json() or {}
    data = load_skills()
    _, _, skill = find_skill(data, skill_id)
    if skill is None:
        return jsonify({"error": "Skill no encontrado."}), 404
    if 'name' in body and body['name'].strip():
        skill['name'] = body['name'].strip()
    if 'description' in body:
        skill['description'] = body['description'].strip()
    if 'instructions' in body:
        instructions = body['instructions']
        if isinstance(instructions, str):
            instructions = [l.strip() for l in instructions.splitlines() if l.strip()]
        skill['instructions'] = instructions
    if 'usage_example' in body:
        skill['usage_example'] = body['usage_example'].strip()
    if 'active' in body:
        skill['active'] = bool(body['active'])
    save_skills(data)
    return jsonify(skill)


@app.route("/api/skills/skill/<skill_id>", methods=["DELETE"])
def delete_skill(skill_id):
    data = load_skills()
    for direction in data['directions']:
        for chapter in direction['chapters']:
            chapter['skills'] = [s for s in chapter['skills'] if s['id'] != skill_id]
    save_skills(data)
    return jsonify({"success": True})


@app.route("/api/skills/skill/<skill_id>/move", methods=["PATCH"])
def move_skill(skill_id):
    body = request.get_json() or {}
    target_chapter_id = body.get('chapter_id', '')
    if not target_chapter_id:
        return jsonify({"error": "chapter_id requerido."}), 400
    data = load_skills()
    skill_obj = None
    for direction in data.get('directions', []):
        for chapter in direction.get('chapters', []):
            match = [s for s in chapter.get('skills', []) if s.get('id') == skill_id]
            if match:
                skill_obj = match[0]
                chapter['skills'] = [s for s in chapter.get('skills', []) if s.get('id') != skill_id]
                break
        if skill_obj:
            break
    if skill_obj is None:
        return jsonify({"error": "Skill no encontrado."}), 404
    _, target_chapter = find_chapter(data, target_chapter_id)
    if target_chapter is None:
        return jsonify({"error": "Capítulo destino no encontrado."}), 404
    target_chapter['skills'].append(skill_obj)
    save_skills(data)
    return jsonify(skill_obj)


@app.route("/api/skills/skill/<skill_id>/toggle", methods=["PATCH"])
def toggle_skill(skill_id):
    data = load_skills()
    _, _, skill = find_skill(data, skill_id)
    if skill is None:
        return jsonify({"error": "Skill no encontrado."}), 404
    skill['active'] = not skill.get('active', True)
    save_skills(data)
    return jsonify({"id": skill_id, "active": skill['active']})


# ── Chat endpoint ──────────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def chat():
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY no configurada."}), 500
    body = request.get_json() or {}
    message = body.get('message', '').strip()
    analysis_context = body.get('analysis_context', None)
    if not message:
        return jsonify({"error": "El mensaje no puede estar vacío."}), 400

    system_prompt = (
        "Eres un asistente experto en análisis arquitectónico. "
        "Responde en español de forma clara y concisa. "
        "Si se te provee contexto de un análisis previo de plano, úsalo para responder preguntas."
    )
    if analysis_context:
        context_text = json.dumps(analysis_context, ensure_ascii=False, indent=2)
        full_message = f"CONTEXTO DEL ANÁLISIS:\n{context_text}\n\nPREGUNTA:\n{message}"
    else:
        full_message = message

    try:
        client = google_genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[system_prompt, full_message],
            config=genai_types.GenerateContentConfig(temperature=0.5, top_p=0.95),
        )
        return jsonify({"success": True, "reply": response.text})
    except Exception as e:
        return jsonify({"error": f"Error en el chat: {str(e)}"}), 500


# ── Analyze blueprint ──────────────────────────────────────────────────────────

@app.route("/api/analyze-blueprint", methods=["POST"])
def analyze_blueprint():
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY no configurada en el servidor (.env)."}), 500
    if "blueprint" not in request.files:
        return jsonify({"error": "No se recibió ningún archivo de plano."}), 400

    file = request.files["blueprint"]
    restrictions_raw = request.form.get("restrictions", "[]")
    try:
        restrictions = json.loads(restrictions_raw)
    except json.JSONDecodeError:
        restrictions = []

    restrictions_text = (
        "\n".join(
            f"- **{r.get('nombre', 'Sin nombre')}**: {r.get('valor', '')} — {r.get('descripcion', '')}"
            for r in restrictions
        ) if restrictions else "No se definieron restricciones adicionales."
    )

    file_data = file.read()
    file_size_mb = len(file_data) / (1024 * 1024)
    filename_lower = file.filename.lower()
    max_mb = 20 if filename_lower.endswith(".pdf") else 5
    if file_size_mb > max_mb:
        return jsonify({"error": f"El archivo es demasiado grande ({file_size_mb:.1f} MB). "
                        f"Límite: {max_mb} MB."}), 400

    skill_rules = get_active_skill_rules()
    media_type = _get_media_type(filename_lower)
    prompt = BLUEPRINT_BASE_PROMPT.format(skill_rules=skill_rules, restrictions=restrictions_text)

    try:
        client = google_genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                genai_types.Part.from_bytes(data=file_data, mime_type=media_type),
                prompt + "\n\nAnaliza este plano arquitectónico y devuelve el JSON solicitado.",
            ],
            config=genai_types.GenerateContentConfig(
                temperature=0.2, top_p=0.95, response_mime_type="application/json",
            ),
        )
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            result = _extract_json(response.text)
        _attach_snapshots(result, file_data, is_pdf=filename_lower.endswith(".pdf"))
        return jsonify({"success": True, "analysis": result})
    except Exception as e:
        return jsonify({"error": f"Error al analizar el plano: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
