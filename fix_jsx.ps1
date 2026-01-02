$file = 'd:\projects\nobal-casting\frontend\src\components\Production\ProductionEntryModal.jsx'
$content = [System.IO.File]::ReadAllText($file)
$oldText = "            </div>`r`n`r`n          {/* Rejections Section */"
$newText = "            </div>`r`n          </div>`r`n`r`n          {/* Rejections Section */"
$newContent = $content.Replace($oldText, $newText)
[System.IO.File]::WriteAllText($file, $newContent)
Write-Host "Fixed!"
