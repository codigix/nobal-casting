$file = 'd:\projects\nobal-casting\frontend\src\components\Production\ProductionEntryModal.jsx'
$lines = @(Get-Content $file)
$newLines = @()

foreach ($i in 0..($lines.Count - 1)) {
    $newLines += $lines[$i]
    # Check if this is the line with "            </div>" and the next line is blank and after that is "          {/* Rejections"
    if ($lines[$i].Trim() -eq "</div>" -and $i -lt $lines.Count - 2 -and $lines[$i+1].Trim() -eq "" -and $lines[$i+2].Contains("Rejections Section")) {
        # Insert closing div after this line
        if ($i -gt 740 -and $i -lt 750) {
            $newLines += "          </div>"
            Write-Host "Inserted closing div at line $($i+2)"
        }
    }
}

$newLines | Set-Content $file
Write-Host "File saved!"
