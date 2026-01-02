$file = 'd:\projects\nobal-casting\frontend\src\components\Production\ProductionEntryModal.jsx'
$content = [System.IO.File]::ReadAllText($file)

$oldLine = "export default function ProductionEntryModal({ isOpen, onClose, jobCardId, jobCardData, executionData, workstations, operations, operators, onUpdate }) {"

$newLine = "export default function ProductionEntryModal({ isOpen, onClose, jobCardId, jobCardData, executionData, workstations = [], operations = [], operators = [], onUpdate }) {"

$newContent = $content.Replace($oldLine, $newLine)

[System.IO.File]::WriteAllText($file, $newContent)
Write-Host "Fixed props with default values"
