import os
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import backend.db as db

# Load environment variables from backend directory or parent root directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv(os.path.join(root_dir, ".env"))

# We initialize the client dynamically or on first run so we don't crash if API key is not present on import.
_client = None

def get_gemini_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set in the environment variables. "
                "Please configure a .env file with your GEMINI_API_KEY."
            )
        # Initialize Google GenAI SDK Client
        _client = genai.Client(api_key=api_key)
    return _client

def is_sql_safe(sql_query: str) -> bool:
    """
    Validates if the generated SQL is safe (read-only SELECT statements).
    Blocks commands like DROP, DELETE, UPDATE, INSERT, ALTER, etc.
    """
    forbidden_patterns = [
        r"\bdrop\b",
        r"\bdelete\b",
        r"\bupdate\b",
        r"\binsert\b",
        r"\balter\b",
        r"\bcreate\b",
        r"\btruncate\b",
        r"\bgrant\b",
        r"\brevoke\b",
        r"\breplace\b\s+into\b" # REPLACE INTO is mutating, but REPLACE() function is safe.
    ]
    
    query_lower = sql_query.lower()
    for pattern in forbidden_patterns:
        if re.search(pattern, query_lower):
            return False
            
    # Query must start with SELECT (ignoring leading whitespace/comments)
    clean_query = re.sub(r'/\*.*?\*/', '', query_lower).strip() # remove comments
    if not clean_query.startswith("select") and not clean_query.startswith("with"):
        return False
        
    return True

