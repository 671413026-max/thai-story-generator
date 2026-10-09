import os
import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("AIFORTHAI_API_KEY", "").strip()
DEFAULT_PORT = int(os.getenv("PORT", 5000))

SYSTEM_PROMPT = """คุณเป็นนักเล่านิทานสำหรับเด็ก แต่งนิทานภาษาไทยยาว 3-4 ย่อหน้า
ต้องมีคำที่ผู้ใช้ให้มาอยู่ในเรื่อง ปิดท้ายด้วยหัวข้อ 'ข้อคิดจากนิทาน' 1-2 ข้อ"""

def call_pathumma_llm(keywords: str) -> str:
    """
    Call Pathumma LLM API using AI for Thai service.
    First tries textqa/completion endpoint, then fallback to pathumma-chat.
    """
    if not API_KEY:
        raise ValueError("ไม่พบ API Key ในไฟล์ .env กรุณาตรวจสอบการตั้งค่า")

    # Method 1: Pathumma TextQA completion endpoint
    url = "https://api.aiforthai.in.th/textqa/completion"
    headers = {
        "Apikey": API_KEY,
        "X-lib": "aift"
    }
    payload = {
        "instruction": f"แต่งนิทานโดยใช้คำเหล่านี้: {keywords}",
        "system_prompt": SYSTEM_PROMPT,
        "max_new_tokens": 800,
        "temperature": 0.7,
        "return_json": True
    }

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=45)
        if response.status_code == 200:
            res_data = response.json()
            if isinstance(res_data, dict) and "content" in res_data and res_data["content"]:
                return res_data["content"].strip()
            elif isinstance(res_data, str) and res_data.strip():
                return res_data.strip()
    except Exception as e:
        app.logger.warning(f"TextQA completion attempt failed: {e}")

    # Method 2: Fallback to pathumma-chat
    chat_url = "https://api.aiforthai.in.th/pathumma-chat"
    chat_payload = {
        "prompt": f"{SYSTEM_PROMPT}\n\nคำที่ต้องมีในนิทาน: {keywords}\nกรุณาเริ่มเล่านิทาน:",
        "sessionid": "story_session_default",
        "temperature": 0.7
    }
    try:
        response = requests.post(chat_url, headers=headers, data=chat_payload, timeout=45)
        if response.status_code == 200:
            res_data = response.json()
            if isinstance(res_data, dict) and "response" in res_data and res_data["response"]:
                return res_data["response"].strip()
    except Exception as e:
        app.logger.warning(f"Pathumma-chat fallback attempt failed: {e}")

    raise RuntimeError("ไม่สามารถเชื่อมต่อกับบริการแต่งนิทานของ Pathumma LLM ได้ในขณะนี้ โปรดลองใหม่อีกครั้ง")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate-story", methods=["POST"])
def generate_story():
    data = request.get_json(silent=True) or {}
    keywords = data.get("prompt", "").strip()

    if not keywords:
        return jsonify({
            "success": False,
            "error": "กรุณาพิมพ์คำหรือประโยคที่ต้องการให้นำมาแต่งนิทาน"
        }), 400

    try:
        story = call_pathumma_llm(keywords)
        return jsonify({
            "success": True,
            "story": story,
            "prompt": keywords
        })
    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": str(ve)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"เกิดข้อผิดพลาดในการแต่งนิทาน: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=DEFAULT_PORT, debug=True)
