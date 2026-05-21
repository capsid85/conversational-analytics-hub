import os
import re
import urllib.request
import sqlite3
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analytics.db")
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hr_data.csv")
CSV_URL = "https://raw.githubusercontent.com/nelson-wu/employee-attrition-ml/master/WA_Fn-UseC_-HR-Employee-Attrition.csv"

def clean_column_name(name):
    # Insert underscore before capital letters, except at the start
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
    s2 = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1)
    # Lowercase and replace spaces or hyphens with underscores
    cleaned = s2.lower().replace(' ', '_').replace('-', '_').replace('__', '_')
    # Special cleanups
    if cleaned == "over_time":
        return "overtime"
    return cleaned

def ensure_dataset_and_db():
    """
    Ensures that the CSV is downloaded and the SQLite database is initialized and seeded.
    """
    db_existed = os.path.exists(DB_PATH)
    
    # 1. Download CSV if missing
    if not os.path.exists(CSV_PATH):
        print(f"Downloading HR dataset CSV from: {CSV_URL}")
        try:
            # Create a simple User-Agent header to avoid potential blocking
            req = urllib.request.Request(
                CSV_URL, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req) as response, open(CSV_PATH, 'wb') as out_file:
                out_file.write(response.read())
            print("Download complete.")
        except Exception as e:
            print(f"Failed to download CSV: {e}")
            raise e

    # 2. Seed SQLite database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create query log table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS query_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            sql_query TEXT NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # Load and seed the employees table
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("Seeding database table 'employees' from CSV...")
            df = pd.read_csv(CSV_PATH)
            
            # Clean column names
            df.columns = [clean_column_name(col) for col in df.columns]
            
            # Write to SQLite
            df.to_sql("employees", conn, if_exists="replace", index=False)
            print("Database table 'employees' seeded successfully!")
            
            # Verify columns
            cursor.execute("PRAGMA table_info(employees)")
            cols = [row[1] for row in cursor.fetchall()]
            print("Seeded columns:", cols)
    except Exception as e:
        print(f"Error seeding database: {e}")
        conn.close()
        raise e
    
    conn.close()

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def get_schema_info():
    """
    Returns text details about the employees table schema to inject into the LLM prompt.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(employees)")
    columns = cursor.fetchall()
    
    schema_desc = "Table: employees\nColumns:\n"
    for col in columns:
        col_name = col[1]
        col_type = col[2]
        schema_desc += f"  - {col_name} ({col_type})\n"
        
    # Query distinct values for category columns to help LLM match exactly
    category_cols = ['department', 'job_role', 'gender', 'attrition', 'overtime', 'business_travel', 'education_field']
    schema_desc += "\nDistinct values for reference:\n"
    for col in category_cols:
        try:
            cursor.execute(f"SELECT DISTINCT {col} FROM employees LIMIT 10")
            vals = [str(row[0]) for row in cursor.fetchall()]
            schema_desc += f"  - {col}: {', '.join(vals)}\n"
        except sqlite3.OperationalError:
            pass
            
    conn.close()
    return schema_desc

def log_query(question: str, sql_query: str, status: str, error_message: str = None):
    """
    Logs query execution attempt to the SQLite database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO query_logs (question, sql_query, status, error_message) VALUES (?, ?, ?, ?)",
            (question, sql_query, status, error_message)
        )
        conn.commit()
    except Exception as e:
        print(f"Failed to log query: {e}")
    finally:
        conn.close()

def execute_query(sql_query: str):
    """
    Executes a SQL query against the employees database and returns list of dicts.
    """
    conn = get_db_connection()
    try:
        df = pd.read_sql_query(sql_query, conn)
        results = df.to_dict(orient="records")
        columns = list(df.columns)
        return {
            "success": True,
            "columns": columns,
            "results": results,
            "row_count": len(results)
        }
    except Exception as e:
        # Caller will catch and execute retry logic
        raise e
    finally:
        conn.close()
