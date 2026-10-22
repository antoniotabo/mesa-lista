$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
$outputs = Split-Path $appRoot -Parent
$workspace = Split-Path $outputs -Parent
$stage = Join-Path $workspace ('work\instalador-3.2-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$payload = Join-Path $stage 'programa'
New-Item -ItemType Directory -Path $payload | Out-Null
foreach ($folder in @('lib','public')) { Copy-Item -LiteralPath (Join-Path $appRoot $folder) -Destination $payload -Recurse }
foreach ($file in @('server.js','config-servidor.json','INSTALACION-EXE.md','RESPALDOS.md')) { Copy-Item -LiteralPath (Join-Path $appRoot $file) -Destination $payload }
$scripts = Join-Path $payload 'scripts'
New-Item -ItemType Directory -Path $scripts | Out-Null
Copy-Item -LiteralPath (Join-Path $appRoot 'scripts\read-menu.ps1') -Destination $scripts
[ordered]@{name='mesa-lista-local';version='3.2.0';private=$true;engines=@{node='>=24'}} | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $payload 'package.json') -Encoding UTF8
$runtime = Join-Path $payload 'runtime'
New-Item -ItemType Directory -Path $runtime | Out-Null
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
Copy-Item -LiteralPath $nodePath -Destination (Join-Path $runtime 'node.exe')
$nodeVersion = (& $nodePath --version).Trim()
$licenseCache = Join-Path $PSScriptRoot ('LICENSE-Node-' + $nodeVersion + '.txt')
if (-not (Test-Path -LiteralPath $licenseCache)) {
    Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/nodejs/node/' + $nodeVersion + '/LICENSE') -OutFile $licenseCache
}
Copy-Item -LiteralPath $licenseCache -Destination (Join-Path $runtime 'LICENSE-Node.txt')
$licenses = Join-Path $payload 'licencias'
New-Item -ItemType Directory -Path $licenses | Out-Null
foreach ($module in @('react','react-dom','scheduler')) { Copy-Item -LiteralPath (Join-Path $appRoot ('node_modules\'+$module+'\LICENSE')) -Destination (Join-Path $licenses ($module+'.txt')) }
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$manifest = Join-Path $PSScriptRoot 'app.manifest'
$launcher = Join-Path $payload 'Mesa Lista.exe'
$iconFile = Join-Path $stage 'mesa-lista.ico'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object Drawing.Bitmap 64,64
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([Drawing.Color]::FromArgb(163,63,40))
$font = New-Object Drawing.Font 'Segoe UI',25,([Drawing.FontStyle]::Bold)
$graphics.DrawString('ML',$font,[Drawing.Brushes]::White,([Drawing.PointF]::new(1,10)))
$icon = [Drawing.Icon]::FromHandle($bitmap.GetHicon())
$iconStream = [IO.File]::Create($iconFile)
try { $icon.Save($iconStream) } finally { $iconStream.Dispose(); $icon.Dispose(); $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
$references = @('/r:System.Windows.Forms.dll','/r:System.Drawing.dll','/r:System.Web.Extensions.dll')
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/win32manifest:$manifest" "/win32icon:$iconFile" "/out:$launcher" @references (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el acceso directo' }
$payloadZip = Join-Path $stage 'contenido.zip'
Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $payloadZip -CompressionLevel Optimal
$installer = Join-Path $outputs 'Mesa-Lista-3.2-Instalar.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/win32manifest:$manifest" "/win32icon:$iconFile" "/out:$installer" "/resource:$payloadZip,MesaLista.Payload" @references /r:Microsoft.CSharp.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll (Join-Path $PSScriptRoot 'Installer.cs')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el instalador' }
Get-Item -LiteralPath $installer | Select-Object FullName,Length