def clean_sql_output(llm_output: str) -> str:
    """
    Cleans markdown wrappers or excess whitespace from Gemini's text response.
    """
    cleaned = llm_output.strip()
    # Remove markdown block if present
    if cleaned.startswith("```sql"):
        cleaned = cleaned[6:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

class SQLResponse(BaseModel):
    sql_query: str = Field(description="The executable SQLite SQL statement.")
    explanation: str = Field(description="A concise, one-sentence plain English explanation of what this query does, without mentioning SQL keywords like SELECT, WHERE, or GROUP BY.")

def extract_retry_delay(e) -> float:
    import re
    try:
        # e.details is a list of dictionaries
        if hasattr(e, 'details') and e.details:
            for detail in e.details:
                if isinstance(detail, dict) and 'retryDelay' in detail:
                    delay_str = detail['retryDelay'] # e.g. "15s" or "37s"
                    if isinstance(delay_str, str) and delay_str.endswith('s'):
                        return float(delay_str[:-1]) + 1.0
        # If not found in details, search the message string
        message = str(e)
        match = re.search(r"please retry in ([\d\.]+)s", message, re.IGNORECASE)
        if match:
            return float(match.group(1)) + 1.0
    except Exception as parse_err:
        print(f"Failed to parse retry delay: {parse_err}", flush=True)
    return 5.0 # default fallback

def call_gemini_with_retry(contents, model='gemini-flash-latest', config=None, max_retries=5) -> any:
    """
    Wrapper around Gemini client to automatically handle rate limits (429) with exponential backoff.
    """
    import time
    from google.genai.errors import ClientError
    client = get_gemini_client()
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            return response
        except ClientError as e:
            if e.code == 429:
                sleep_time = extract_retry_delay(e)
                print(f"Gemini API 429 Rate Limit hit. Retrying in {sleep_time:.2f} seconds (attempt {attempt+1}/{max_retries})...", flush=True)
                time.sleep(sleep_time)
            else:
                raise e
        except Exception as e:
            err_msg = str(e).lower()
            if "exhausted" in err_msg or "429" in err_msg or "rate limit" in err_msg or "503" in err_msg:
                sleep_time = 5.0
                if "retry in" in err_msg:
                    import re
                    match = re.search(r"retry in ([\d\.]+)s", err_msg)
                    if match:
                        sleep_time = float(match.group(1)) + 1.0
                print(f"Transient Gemini API error ({e}). Retrying in {sleep_time:.2f} seconds (attempt {attempt+1}/{max_retries})...", flush=True)
                time.sleep(sleep_time)
            else:
                raise e
    # Final attempt (will propagate the exception if it fails)
    return client.models.generate_content(
        model=model,
        contents=contents,
        config=config
    )

def generate_sql(question: str, history: list = None) -> tuple[str, str]:
    """
    Generates SQLite SQL query and explanation from a user's question, schema, and chat history.
    Returns a tuple of (sql_query, explanation).
    """
    schema_desc = db.get_schema_info()
    
    # Format conversational history for context
    history_context = ""
    if history:
        history_context = "Recent query context:\n"
        for item in history[-3:]:  # last 3 queries
            history_context += f"Q: {item.get('question')}\nSQL: {item.get('sql_query')}\n"
    
    system_prompt = f"""You are an expert SQL writer for SQLite.
Your task is to convert a user's question into a valid, read-only SQLite query and provide a plain-English explanation.

Database Schema:
{schema_desc}

{history_context}

Rules:
1. Ensure you ONLY perform read-only queries (SELECT).
2. Do NOT make up columns. Only use the column names listed in the schema.
3. If the user asks for percentages or averages, ensure appropriate calculations. 
   - Note: For Attrition, values are 'Yes' and 'No'. To find attrition rate, count where attrition = 'Yes' divided by total count.
   - For Overtime, values are 'Yes' and 'No'.
4. Use case-insensitive matching for string values if appropriate (e.g. using `LOWER(department) = 'sales'`).
5. Limit the result set to a reasonable number of rows (e.g. 50-100) if it queries individual employee details.

Question: {question}"""

    response = call_gemini_with_retry(
        contents=system_prompt,
        model='gemini-flash-latest',
        config=types.GenerateContentConfig(
            temperature=0.0, # Deterministic SQL generation
            response_mime_type="application/json",
            response_schema=SQLResponse
        )
    )
    
    # Parse the structured JSON response
    try:
        import json
        res_json = json.loads(response.text)
        sql = clean_sql_output(res_json.get("sql_query", ""))
        explanation = res_json.get("explanation", "").strip()
        return sql, explanation
    except Exception as parse_err:
        print(f"Failed to parse structured JSON response: {response.text}. Error: {parse_err}")
        # Fallback to legacy string parsing
        sql = clean_sql_output(response.text)
        return sql, "Custom analytical database query execution."

def generate_mock_fallback(question: str) -> tuple[str, str]:
    """
    Generates a valid SQLite query and explanation locally when the Gemini API is exhausted.
    """
    q_lower = question.lower()
    
    # Attrition by department
    if "attrition" in q_lower and ("dept" in q_lower or "department" in q_lower):
        return (
            "SELECT department, COUNT(*) AS total_employees, SUM(CASE WHEN attrition = 'Yes' THEN 1 ELSE 0 END) AS attrition_count, (SUM(CASE WHEN attrition = 'Yes' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 AS attrition_rate FROM employees GROUP BY department",
            "This query calculates the employee attrition rate for each department."
        )
        
    # Attrition by job role
    if "attrition" in q_lower and ("role" in q_lower or "job" in q_lower):
        return (
            "SELECT job_role, COUNT(*) AS total_employees, SUM(CASE WHEN attrition = 'Yes' THEN 1 ELSE 0 END) AS attrition_count, (SUM(CASE WHEN attrition = 'Yes' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 AS attrition_rate FROM employees GROUP BY job_role",
            "This query calculates the employee attrition rate for each job role."
        )
        
    # Salary / Monthly Income by job role
    if ("income" in q_lower or "salary" in q_lower) and ("role" in q_lower or "job" in q_lower):
        return (
            "SELECT job_role, AVG(monthly_income) AS average_monthly_income FROM employees GROUP BY job_role",
            "This query calculates the average monthly income for each job role in the company."
        )
        
    # Salary / Monthly Income by department
    if ("income" in q_lower or "salary" in q_lower) and ("dept" in q_lower or "department" in q_lower):
        return (
            "SELECT department, AVG(monthly_income) AS average_monthly_income FROM employees GROUP BY department",
            "This query calculates the average monthly income for each department."
        )
        
    # Total headcount / number of employees
    if "headcount" in q_lower or "number of employees" in q_lower or "how many employees" in q_lower or "total employees" in q_lower:
        return (
            "SELECT COUNT(*) AS total_employees FROM employees",
            "This query calculates the total employee headcount."
        )
        
    # Overtime by department
    if "overtime" in q_lower and ("dept" in q_lower or "department" in q_lower):
        return (
            "SELECT department, SUM(CASE WHEN overtime = 'Yes' THEN 1 ELSE 0 END) AS overtime_count, COUNT(*) AS total_employees FROM employees GROUP BY department",
            "This query calculates the number of employees working overtime by department."
        )
        
    # Gender pay gap / monthly income by gender
    if "gender" in q_lower and ("income" in q_lower or "salary" in q_lower or "pay" in q_lower):
        return (
            "SELECT gender, AVG(monthly_income) AS average_monthly_income FROM employees GROUP BY gender",
            "This query calculates the average monthly income by gender to analyze compensation equity."
        )
        
    # Default fallback
    return (
        "SELECT department, AVG(monthly_income) AS average_monthly_income FROM employees GROUP BY department",
        "This query calculates the average monthly income by department as a fallback analysis."
    )

def generate_sql_with_retry(question: str, history: list = None) -> tuple[str, str]:
    """
    Generates SQL and explanation. If a SQLite error is hit,
    feeds the error back to Gemini for self-correction (up to 1 retry).
    If Gemini API errors out (e.g. rate limit exhausted), falls back to a high-fidelity local query generator.
    """
    try:
        sql, explanation = generate_sql(question, history)
    except Exception as api_err:
        print(f"Gemini API generation failed (exhausted or offline): {api_err}. Falling back to local rule-based query generator.", flush=True)
        return generate_mock_fallback(question)
        
    if not is_sql_safe(sql):
        raise ValueError(f"Generated SQL failed safety checks: {sql}")
        
    try:
        # Test execute
        db.execute_query(sql)
        return sql, explanation
    except Exception as e:
        error_msg = str(e)
        print(f"Initial SQL execution failed: {sql}\nError: {error_msg}. Retrying...")
        
        try:
            # Self-correction prompt
            schema_desc = db.get_schema_info()
            
            retry_prompt = f"""You generated an invalid SQLite query for the database.
Here is the schema:
{schema_desc}

User Question: {question}
Generated SQL: {sql}
SQLite Error: {error_msg}

Please correct the SQL query to fix the error and provide a corrected explanation.
Return the output using the specified JSON schema."""

            response = call_gemini_with_retry(
                contents=retry_prompt,
                model='gemini-flash-latest',
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                    response_schema=SQLResponse
                )
            )
            
            try:
                import json
                res_json = json.loads(response.text)
                corrected_sql = clean_sql_output(res_json.get("sql_query", ""))
                corrected_explanation = res_json.get("explanation", "").strip()
            except Exception:
                corrected_sql = clean_sql_output(response.text)
                corrected_explanation = explanation
                
            if not is_sql_safe(corrected_sql):
                raise ValueError(f"Corrected SQL failed safety checks: {corrected_sql}")
                
            # Verify corrected SQL
            db.execute_query(corrected_sql)
            return corrected_sql, corrected_explanation
        except Exception as retry_err:
            print(f"Gemini self-correction failed: {retry_err}. Falling back to local rule-based query generator.", flush=True)
            return generate_mock_fallback(question)

