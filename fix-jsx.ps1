$file = "d:\projects\nobal-casting\frontend\src\pages\Production\ProductionPlanningForm.jsx"
$content = Get-Content $file -Raw
$lines = $content -split "`n"

# Find and remove the duplicate </div> at line 1644 (index 1643)
$fixed = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -eq 1643 -and $lines[$i] -match '^\s*</div>\s*$' -and $lines[$i-1] -match '^\s*</div>\s*$') {
        # Skip this line - it's the duplicate
        continue
    }
    $fixed += $lines[$i]
}

$fixed -join "`n" | Set-Content $file -Encoding UTF8
Write-Host "Fixed ProductionPlanningForm.jsx"
