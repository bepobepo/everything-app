# Everything in EVERYTHING!

A simple web application that uses AI to calculate how much of one thing fits inside another.

![Screenshot](app_screenshot.png) <!-- Add a screenshot later if possible -->

## Features

*   Enter any two items (e.g., "a rubber duck", "the sun").
*   Uses OpenAI (GPT-4o-Mini by default) to calculate the comparison.
*   Displays a textual explanation provided by the AI.
*   Shows a simple bar chart visualizing the numerical result.
*   Stores past comparisons in a local SQLite database.
*   Displays a history of recent comparisons.
*   Clicking on a history item re-loads its results.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repository-directory>
    ```

2.  **Create a virtual environment:** (Recommended)
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    *   Create a file named `.env` in the project root directory.
    *   Add your OpenAI API key to this file. You can get a key from [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys).
    *   **(Optional)** Add a `FLASK_SECRET_KEY` for better session security, especially if deploying.

    Your `.env` file should look like this:

    ```env
    # Contents for your .env file
    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx # Replace with your actual key

    # Optional Flask Secret Key (generate using: python -c 'import secrets; print(secrets.token_hex())')
    # FLASK_SECRET_KEY=your_generated_secret_key_here
    ```
    **Important:** Replace `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your real OpenAI API key.

## Running the Application

1.  **Ensure your virtual environment is active.**
2.  **Run the Flask app:**
    ```bash
    python app.py
    ```
3.  Open your web browser and navigate to `http://127.0.0.1:5000` (or the address shown in the terminal).

## How it Works

*   **Frontend:** Uses HTML, CSS, and vanilla JavaScript (`static/script.js`) with Chart.js for visualization.
*   **Backend:** A Flask (`app.py`) server handles requests.
*   **AI Integration:** Calls the OpenAI API (`chat.completions` endpoint) with a specific prompt.
*   **Data Storage:** Uses SQLite (`database.py`, `comparisons.db`) to store history.
*   **Environment:** Uses `python-dotenv` to manage the API key securely.

## TODO / Potential Improvements

*   Add input validation for potentially harmful inputs.
*   Implement more robust error handling for API calls and database operations.
*   Improve the AI prompt for more consistent numerical output extraction.
*   Add pagination for history if it grows large.
*   Use a more sophisticated charting library or add more chart types.
*   Deploy using a production-ready server like Gunicorn or Waitress.
*   Add unit and integration tests.
*   Refine the visual design. 
