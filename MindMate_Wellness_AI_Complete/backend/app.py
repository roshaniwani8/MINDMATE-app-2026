from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
import requests
import os
import json
import traceback
import uuid

# ============================================================
# MINDMATE AI V9000
# LOCAL OLLAMA BACKEND  (FIXED)
# ============================================================

# ------------------------------------------------------------
# PATHS
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------
# OLLAMA
# ------------------------------------------------------------

OLLAMA_BASE = "http://127.0.0.1:11434"
OLLAMA_CHAT_URL = f"{OLLAMA_BASE}/api/chat"
OLLAMA_TAGS_URL = f"{OLLAMA_BASE}/api/tags"
MODEL = "qwen2.5:3b"

SYSTEM_PROMPT = """
You are MindMate, a supportive everyday
wellbeing companion.

Be warm, friendly, respectful and concise.

Help students reflect on their feelings
and everyday wellbeing.

Do not diagnose medical or mental health
conditions.

Do not prescribe medication.

Encourage healthy everyday habits,
reflection, rest, breaks, organization,
and talking to trusted people when useful.

You are a wellbeing companion, not a
replacement for professional care.
"""

# ------------------------------------------------------------
# FLASK
# ------------------------------------------------------------

app = Flask(__name__)

# ------------------------------------------------------------
# IN-MEMORY CONVERSATION STORE
# { conversation_id: [ {role, content}, ... ] }
# ------------------------------------------------------------

conversations = {}


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    index_path = os.path.join(BASE_DIR, "index.html")

    if not os.path.exists(index_path):
        return "index.html not found!", 404

    return send_from_directory(BASE_DIR, "index.html")


# ============================================================
# CSS / JS / OTHER STATIC FILES
# ============================================================

@app.route("/<path:filename>")
def files(filename):
    return send_from_directory(BASE_DIR, filename)


# ============================================================
# HEALTH CHECK   ->  GET /api/health
# ============================================================

@app.route("/api/integrations")
def integrations():
    """Describe included modules and their connection state."""
    path = os.path.join(BASE_DIR, "integrations.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))
    except Exception:
        return jsonify({"integrations": [], "privacy": "Local demo mode"}), 200


@app.route("/api/health")
def health():

    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=5)
        response.raise_for_status()

        data = response.json()

        models = [m.get("name", "") for m in data.get("models", [])]
        model_installed = MODEL in models
        ollama_online = True

        return jsonify({
            "status": "ok",
            "app": "MindMate AI",
            "version": "V9000",
            "flask": "running",
            "ollama": ollama_online,
            "ollama_url": OLLAMA_CHAT_URL,
            "model": MODEL,
            "model_installed": model_installed,
            "available_models": models
        })

    except requests.exceptions.RequestException:

        return jsonify({
            "status": "ok",
            "app": "MindMate AI",
            "version": "V9000",
            "flask": "running",
            "ollama": False,
            "ollama_url": OLLAMA_CHAT_URL,
            "model": MODEL,
            "model_installed": False,
            "available_models": []
        })


# ============================================================
# CHAT (STREAMING)   ->  POST /api/chat
# ============================================================

@app.route("/api/chat", methods=["POST"])
def chat():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({"reply": "Invalid request."}), 400

    user_message = data.get("message", "")
    conversation_id = data.get("conversation_id") or str(uuid.uuid4())

    if not isinstance(user_message, str):
        return jsonify({"reply": "Please send a text message."}), 400

    user_message = user_message.strip()

    if not user_message:
        return jsonify({"reply": "Please type something first. 💚"}), 400

    # Pull existing history for this conversation (or start fresh)
    history = conversations.get(conversation_id, [])
    history.append({"role": "user", "content": user_message})

    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + history,
        "stream": True
    }

    def generate():
        full_reply = ""

        try:
            with requests.post(OLLAMA_CHAT_URL, json=payload, stream=True, timeout=120) as ollama_resp:
                ollama_resp.raise_for_status()

                for line in ollama_resp.iter_lines():
                    if not line:
                        continue

                    try:
                        chunk = json.loads(line.decode("utf-8"))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        continue

                    token = chunk.get("message", {}).get("content", "")

                    if token:
                        full_reply += token
                        yield f"data: {json.dumps({'token': token, 'conversation_id': conversation_id})}\n\n"

                    if chunk.get("done"):
                        break

            if not full_reply.strip():
                full_reply = "I'm here to listen. 💚"
                yield f"data: {json.dumps({'token': full_reply, 'conversation_id': conversation_id})}\n\n"

            history.append({"role": "assistant", "content": full_reply})
            conversations[conversation_id] = history

            yield f"data: {json.dumps({'done': True, 'conversation_id': conversation_id})}\n\n"

        except requests.exceptions.ConnectionError:
            error_payload = {"error": "MindMate can't connect to Ollama. Please make sure Ollama is running."}
            yield f"data: {json.dumps(error_payload)}\n\n"

        except requests.exceptions.Timeout:
            error_payload = {"error": "MindMate is taking too long to respond. Please try again."}
            yield f"data: {json.dumps(error_payload)}\n\n"

        except Exception as error:
            print("\n" + "=" * 60)
            print("MINDMATE CHAT ERROR")
            print("=" * 60)
            print(repr(error))
            traceback.print_exc()
            print("=" * 60 + "\n")

            error_payload = {"error": "Sorry, MindMate couldn't connect right now. Please try again."}
            yield f"data: {json.dumps(error_payload)}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


# ============================================================
# CONVERSATION HISTORY
# ============================================================

@app.route("/api/conversation/<conversation_id>", methods=["GET"])
def get_conversation(conversation_id):

    history = conversations.get(conversation_id, [])

    return jsonify({
        "conversation_id": conversation_id,
        "messages": history
    })


@app.route("/api/conversation/<conversation_id>", methods=["DELETE"])
def delete_conversation(conversation_id):

    conversations.pop(conversation_id, None)

    return jsonify({"status": "deleted", "conversation_id": conversation_id})


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("             MINDMATE AI — COMPLETE WELLNESS SUITE")
    print("=" * 60)
    print("Model :", MODEL)
    print("Ollama:", OLLAMA_CHAT_URL)
    print("Flask : http://127.0.0.1:" + os.getenv("PORT", "8000"))
    print("Files :", BASE_DIR)
    print("=" * 60)

    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "8000")),
        debug=True
    )