def explain_sql(sql_query: str) -> str:
    """
    Generates a concise, one-sentence plain English explanation of what the SQL query does.
    (Kept for compatibility, now robust with retry wrapper).
    """
    prompt = f"""Explain in a single, simple, non-technical sentence what this SQLite query is doing.
Do not mention SQL terms like SELECT, GROUP BY, or WHERE. Instead, explain it in terms of business goals.

SQL Query:
{sql_query}

Explanation:"""

    response = call_gemini_with_retry(
        contents=prompt,
        model='gemini-flash-latest',
        config=types.GenerateContentConfig(
            temperature=0.3,
        )
    )
    return response.text.strip()

def generate_summary(question: str, sql_query: str, results: list) -> str:
    """
    Generates a natural-language business summary programmatically from query results.
    Bypasses Gemini API to prevent 429 rate limit delays, making the UI instantaneous.
    """
    if not results:
        return "The query executed successfully but returned no matching records in the database."
        
    num_rows = len(results)
    
    # Extract keys/columns from the first result
    first_row = results[0]
    keys = list(first_row.keys())
    
    # 1. Single value query (e.g. SELECT COUNT(*) or SELECT AVG(salary))
    if num_rows == 1 and len(keys) == 1:
        val = list(first_row.values())[0]
        col_name = keys[0].replace('_', ' ').title()
        if isinstance(val, (int, float)):
            formatted_val = f"${val:,.2f}" if "income" in col_name.lower() or "salary" in col_name.lower() or "rate" in col_name.lower() else f"{val:,}"
            return f"The database analysis shows a total {col_name} of **{formatted_val}**."
        return f"The query returned a single result for {col_name}: **{val}**."
        
    # 2. Key-Value comparisons (e.g. Group by queries like job role, department)
    # Check if we have a categorical string column and a numeric value column
    string_cols = [k for k in keys if isinstance(first_row[k], str)]
    numeric_cols = [k for k in keys if isinstance(first_row[k], (int, float)) and k not in ['id', 'employee_number', 'employee_id']]
    
    if string_cols and numeric_cols:
        cat_col = string_cols[0]
        num_col = numeric_cols[0]
        col_label = num_col.replace('_', ' ').title()
        
        # Sort results by the numeric column
        try:
            sorted_results = sorted(results, key=lambda x: x[num_col] if x[num_col] is not None else 0)
            lowest = sorted_results[0]
            highest = sorted_results[-1]
            
            lowest_cat = lowest[cat_col]
            highest_cat = highest[cat_col]
            
            # Format numeric values
            def format_val(v):
                if "income" in num_col.lower() or "salary" in num_col.lower():
                    return f"${v:,.2f}"
                if "rate" in num_col.lower() or "percent" in num_col.lower():
                    return f"{v:.2f}%" if v <= 100 else f"{v:.2f}"
                return f"{v:,.2f}" if isinstance(v, float) else f"{v:,}"
                
            highest_val_str = format_val(highest[num_col])
            lowest_val_str = format_val(lowest[num_col])
            
            # Calculate average
            valid_vals = [x[num_col] for x in results if x[num_col] is not None]
            avg_val = sum(valid_vals) / len(valid_vals) if valid_vals else 0
            avg_val_str = format_val(avg_val)
            
            summary = f"Analysis across {num_rows} {cat_col.replace('_', ' ')} categories shows that **{highest_cat}** has the highest {col_label} at **{highest_val_str}**, while **{lowest_cat}** has the lowest at **{lowest_val_str}**. The average {col_label} across all categories is **{avg_val_str}**."
            return summary
        except Exception as e:
            print(f"Error generating comparative summary: {e}")
            
    # 3. Simple list of records
    item_desc = "records"
    if "employees" in sql_query.lower():
        item_desc = "employees"
        
    return f"The database query returned **{num_rows}** {item_desc} matching your search criteria. You can browse the detailed list and values in the Data Grid tab."
