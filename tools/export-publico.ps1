<#
.SYNOPSIS
  Sincroniza esta copia pública con el repositorio privado de Atelier, sin publicar nada que no deba.

.DESCRIPTION
  1. Extrae a una carpeta temporal los ficheros VERSIONADOS (HEAD) del repositorio privado (git archive).
  2. Quita los ficheros listados en tools/export-excluir.txt.
  3. Busca las palabras de .export-bloqueo.txt en las rutas y en el contenido de lo que quedaría.
  4. Si encuentra alguna, ABORTA (código 1) sin haber copiado nada al destino.
  5. Si no, copia los ficheros al destino (salvo con -DryRun).

  Nunca hace commit ni push: revisa `git status` / `git diff` y confirma tú.
  No lee ni toca nada del privado salvo `git archive` (solo lectura).

.PARAMETER Origen
  Ruta del repositorio privado (obligatoria; no hay ninguna ruta fija en el script).

.PARAMETER Destino
  Ruta de esta copia pública. Por defecto, la carpeta que contiene tools/.

.PARAMETER Excluir
  Fichero con las rutas a no copiar. Por defecto, tools/export-excluir.txt.

.PARAMETER Bloqueo
  Fichero con las palabras prohibidas. Por defecto, .export-bloqueo.txt en el destino (no versionado).

.PARAMETER DryRun
  Hace todas las comprobaciones y cuenta lo que copiaría, pero no escribe nada en el destino.

.EXAMPLE
  .\tools\export-publico.ps1 -Origen "D:\privado\Atelier" -DryRun
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Origen,
  [string]$Destino = (Split-Path -Parent $PSScriptRoot),
  [string]$Excluir = (Join-Path $PSScriptRoot 'export-excluir.txt'),
  [string]$Bloqueo = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Identidad = 'jortegadmr'   # identidad pública: se ignora antes de buscar palabras prohibidas

if (-not $Bloqueo) { $Bloqueo = Join-Path $Destino '.export-bloqueo.txt' }

function Leer-Lista([string]$ruta) {
  Get-Content -LiteralPath $ruta -Encoding UTF8 |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith('#') }
}

# --- Comprobaciones previas ---
if (-not (Test-Path -LiteralPath (Join-Path $Origen '.git'))) { throw "Origen no es un repositorio git: $Origen" }
if (-not (Test-Path -LiteralPath $Destino -PathType Container)) { throw "Destino no existe: $Destino" }
if (-not (Test-Path -LiteralPath $Excluir)) { throw "Falta la lista de exclusiones: $Excluir" }
if (-not (Test-Path -LiteralPath $Bloqueo)) { throw "Falta la lista de palabras prohibidas: $Bloqueo (no se publica nada sin ella)" }

$patronesExcluir = @(Leer-Lista $Excluir)
$terminos = @()
foreach ($l in (Leer-Lista $Bloqueo)) {
  if ($l.StartsWith('w:')) {
    $t = $l.Substring(2).Trim()
    $terminos += [pscustomobject]@{ Texto = $t; Regex = [regex]::new('(?<![\p{L}\p{N}_])' + [regex]::Escape($t) + '(?![\p{L}\p{N}_])', 'IgnoreCase') }
  } else {
    $terminos += [pscustomobject]@{ Texto = $l; Regex = [regex]::new([regex]::Escape($l), 'IgnoreCase') }
  }
}
if ($terminos.Count -eq 0) { throw "La lista de palabras prohibidas está vacía: $Bloqueo" }
$quitarIdentidad = [regex]::new([regex]::Escape($Identidad), 'IgnoreCase')

function Esta-Excluido([string]$rel) {
  foreach ($p in $patronesExcluir) {
    if ($p.EndsWith('/')) { if ($rel.StartsWith($p, [StringComparison]::OrdinalIgnoreCase)) { return $true } }
    elseif ($rel -like $p) { return $true }
  }
  return $false
}

