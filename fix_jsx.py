with open(r'frontend\src\components\Production\ProductionEntryModal.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "            </div>" followed by blank line and "          {/* Rejections"
inserted = False
for i in range(len(lines) - 2):
    if (lines[i].strip() == '</div>' and 
        lines[i+1].strip() == '' and
        'Rejections Section' in lines[i+2]):
        # Check if this is the Time Logs section (around line 747)
        if 750 > i > 740:  # Should be around line 747
            # Insert a closing div with proper indentation
            lines.insert(i+1, '          </div>\n')
            print(f'Inserted closing </div> at line {i+2}')
            inserted = True
            break

if not inserted:
    print('ERROR: Could not find the location to insert the fix')
else:
    # Write back
    with open(r'frontend\src\components\Production\ProductionEntryModal.jsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('File fixed successfully!')
