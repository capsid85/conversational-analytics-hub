import os
import sys
# Add parent directory to sys.path to enable 'backend.*' imports when run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import backend.db as db
import backend.llm as llm

app = FastAPI(title="Conversational Analytics Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to Vite dev server / Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request validation schemas
class ChatMessage(BaseModel):
    role: str
    question: Optional[str] = None
    sql_query: Optional[str] = None

class QueryRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = []

@app.on_event("startup")
def startup_event():
    """
    On startup, make sure the CSV is downloaded and the database is seeded.
    """
    try:
        db.ensure_dataset_and_db()
    except Exception as e:
        print(f"Error seeding database on startup: {e}")

@app.get("/api/schema")
def get_schema():
    """
    Exposes the database schema.
    """
    try:
        schema_text = db.get_schema_info()
        return {"schema": schema_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    """
    Returns general stats about the HR employees database for the UI header.
    """
    try:
        conn = db.get_db_connection()
        cursor = conn.cursor()
        
        # Total employees
        cursor.execute("SELECT COUNT(*) FROM employees")
        total_employees = cursor.fetchone()[0]
        
        # Attrition rate
        cursor.execute("SELECT COUNT(*) FROM employees WHERE attrition = 'Yes'")
        attrition_yes = cursor.fetchone()[0]
        attrition_rate = round((attrition_yes / total_employees) * 100, 1) if total_employees > 0 else 0
        
        # Avg Monthly Income
        cursor.execute("SELECT AVG(monthly_income) FROM employees")
        avg_income = int(cursor.fetchone()[0] or 0)
        
        # Total Departments
        cursor.execute("SELECT COUNT(DISTINCT department) FROM employees")
        total_depts = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_employees": total_employees,
            "attrition_rate": f"{attrition_rate}%",
            "average_income": f"${avg_income:,}",
            "total_departments": total_depts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs")
def get_query_logs():
    """
    Returns the history of queries executed in the system.
    """
    try:
        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT question, sql_query, status, error_message, timestamp 
            FROM query_logs 
            ORDER BY log_id DESC 
            LIMIT 20
        """)
        rows = cursor.fetchall()
        conn.close()
        
        logs = []
        for r in rows:
            logs.append({
                "question": r[0],
                "sql_query": r[1],
                "status": r[2],
                "error_message": r[3],
                "timestamp": r[4]
            })
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
def run_natural_language_query(payload: QueryRequest):
    """
    Translates Natural Language to SQL, executes it, explains it, and summarizes the result.
    """
    question = payload.question
    # Convert history into the list-of-dicts expected by llm.py
    history_list = []
    if payload.history:
        # Loop through messages and pair user questions with assistant SQL queries
        for i in range(len(payload.history) - 1):
            msg = payload.history[i]
            next_msg = payload.history[i+1]
            if msg.role == "user" and next_msg.role == "assistant":
                history_list.append({
                    "question": msg.question,
                    "sql_query": next_msg.sql_query
                })

    generated_sql = ""
    try:
        # Step 1: Generate SQL and explanation in one call with retry
        generated_sql, explanation = llm.generate_sql_with_retry(question, history_list)
        
        # Step 2: Run SQL query
        query_data = db.execute_query(generated_sql)
        
        # Step 3: Summarize the results
        summary = llm.generate_summary(question, generated_sql, query_data["results"])
        
        # Log success
        db.log_query(question, generated_sql, "success")
        
        return {
            "success": True,
            "sql_query": generated_sql,
            "sql_explanation": explanation,
            "summary": summary,
            "columns": query_data["columns"],
            "results": query_data["results"],
            "row_count": query_data["row_count"]
        }
        
    except ValueError as val_err:
        # Safety checks or config failures
        db.log_query(question, generated_sql or "N/A", "error", str(val_err))
        return {
            "success": False,
            "error": "Safety or Configuration Exception",
            "message": str(val_err),
            "sql_query": generated_sql
        }
        
    except Exception as exec_err:
        # General run failures after retry
        db.log_query(question, generated_sql or "N/A", "error", str(exec_err))
        return {
            "success": False,
            "error": "Query Execution Failed",
            "message": f"SQLite execution error: {str(exec_err)}",
            "sql_query": generated_sql
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
