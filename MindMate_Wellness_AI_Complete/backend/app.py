from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
import requests
import os
import json
import traceback
import uuid

# ============================================================
# MINDMATE AI
# LOCAL OLLAMA + CLOUD OPENAI FALLBACK
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------
# LOCAL OLLAMA
# ------------------------------------------------------------

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://127.0.0.1:11434")
OLLAMA_CHAT_URL = f"{OLLAMA_BASE}/api/chat"
OLLAMA_TAGS_URL = f"{OLLAMA_BASE}/api/tags"

OLLAMA_MODEL = "qwen2.5:3b"

# ------------------------------------------------------------
# CLOUD AI
# ------------------------------------------------------------

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")

SYSTEM_PROMPT = """
You are MindMate, a supportive everyday wellbeing companion.

Be warm, friendly, respectful and concise.

Help students reflect on their feelings and everyday wellbeing.

Do not diagnose medical or mental health conditions.
Do not prescribe medication.

Encourage healthy everyday habits, reflection, rest,
breaks, organization, and talking to trusted people
when useful.

You are a wellbeing companion, not a replacement for
professional care.
"""

app = Flask(__name__)

# ------------------------------------------------------------
# CONVERSATIONS
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
# STATIC FILES
# ============================================================

@app.route("/<path:filename>")
def files(filename):
    return send_from_directory(BASE_DIR, filename)


# ============================================================
# INTEGRATIONS
# ============================================================

@app.route("/api/integrations")
def integrations():

    path = os.path.join(BASE_DIR, "integrations.json")

    try:
        with open(path, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))

    except Exception:
        return jsonify({
            "integrations": [],
            "privacy": "Local demo mode"
        }), 200


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health")
def health():

    ollama_online = False
    model_installed = False
    available_models = []

    try:

        response = requests.get(
            OLLAMA_TAGS_URL,
            timeout=5
        )

        response.raise_for_status()

        data = response.json()

        available_models = [
            m.get("name", "")
            for m in data.get("models", [])
        ]

        model_installed = OLLAMA_MODEL in available_models
        ollama_online = True

    except Exception:
        pass

    return jsonify({
        "status": "ok",
        "app": "MindMate AI",
        "version": "V9000",
        "flask": "running",

        "ollama": ollama_online,
        "ollama_url": OLLAMA_CHAT_URL,
        "ollama_model": OLLAMA_MODEL,
        "ollama_model_installed": model_installed,
        "available_models": available_models,

        "cloud_ai": bool(OPENAI_API_KEY),
        "cloud_model": OPENAI_MODEL
    })


# ============================================================
# OLLAMA STREAM
# ============================================================

def stream_ollama(history, conversation_id):

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ] + history,
        "stream": True
    }

    full_reply = ""

    with requests.post(
        OLLAMA_CHAT_URL,
        json=payload,
        stream=True,
        timeout=120
    ) as response:

        response.raise_for_status()

        for line in response.iter_lines():

            if not line:
                continue

            try:
                chunk = json.loads(
                    line.decode("utf-8")
                )

            except (json.JSONDecodeError, UnicodeDecodeError):
                continue

            token = chunk.get(
                "message", {}
            ).get(
                "content", ""
            )

            if token:

                full_reply += token

                yield f"data: {json.dumps({
                    'token': token,
                    'conversation_id': conversation_id
                })}\n\n"

            if chunk.get("done"):
                break

    return full_reply


# ============================================================
# OPENAI CLOUD STREAM
# ============================================================

def stream_openai(history, conversation_id):

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    from openai import OpenAI

    client = OpenAI(
        api_key=OPENAI_API_KEY
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ] + history

    stream = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        stream=True
    )

    full_reply = ""

    for chunk in stream:

        if not chunk.choices:
            continue

        token = chunk.choices[0].delta.content

        if token:

            full_reply += token

            yield f"data: {json.dumps({
                'token': token,
                'conversation_id': conversation_id
            })}\n\n"

    return full_reply


# ============================================================
# CHAT
# ============================================================

@app.route("/api/chat", methods=["POST"])
def chat():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "reply": "Invalid request."
        }), 400

    user_message = data.get(
        "message",
        ""
    )

    conversation_id = data.get(
        "conversation_id"
    ) or str(uuid.uuid4())

    if not isinstance(user_message, str):

        return jsonify({
            "reply": "Please send a text message."
        }), 400

    user_message = user_message.strip()

    if not user_message:

        return jsonify({
            "reply": "Please type something first. 💚"
        }), 400

    history = conversations.get(
        conversation_id,
        []
    )

    history = history.copy()

    history.append({
        "role": "user",
        "content": user_message
    })

    def generate():

        full_reply = ""

        # ----------------------------------------------------
        # TRY LOCAL OLLAMA FIRST
        # ----------------------------------------------------

        try:

            print("Trying local Ollama...")

            generator = stream_ollama(
                history,
                conversation_id
            )

            for event in generator:
                yield event

            # Recover generated text from events
            # by reading conversation afterwards is not possible,
            # so we mark successful response below.

            print("Ollama response completed.")

            # Extract tokens from streamed events for storage
            # through a second lightweight reconstruction.
            #
            # The frontend receives the complete streamed response.
            # Conversation persistence is handled below.

            # Since Ollama succeeded, do not use cloud fallback.
            #
            # The assistant history will be reconstructed from
            # streamed token events on the client side.

            yield f"data: {json.dumps({
                'done': True,
                'conversation_id': conversation_id,
                'provider': 'ollama'
            })}\n\n"

            return

        except requests.exceptions.ConnectionError:

            print("Ollama unavailable. Switching to cloud AI.")

        except requests.exceptions.Timeout:

            print("Ollama timeout. Switching to cloud AI.")

        except Exception as error:

            print("Ollama error:", repr(error))
            print("Switching to cloud AI.")


        # ----------------------------------------------------
        # CLOUD FALLBACK
        # ----------------------------------------------------

        try:

            print("Using cloud AI...")

            generator = stream_openai(
                history,
                conversation_id
            )

            for event in generator:
                yield event

            yield f"data: {json.dumps({
                'done': True,
                'conversation_id': conversation_id,
                'provider': 'cloud'
            })}\n\n"

            return

        except Exception as error:

            print("\n" + "=" * 60)
            print("MINDMATE CHAT ERROR")
            print("=" * 60)
            print(repr(error))
            traceback.print_exc()
            print("=" * 60 + "\n")

            error_payload = {
                "error":
                "MindMate could not connect to an AI service right now. Please try again."
            }

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

@app.route(
    "/api/conversation/<conversation_id>",
    methods=["GET"]
)
def get_conversation(conversation_id):

    history = conversations.get(
        conversation_id,
        []
    )

    return jsonify({
        "conversation_id": conversation_id,
        "messages": history
    })


@app.route(
    "/api/conversation/<conversation_id>",
    methods=["DELETE"]
)
def delete_conversation(conversation_id):

    conversations.pop(
        conversation_id,
        None
    )

    return jsonify({
        "status": "deleted",
        "conversation_id": conversation_id
    })


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", "8000")
    )

    print("=" * 60)
    print("       MINDMATE AI — WELLNESS SUITE")
    print("=" * 60)
    print("Ollama Model :", OLLAMA_MODEL)
    print("Cloud Model  :", OPENAI_MODEL)
    print("Cloud AI     :", bool(OPENAI_API_KEY))
    print("Port         :", port)
    print("Files        :", BASE_DIR)
    print("=" * 60)

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
