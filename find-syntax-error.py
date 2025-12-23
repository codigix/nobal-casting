import re

file_path = r"frontend\src\pages\Production\ProductionPlanningForm.jsx"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Track unclosed strings and backticks
for i, line in enumerate(lines, 1):
    # Count backticks
    backticks = line.count('`')
    if backticks % 2 != 0:
        print(f"Line {i}: Odd number of backticks")
        print(f"  {line.strip()[:100]}")
    
    # Count single quotes not escaped
    in_double = False
    for j, char in enumerate(line):
        if char == '"' and (j == 0 or line[j-1] != '\\'):
            in_double = not in_double

print("\nDone checking file")