# --- 1. Extraer lo versionado del privado a una carpeta temporal ---
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('atelier-export-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $tar = Join-Path $tmp 'origen.tar'
  $arbol = Join-Path $tmp 'arbol'
  New-Item -ItemType Directory -Path $arbol | Out-Null
  & git -C $Origen archive --format=tar -o $tar HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git archive falló' }
  & tar -xf $tar -C $arbol
  if ($LASTEXITCODE -ne 0) { throw 'tar falló al extraer' }
  Remove-Item -LiteralPath $tar -Force

  # --- 2. Aplicar exclusiones ---
  $raiz = (Resolve-Path -LiteralPath $arbol).Path.TrimEnd('\')
  $ficheros = Get-ChildItem -LiteralPath $arbol -Recurse -File -Force
  $incluidos = New-Object System.Collections.Generic.List[string]
  $excluidos = 0
  foreach ($f in $ficheros) {
    $rel = $f.FullName.Substring($raiz.Length + 1).Replace('\', '/')
    if (Esta-Excluido $rel) { $excluidos++ } else { $incluidos.Add($rel) }
  }

  # --- 3. Buscar palabras prohibidas en rutas y contenido ---
  $hallazgos = New-Object System.Collections.Generic.List[string]
  foreach ($rel in $incluidos) {
    $ruta = $quitarIdentidad.Replace($rel, '')
    foreach ($t in $terminos) {
      if ($t.Regex.IsMatch($ruta)) { $hallazgos.Add("${rel} (ruta): '$($t.Texto)'") }
    }
    $bytes = [IO.File]::ReadAllBytes((Join-Path $arbol $rel))
    $n = [Math]::Min($bytes.Length, 8000)
    $binario = $false
    for ($i = 0; $i -lt $n; $i++) { if ($bytes[$i] -eq 0) { $binario = $true; break } }
    if ($binario) { continue }
    $lineas = [Text.Encoding]::UTF8.GetString($bytes) -split "`n"
    for ($k = 0; $k -lt $lineas.Length; $k++) {
      $l = $quitarIdentidad.Replace($lineas[$k], '')
      foreach ($t in $terminos) {
        if ($t.Regex.IsMatch($l)) { $hallazgos.Add("${rel}:$($k + 1): '$($t.Texto)'") }
      }
    }
  }

  Write-Host ("Origen: {0} ficheros versionados; excluidos por lista: {1}; a copiar: {2}" -f $ficheros.Count, $excluidos, $incluidos.Count)

  if ($hallazgos.Count -gt 0) {
    Write-Host ''
    Write-Host ("BLOQUEADO: {0} coincidencias con palabras prohibidas. No se ha copiado nada." -f $hallazgos.Count) -ForegroundColor Red
    $porFichero = $hallazgos | ForEach-Object { ($_ -split ':')[0] -replace ' \(ruta\)$', '' } | Sort-Object -Unique
    Write-Host ("Ficheros afectados: {0}" -f @($porFichero).Count)
    $hallazgos | Select-Object -First 40 | ForEach-Object { Write-Host "  $_" }
    if ($hallazgos.Count -gt 40) { Write-Host ("  ... y {0} más" -f ($hallazgos.Count - 40)) }
    Write-Host 'Limpia esos ficheros en el privado, o añádelos a tools/export-excluir.txt si el público tiene su propia versión.'
    exit 1
  }

  # --- 4. Copiar (o contar, en -DryRun) ---
  $nuevos = 0; $cambiados = 0
  foreach ($rel in $incluidos) {
    $de = Join-Path $arbol $rel
    $a = Join-Path $Destino $rel
    if (-not (Test-Path -LiteralPath $a)) { $nuevos++ }
    elseif ((Get-FileHash -LiteralPath $de).Hash -ne (Get-FileHash -LiteralPath $a).Hash) { $cambiados++ }
    else { continue }
    if (-not $DryRun) {
      $dir = Split-Path -Parent $a
      if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
      Copy-Item -LiteralPath $de -Destination $a -Force
    }
  }

  # Ficheros que ya no existen en el privado: solo se avisa, nunca se borra.
  $huerfanos = @()
  $enDestino = & git -C $Destino ls-files
  if ($LASTEXITCODE -eq 0) {
    $set = New-Object 'System.Collections.Generic.HashSet[string]' (,[string[]]$incluidos)
    $huerfanos = @($enDestino | Where-Object { -not $set.Contains($_) -and -not (Esta-Excluido $_) })
  }

  $modo = if ($DryRun) { 'DRY-RUN (no se ha escrito nada)' } else { 'COPIADO' }
  Write-Host ("{0}: {1} nuevos, {2} cambiados." -f $modo, $nuevos, $cambiados) -ForegroundColor Green
  if ($huerfanos.Count -gt 0) {
    Write-Host ("Aviso: {0} ficheros del público ya no están en el privado (no se borran):" -f $huerfanos.Count)
    $huerfanos | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
  }
  Write-Host 'Revisa `git status` y `git diff` antes de hacer commit. Este script no hace commit ni push.'
}
finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
