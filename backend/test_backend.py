import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import backend.db as db
import backend.llm as llm

def test_sql_safety():
    print("--- Testing SQL Safety Filter ---")
    safe_queries = [
        "SELECT department, AVG(salary) FROM employees GROUP BY department",
        "SELECT age, years_at_company FROM employees WHERE attrition = 'Yes'",
        "WITH sales_emp AS (SELECT * FROM employees WHERE department = 'Sales') SELECT AVG(monthly_income) FROM sales_emp"
    ]
    unsafe_queries = [
        "DROP TABLE employees",
        "DELETE FROM employees WHERE employee_number = 1",
        "UPDATE employees SET salary = 999999",
        "INSERT INTO employees (age, attrition) VALUES (30, 'No')",
        "ALTER TABLE employees ADD COLUMN test INTEGER"
    ]
    
    for q in safe_queries:
        safe = llm.is_sql_safe(q)
        print(f"Safe query test: '{q[:50]}...' -> Safe? {safe}")
        assert safe, f"Failed: Query should be safe: {q}"
        
    for q in unsafe_queries:
        safe = llm.is_sql_safe(q)
        print(f"Unsafe query test: '{q[:50]}...' -> Safe? {safe}")
        assert not safe, f"Failed: Query should be unsafe: {q}"
        
    print("SQL Safety tests PASSED!\n")

def test_db_operations():
    print("--- Testing DB Seeding and Query Execution ---")
    db.ensure_dataset_and_db()
    
    # Test schema
    schema = db.get_schema_info()
    assert "Table: employees" in schema
    assert "department" in schema
    print("Schema extraction PASSED!")
    
    # Test valid query exec
    res = db.execute_query("SELECT COUNT(*) as emp_count FROM employees")
    print(f"Row count query results: {res}")
    assert res["success"]
    assert res["row_count"] == 1
    assert res["results"][0]["emp_count"] == 1470 # Standard IBM dataset size
    print("Database execution test PASSED!\n")

if __name__ == "__main__":
    try:
        test_sql_safety()
        test_db_operations()
        print("All local verification tests PASSED successfully!")
    except AssertionError as ae:
        print(f"Verification FAILED: {ae}")
        sys.exit(1)
    except Exception as e:
        print(f"Verification hit unexpected error: {e}")
        sys.exit(1)
