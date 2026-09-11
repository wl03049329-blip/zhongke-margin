param(
    [Parameter(Mandatory = $true)]
    [string]$SourceXls,
    [Parameter(Mandatory = $true)]
    [string]$TargetXlsx
)

$source = [System.IO.Path]::GetFullPath($SourceXls)
$target = [System.IO.Path]::GetFullPath($TargetXlsx)
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Source file not found: $source"
}
if ([System.IO.Path]::GetExtension($source) -ne '.xls') {
    throw 'Source must be an .xls workbook.'
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $workbook = $excel.Workbooks.Open($source, 0, $true)
    $workbook.SaveAs($target, 51)
    $workbook.Close($false)
    Write-Output $target
}
finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
