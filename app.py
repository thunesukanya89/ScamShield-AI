from flask import Flask, send_from_directory, request, jsonify
import requests
import os
import re

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "llama3.2"


@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/style.css")
def stylesheet():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/script.js")
def javascript():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()

    if not message:
        return jsonify({
            "error": "Please enter a message to analyze."
        }), 400

    prompt = f"""
You are ScamShield AI, a scam detection assistant.

Analyze the message for scams, phishing, fraud, fake prizes,
suspicious links, impersonation, or requests for money,
passwords, PINs, and OTPs.

Choose exactly one risk level:
HIGH = strong indicators of fraud or phishing.
MEDIUM = suspicious or insufficient information.
LOW = ordinary, apparently harmless messages with no obvious
scam indicators.

An unexpected prize that requires an upfront processing fee
is normally HIGH risk.
A simple greeting or ordinary invitation to meet is normally
LOW risk unless other suspicious details appear.

Never guarantee that a message is safe.

Return this format:
Risk: HIGH, MEDIUM, or LOW
Verdict: A short explanation.
Warning Signs: List any warning signs.
Advice: Practical safety advice.

Message:
{message}
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": False
            },
            timeout=180
        )

        response.raise_for_status()
        answer = response.json()["message"]["content"]

        # Recognize Risk: LOW and **Risk:** LOW formats.
        match = re.search(
            r"\bRISK\s*:\s*\**\s*(HIGH|MEDIUM|LOW)\b",
            answer,
            re.IGNORECASE
        )

        risk = match.group(1).upper() if match else "MEDIUM"

        return jsonify({
            "response": answer,
            "risk": risk
        })

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Ollama is not running. Open Ollama and try again."
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "The AI took too long to respond. Please try again."
        }), 504

    except Exception as error:
        app.logger.exception("Message analysis failed")
        return jsonify({
            "error": f"Analysis failed: {error}"
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
