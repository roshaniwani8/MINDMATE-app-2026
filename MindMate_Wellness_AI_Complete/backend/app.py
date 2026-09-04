from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory,
    Response,
    stream_with_context
)

import requests
import os
import json
import traceback
import uuid


# ============================================================
# MINDMATE AI — RENDER + LOCAL
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)


# ============================================================
# CONFIG
# ============================================================

OLLAMA_BASE = os.getenv(
    "OLLAMA_BASE",
    "http://127.0.0.1:11434"
)

OLLAMA_CHAT_URL = f"{OLLAMA_BASE}/api/chat"
OLLAMA_TAGS_URL = f"{OLLAMA_BASE}/api/tags"

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b"
)


# ------------------------------------------------------------
# CLOUD AI
# ------------------------------------------------------------

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile"
)

# ============================================================
# SYSTEM PROMPT
# ============================================================

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


# ============================================================
# CONVERSATIONS
# ============================================================

conversations = {}


# ============================================================
# FRONTEND
# ============================================================

@app.route("/")
def home():

    return send_from_directory(
        BASE_DIR,
        "index.html"
    )


@app.route("/style.css")
def style_css():

    return send_from_directory(
        BASE_DIR,
        "style.css"
    )


@app.route("/script.js")
def script_js():

    return send_from_directory(
        BASE_DIR,
        "script.js"
    )


@app.route("/integrations.json")
def integrations_file():

    return send_from_directory(
        BASE_DIR,
        "integrations.json"
    )


# ============================================================
# HEALTH
# ============================================================

@app.route("/api/health")
def health():

    ollama_online = False
    model_installed = False
    available_models = []

    try:

        response = requests.get(
            OLLAMA_TAGS_URL,
            timeout=3
        )

        response.raise_for_status()

        data = response.json()

        available_models = [
            model.get("name", "")
            for model in data.get("models", [])
        ]

        model_installed = (
            OLLAMA_MODEL in available_models
        )

        ollama_online = True

    except Exception:
        pass


    return jsonify({

        "status": "ok",

        "app": "MindMate AI",

        "version": "V9000",

        "flask": "running",

        "ollama": ollama_online,

        "ollama_model": OLLAMA_MODEL,

        "ollama_model_installed": model_installed,

        "available_models": available_models,

        "cloud_ai": bool(OPENAI_API_KEY),

        "cloud_model": OPENAI_MODEL

    })


# ============================================================
# INTEGRATIONS
# ============================================================

@app.route("/api/integrations")
def integrations():

    path = os.path.join(
        BASE_DIR,
        "integrations.json"
    )

    try:

        with open(
            path,
            "r",
            encoding="utf-8"
        ) as file:

            return jsonify(
                json.load(file)
            )

    except Exception:

        return jsonify({
            "integrations": [],
            "privacy": "Local demo mode"
        })


# ============================================================
# OLLAMA
# ============================================================

def stream_ollama(
    history,
    conversation_id
):

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


    response = requests.post(

        OLLAMA_CHAT_URL,

        json=payload,

        stream=True,

        timeout=120

    )

    response.raise_for_status()


    full_reply = ""


    for line in response.iter_lines():

        if not line:
            continue

        try:

            chunk = json.loads(
                line.decode("utf-8")
            )

        except Exception:

            continue


        token = (
            chunk
            .get("message", {})
            .get("content", "")
        )


        if token:

            full_reply += token

            yield {

                "type": "token",

                "token": token

            }


        if chunk.get("done"):

            break


    yield {

        "type": "complete",

        "reply": full_reply

    }


# ============================================================
# OPENAI CLOUD
# ============================================================

def stream_openai(
    history,
    conversation_id
):

    if not OPENAI_API_KEY:

        raise RuntimeError(
            "OPENAI_API_KEY is not configured on Render."
        )


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


        token = (
            chunk.choices[0]
            .delta
            .content
        )


        if token:

            full_reply += token

            yield {

                "type": "token",

                "token": token

            }


    yield {

        "type": "complete",

        "reply": full_reply

    }


