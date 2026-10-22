param([ValidateSet('Instalar','Quitar')][string]$Accion='Instalar')
$ErrorActionPreference = 'Stop'
try {
    $root = Split-Path $PSScriptRoot -Parent
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $suffix = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant())))).Replace('-','').Substring(0,8) } finally { $sha.Dispose() }
    $taskName = 'MesaLista-' + $suffix
    if ($Accion -eq 'Quitar') {
        if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
        Write-Host 'Inicio automatico retirado. Los datos del restaurante se conservan.'
        exit 0
    }
    $null = Get-Command node.exe -ErrorAction Stop
    $account = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $helper = Join-Path $PSScriptRoot 'servidor-en-segundo-plano.ps1'
    $arguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $helper + '"'
    $action = New-ScheduledTaskAction -Execute $powerShell -Argument $arguments -WorkingDirectory $root
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $account
    $principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description ('Mesa Lista: ' + $root) -Force | Out-Null
    Write-Host ('Instalado: ' + $taskName)
    Write-Host 'Se iniciara al entrar a Windows con este usuario. El puerto se configura en config-servidor.json (PORT tiene prioridad si esta definido).'
    Write-Host 'No abras INICIAR.cmd a la vez. La demo sigue siendo independiente en el puerto 3001.'
    Write-Host 'Conserva esta carpeta en la misma ruta. Registros: datos\registros.'
} catch {
    Write-Host ('No se pudo configurar el inicio automatico: ' + $_.Exception.Message)
    exit 1
}
