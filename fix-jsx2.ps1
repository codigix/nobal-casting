$file = "d:\projects\nobal-casting\frontend\src\pages\Production\ProductionPlanningForm.jsx"
$content = Get-Content $file -Raw
$search = '        </div>' + "`n" + "`n" + '        <div className="flex gap-2 justify-end'
$replace = '        </div>' + "`n" + '        </div>' + "`n" + "`n" + '        <div className="flex gap-2 justify-end'
$fixed = $content.Replace($search, $replace)
$fixed | Set-Content $file -Encoding UTF8
Write-Host "Fixed closing div"