# ============================================================
# CHAT
# ============================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
def chat():

    data = request.get_json(
        silent=True
    )


    if not data:

        return jsonify({
            "error": "Invalid request."
        }), 400


    user_message = data.get(
        "message",
        ""
    )


    if not isinstance(
        user_message,
        str
    ):

        return jsonify({
            "error": "Message must be text."
        }), 400


    user_message = user_message.strip()


    if not user_message:

        return jsonify({
            "error": "Please type a message."
        }), 400


    conversation_id = (
        data.get("conversation_id")
        or str(uuid.uuid4())
    )


    history = conversations.get(
        conversation_id,
        []
    )


    history = list(history)


    history.append({

        "role": "user",

        "content": user_message

    })


    def generate():

        provider = None

        full_reply = ""


        # ====================================================
        # 1. TRY OLLAMA
        # ====================================================

        try:

            print(
                "Trying Ollama:",
                OLLAMA_CHAT_URL
            )


            for event in stream_ollama(
                history,
                conversation_id
            ):

                if event["type"] == "token":

                    token = event["token"]

                    full_reply += token


                    yield (
                        "data: "
                        + json.dumps({
                            "token": token,
                            "conversation_id":
                                conversation_id
                        })
                        + "\n\n"
                    )


                elif event["type"] == "complete":

                    provider = "ollama"


            print(
                "Ollama response successful."
            )


        except Exception as error:

            print(
                "Ollama unavailable:",
                repr(error)
            )

            full_reply = ""


        # ====================================================
        # 2. CLOUD FALLBACK
        # ====================================================

        if provider is None:

            try:

                print(
                    "Using cloud AI:",
                    OPENAI_MODEL
                )


                for event in stream_openai(
                    history,
                    conversation_id
                ):

                    if event["type"] == "token":

                        token = event["token"]

                        full_reply += token


                        yield (
                            "data: "
                            + json.dumps({
                                "token": token,
                                "conversation_id":
                                    conversation_id
                            })
                            + "\n\n"
                        )


                    elif event["type"] == "complete":

                        provider = "cloud"


                print(
                    "Cloud AI response successful."
                )


            except Exception as error:

                print("")
                print("=" * 60)
                print("MINDMATE CLOUD AI ERROR")
                print("=" * 60)
                print(repr(error))
                traceback.print_exc()
                print("=" * 60)


                yield (
                    "data: "
                    + json.dumps({
                        "error":
                        "MindMate could not connect to an AI service right now. Please try again.",
                        "conversation_id":
                            conversation_id
                    })
                    + "\n\n"
                )

                return


        # ====================================================
        # SAVE CONVERSATION
        # ====================================================

        if full_reply:

            conversations[
                conversation_id
            ] = history + [

                {
                    "role": "assistant",

                    "content": full_reply
                }

            ]


        # ====================================================
        # DONE
        # ====================================================

        yield (
            "data: "
            + json.dumps({

                "done": True,

                "conversation_id":
                    conversation_id,

                "provider":
                    provider or "unknown"

            })
            + "\n\n"
        )


    return Response(

        stream_with_context(
            generate()
        ),

        content_type=(
            "text/event-stream; "
            "charset=utf-8"
        ),

        headers={

            "Cache-Control":
                "no-cache, no-store, must-revalidate",

            "Connection":
                "keep-alive",

            "X-Accel-Buffering":
                "no"

        }

    )


# ============================================================
# GET CONVERSATION
# ============================================================

@app.route(
    "/api/conversation/<conversation_id>",
    methods=["GET"]
)
def get_conversation(
    conversation_id
):

    history = conversations.get(
        conversation_id,
        []
    )


    return jsonify({

        "conversation_id":
            conversation_id,

        "messages":
            history

    })


# ============================================================
# DELETE CONVERSATION
# ============================================================

@app.route(
    "/api/conversation/<conversation_id>",
    methods=["DELETE"]
)
def delete_conversation(
    conversation_id
):

    conversations.pop(
        conversation_id,
        None
    )


    return jsonify({

        "status": "deleted",

        "conversation_id":
            conversation_id

    })


# ============================================================
# 404 HANDLER
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "error": "Route not found",

        "path": request.path

    }), 404


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv(
            "PORT",
            "8000"
        )
    )


    print("=" * 60)
    print("MINDMATE AI")
    print("=" * 60)
    print("Base directory :", BASE_DIR)
    print("Ollama         :", OLLAMA_CHAT_URL)
    print("Ollama model   :", OLLAMA_MODEL)
    print("Cloud AI       :", bool(OPENAI_API_KEY))
    print("Cloud model    :", OPENAI_MODEL)
    print("Port           :", port)
    print("=" * 60)


    app.run(

        host="0.0.0.0",

        port=port,

        debug=False

    )
    
