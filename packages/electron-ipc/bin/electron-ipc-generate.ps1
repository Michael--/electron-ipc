#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  $exe=".exe"
}
$ret=0

& "node$exe" "$basedir/../dist/bin/generate-api.js" $args
if ($LASTEXITCODE -ne 0) {
  $ret=$LASTEXITCODE
}

exit $ret
