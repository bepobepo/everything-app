import os
import re
import logging # Import logging
import json # Import json module
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError
import database

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_default_secret_key_for_development')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# --- OpenAI Client ---
def get_openai_client():
    if not OPENAI_API_KEY:
        logging.error("OPENAI_API_KEY environment variable not set.")
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    return OpenAI(api_key=OPENAI_API_KEY)

# --- Routes ---
@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    """Handles the calculation request, calls OpenAI for JSON, and saves the result."""
    item_a = request.form.get('item_a')
    item_b = request.form.get('item_b')

    logging.info(f"Received calculation request: Item A='{item_a}', Item B='{item_b}'")

    if not item_a or not item_b:
        logging.warning("Calculation request missing item A or item B.")
        return jsonify({"error": "Missing item A or item B"}), 400

    # --- Even MORE Explicit Prompt ---
    prompt = (
        f"You must respond ONLY with a valid JSON object.\\n"
        f"Analyze item A: '{item_a}' and item B: '{item_b}'.\\n"
        f"1. Estimate dimensions for A and B (e.g., area, volume).\\n"
        f"2. Calculate the primary value: **How many times does item A fit inside item B?** Let this value be R = (Dimension of B) / (Dimension of A).\\n"
        f"3. Create a brief explanation explaining the calculation method used to determine how many A fit in B. add a sarcastic or witty remark at the end. measure volume where possible.\\n"
        f"4. Construct the JSON object with these EXACT keys and value types:\\n"
        f"   {{ \\n"
        f"     \"item_A_dimension\": number, \\n"
        f"     \"item_B_dimension\": number, \\n"
        f"     \"result\": number, \\n"
        f"     \"explanation\": string \\n"
        f"   }} \\n"
        f"CRITICAL: The value for the 'result' key MUST be the number R calculated in step 2 (How many A fit in B). Do NOT put any other number in the 'result' field.\\n"
        f"Example 1: A='china', B='australia'. Areas are ~9.6M km² (A) and ~7.7M km² (B). R = B/A = 7.7/9.6 ≈ 0.8. The JSON 'result' key MUST contain approximately 0.8.\\n"
        f"Example 2: A='100ml bottle', B='2 liter bottle'. Volumes are 100ml (A) and 2000ml (B). R = B/A = 2000/100 = 20. The JSON 'result' key MUST contain 20.\\n"
    )
    logging.info(f"Generated OpenAI prompt (JSON, v3): {prompt}")

    try:
        client = get_openai_client()
        logging.info("Sending request to OpenAI for JSON response...")
        completion = client.chat.completions.create(
            model="gpt-4.1-nano-2025-04-14",
            messages=[
                {"role": "system", "content": "You are an assistant that calculates ratios based on physical dimensions. You MUST respond ONLY with the valid JSON structure requested by the user. Adhere strictly to the key names and value types specified. The 'result' key must contain the specific calculation requested."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={ "type": "json_object" }
        )

        ai_response_content = completion.choices[0].message.content
        logging.info(f"Received raw response content from OpenAI: {ai_response_content}")

        # Parse the JSON response
        try:
            ai_data = json.loads(ai_response_content)
            logging.info(f"Successfully parsed JSON response: {ai_data}")
        except json.JSONDecodeError as json_err:
            logging.error(f"Failed to decode JSON from AI response: {json_err}")
            logging.error(f"Raw response was: {ai_response_content}")
            return jsonify({"error": "AI returned invalid JSON format."}), 500

        # Extract data, providing defaults or handling missing keys
        explanation = ai_data.get('explanation', "Explanation not provided by AI.")
        result_value_raw = ai_data.get('result')
        logging.info(f"Raw 'result' value from JSON: {result_value_raw} (type: {type(result_value_raw)})")

        item_a_dim = ai_data.get('item_A_dimension')
        item_b_dim = ai_data.get('item_B_dimension')
        logging.info(f"Extracted JSON fields - Item A ('{item_a}') dimension: {item_a_dim}, Item B ('{item_b}') dimension: {item_b_dim}, Result (A in B): {result_value_raw}")

        # Validate result_value
        result_value = None
        if result_value_raw is not None and isinstance(result_value_raw, (int, float)):
            result_value = float(result_value_raw)
            logging.info(f"Validated result_value as number: {result_value}")
        else:
            logging.warning(f"Result value from AI JSON is missing or not a number: {result_value_raw}. Setting final result to None.")
            result_value = None

        # Save to database
        logging.info(f"Attempting to save to DB: A='{item_a}', B='{item_b}', Result={result_value}")
        db_id = database.add_comparison(item_a, item_b, explanation, result_value)

        if db_id is None:
            logging.error("Failed to save comparison to database.")

        # Return validated data to frontend
        logging.info(f"Returning JSON response to frontend: A='{item_a}', B='{item_b}', Result={result_value}")
        return jsonify({
            "item_a": item_a,
            "item_b": item_b,
            "explanation": explanation,
            "result_value": result_value
        })

    except OpenAIError as e:
        logging.exception(f"OpenAI API error occurred: {e}")
        return jsonify({"error": f"AI calculation failed: {str(e)}"}), 500
    except ValueError as e:
        logging.exception(f"Configuration error: {e}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.exception(f"An unexpected error occurred during calculation: {e}")
        return jsonify({"error": "An unexpected error occurred during calculation."}), 500

@app.route('/history', methods=['GET'])
def get_history_route():
    """Returns the list of past comparisons."""
    history = database.get_history(limit=20)
    return jsonify(history)

@app.route('/history/<int:id>', methods=['GET'])
def get_history_item(id):
    """Returns the details of a specific past comparison."""
    item = database.get_comparison_by_id(id)
    if item:
        return jsonify(item)
    else:
        return jsonify({"error": "Comparison not found"}), 404

# --- Initialization ---
if __name__ == '__main__':
    database.init_db() # Ensure DB is ready before running the app
    # Use waitress or gunicorn for production instead of Flask's development server
    port = int(os.environ.get("PORT", 5001)) # Use port 5001 by default or from env
    logging.info(f"Starting Flask development server on port {port}...")
    logging.info("Ensure OPENAI_API_KEY is set in your .env file.")
    # Added host='0.0.0.0' if you need to access it from other devices on the network
    app.run(debug=True, port=port, host='0.0.0.0') # Changed port and added host 