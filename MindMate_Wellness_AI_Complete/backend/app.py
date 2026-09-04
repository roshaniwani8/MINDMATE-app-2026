from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory,
    Response,
    stream_with_context
)

import os
import json
import uuid
import traceback
import requests


# ============================================================
# MINDMATE AI
# GROQ CLOUD + LOCAL OLLAMA
# RENDER READY
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

# -------------------------
# Ollama - LOCAL ONLY
# -------------------------

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


# -------------------------
# Groq - CLOUD
# -------------------------

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY"
)

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile"
)


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are MindMate, a supportive everyday wellbeing companion.

Your personality:
- Warm
- Friendly
- Calm
- Respectful
- Encouraging
- Concise

Help students with:
- Everyday stress
- Study pressure
- Motivation
- Organization
- Healthy routines
- Reflection
- General wellbeing
- School and college life

Important:
- Do not diagnose medical or mental health conditions.
- Do not prescribe medication.
- Do not pretend to be a doctor or therapist.
- Encourage healthy everyday habits.
- Encourage talking to a trusted person when appropriate.
- Keep responses practical and easy to understand.

You are a wellbeing companion, not a replacement for
professional healthcare.
"""


# ============================================================
# CONVERSATION MEMORY
# ============================================================

conversations = {}


# ============================================================
# FRONTEND FILES
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

    path = os.path.join(
        BASE_DIR,
        "integrations.json"
    )

    if os.path.exists(path):

        return send_from_directory(
            BASE_DIR,
            "integrations.json"
        )

    return jsonify({
        "integrations": [],
        "privacy": "Local demo mode"
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health")
def health():

    ollama_online = False
    ollama_model_installed = False
    available_models = []

    # ----------------------------------------
    # Check Ollama
    # ----------------------------------------

    try:

        response = requests.get(
            OLLAMA_TAGS_URL,
            timeout=3
        )

        response.raise_for_status()

        data = response.json()

        available_models = [
            model.get("name", "")
            for model in data.get(
                "models",
                []
            )
        ]

        ollama_online = True

        ollama_model_installed = (
            OLLAMA_MODEL in available_models
        )

    except Exception:

        pass


    # ----------------------------------------
    # Return status
    # ----------------------------------------

    return jsonify({

        "status": "ok",

        "app": "MindMate AI",

        "version": "V9000",

        "flask": "running",

        "ollama": ollama_online,

        "ollama_model": OLLAMA_MODEL,

        "ollama_model_installed":
            ollama_model_installed,

        "available_models":
            available_models,

        "cloud_ai":
            bool(GROQ_API_KEY),

        "cloud_provider":
            "Groq",

        "cloud_model":
            GROQ_MODEL

    })


# ============================================================
# INTEGRATIONS API
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

            "privacy":
                "Local demo mode"

        })


# ============================================================
# LOCAL OLLAMA STREAM
# ============================================================

def stream_ollama(
    history
):

    payload = {

        "model":
            OLLAMA_MODEL,

        "messages": [

            {
                "role":
                    "system",

                "content":
                    SYSTEM_PROMPT
            }

        ] + history,

        "stream":
            True
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

                "type":
                    "token",

                "token":
                    token
            }


        if chunk.get("done"):

            break


    yield {

        "type":
            "complete",

        "reply":
            full_reply
    }


# ============================================================
# GROQ STREAM
# ============================================================

def stream_groq(
    history
):

    if not GROQ_API_KEY:

        raise RuntimeError(
            "GROQ_API_KEY is not configured."
        )


    from groq import Groq


    client = Groq(
        api_key=GROQ_API_KEY
    )


    messages = [

        {
            "role":
                "system",

            "content":
                SYSTEM_PROMPT
        }

    ] + history


    stream = client.chat.completions.create(

        model=GROQ_MODEL,

        messages=messages,

        temperature=0.7,

        max_completion_tokens=1024,

        stream=True
    )


    full_reply = ""


    for chunk in stream:

        if not chunk.choices:

            continue


        token = (
            chunk
            .choices[0]
            .delta
            .content
        )


        if token:

            full_reply += token

            yield {

                "type":
                    "token",

                "token":
                    token
            }


    yield {

        "type":
            "complete",

        "reply":
            full_reply
    }


# ============================================================
# CHAT API
# ============================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
def chat():

    data = request.get_json(
        silent=True
    )


    # ----------------------------------------
    # Validate request
    # ----------------------------------------

    if not data:

        return jsonify({

            "error":
                "Invalid request."

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

            "error":
                "Message must be text."

        }), 400


    user_message = (
        user_message
        .strip()
    )


    if not user_message:

        return jsonify({

            "error":
                "Please type a message."

        }), 400


    # ----------------------------------------
    # Conversation ID
    # ----------------------------------------

    conversation_id = (

        data.get(
            "conversation_id"
        )

        or str(uuid.uuid4())

    )


    # ----------------------------------------
    # Existing history
    # ----------------------------------------

    history = conversations.get(

        conversation_id,

        []

    )


    history = list(history)


    # Add user message

    history.append({

        "role":
            "user",

        "content":
            user_message

    })


    # ========================================================
    # STREAM GENERATOR
    # ========================================================

    def generate():

        provider = None

        full_reply = ""


        # ====================================================
        # FIRST: TRY OLLAMA
        # ====================================================

        try:

            print(
                "Trying local Ollama..."
            )


            for event in stream_ollama(
                history
            ):

                if event["type"] == "token":

                    token = event["token"]

                    full_reply += token


                    yield (
                        "data: "
                        + json.dumps({

                            "token":
                                token,

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

            provider = None


        # ====================================================
        # SECOND: GROQ CLOUD
        # ====================================================

        if provider is None:

            try:

                print(
                    "Using Groq:",
                    GROQ_MODEL
                )


                for event in stream_groq(
                    history
                ):

                    if event["type"] == "token":

                        token = event["token"]

                        full_reply += token


                        yield (
                            "data: "
                            + json.dumps({

                                "token":
                                    token,

                                "conversation_id":
                                    conversation_id

                            })
                            + "\n\n"
                        )


                    elif event["type"] == "complete":

                        provider = "groq"


                print(
                    "Groq response successful."
                )


            except Exception as error:

                print("")
                print("=" * 60)
                print("MINDMATE GROQ ERROR")
                print("=" * 60)
                print(
                    repr(error)
                )
                traceback.print_exc()
                print("=" * 60)
                print("")


                yield (
                    "data: "
                    + json.dumps({

                        "error":
                        "MindMate could not connect to the AI service. Please check the AI configuration."

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
            ] = (

                history
                + [
                    {
                        "role":
                            "assistant",

                        "content":
                            full_reply
                    }
                ]

            )


        # ====================================================
        # SEND DONE EVENT
        # ====================================================

        yield (
            "data: "
            + json.dumps({

                "done":
                    True,

                "conversation_id":
                    conversation_id,

                "provider":
                    provider

            })
            + "\n\n"
        )


    # ========================================================
    # SSE RESPONSE
    # ========================================================

    return Response(

        stream_with_context(
            generate()
        ),

        content_type=
            "text/event-stream; charset=utf-8",

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

        "status":
            "deleted",

        "conversation_id":
            conversation_id

    })


# ============================================================
# 404
# ============================================================

@app.errorhandler(404)
def route_not_found(error):

    return jsonify({

        "error":
            "Route not found",

        "path":
            request.path

    }), 404


# ============================================================
# LOCAL RUN
# ============================================================

if __name__ == "__main__":

    port = int(

        os.getenv(
            "PORT",
            "8000"
        )

    )


    print("=" * 60)
    print("MINDMATE AI — WELLNESS SUITE")
    print("=" * 60)

    print(
        "Base directory:",
        BASE_DIR
    )

    print(
        "Ollama:",
        OLLAMA_CHAT_URL
    )

    print(
        "Ollama model:",
        OLLAMA_MODEL
    )

    print(
        "Groq configured:",
        bool(GROQ_API_KEY)
    )

    print(
        "Groq model:",
        GROQ_MODEL
    )

    print(
        "Port:",
        port
    )

    print("=" * 60)


    app.run(

        host="0.0.0.0",

        port=port,

        debug=False

    )
