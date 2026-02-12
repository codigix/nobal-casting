
import sys

def check_braces(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    depth = 0
    in_string = False
    string_char = ''
    
    for i, line in enumerate(lines):
        for char in line:
            if char in ['"', "'", '`']:
                if not in_string:
                    in_string = True
                    string_char = char
                elif string_char == char:
                    in_string = False
            
            if not in_string:
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth < 0:
                        print(f"Negative depth at line {i+1}: {line.strip()}")
        
        if (i + 1) in [893, 894, 895]:
            print(f"Line {i+1} depth: {depth}")

check_braces('frontend/src/pages/Production/ProductionEntry.jsx')
