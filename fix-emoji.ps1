$file = "d:\projects\nobal-casting\frontend\src\pages\Production\ProductionPlanningForm.jsx"
$content = Get-Content $file -Encoding UTF8 -Raw

$content = $content -replace "Manual</td>", "Manual</td>"
$content = $content -replace "From BOM</td>", "From BOM</td>"

$content | Set-Content $file -Encoding UTF8
Write-Host "Fixed"
