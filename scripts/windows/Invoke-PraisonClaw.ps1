<#
.SYNOPSIS
    Canonical PraisonAI OpenClaw launcher for Windows
.DESCRIPTION
    Standardized script for launching PraisonAI OpenClaw with proper venv resolution and diagnostics.
    This script can be dot-sourced or called by demo scripts across the monorepo.
.PARAMETER VenvPath
    Path to virtual environment (default: auto-detect)
.PARAMETER Port
    Port for OpenClaw dashboard (default: 8082)
.PARAMETER Host  
    Host to bind to (default: 127.0.0.1)
.PARAMETER WorkingDir
    Working directory (default: script directory)
.PARAMETER ConfigFile
    Optional configuration file path
.PARAMETER Debug
    Enable diagnostic output
.EXAMPLE
    .\Invoke-PraisonClaw.ps1
    .\Invoke-PraisonClaw.ps1 -Port 9000 -Debug
    .\Invoke-PraisonClaw.ps1 -VenvPath "C:\MyProject\.venv"
.NOTES
    This is the canonical Windows launcher script referenced in the standardization pattern.
    Demos and other scripts should use this for consistent behavior.
#>
[CmdletBinding()]
param(
    [string]$VenvPath = "",
    [int]$Port = 8082,
    [string]$Host = "127.0.0.1", 
    [string]$WorkingDir = "",
    [string]$ConfigFile = "",
    [switch]$Debug = $false
)

$ErrorActionPreference = "Stop"

# Function to find virtual environment
function Find-VirtualEnv {
    param([string]$StartPath)
    
    $searchPaths = @()
    
    if ($StartPath) {
        $searchPaths += $StartPath
    }
    
    # Auto-detection order (as specified in the issue)
    $baseDir = if ($WorkingDir) { $WorkingDir } else { $PSScriptRoot }
    $searchPaths += @(
        (Join-Path $baseDir ".venv"),           # Project root .venv
        (Join-Path $baseDir "..\\.venv"),       # Parent directory .venv
        $env:VIRTUAL_ENV                        # Environment variable
    )
    
    foreach ($path in $searchPaths) {
        if ($path -and (Test-Path $path)) {
            $pythonExe = Join-Path $path "Scripts\python.exe"
            if (Test-Path $pythonExe) {
                return @{
                    Path = $path
                    Python = $pythonExe
                    PraisonAI = (Join-Path $path "Scripts\praisonai.exe")
                    Activate = (Join-Path $path "Scripts\Activate.ps1")
                }
            }
        }
    }
    
    # Fallback to system Python
    try {
        $systemPython = Get-Command python -ErrorAction Stop
        return @{
            Path = "system"
            Python = $systemPython.Source
            PraisonAI = "praisonai"
            Activate = $null
        }
    } catch {
        throw "No Python installation found. Install Python 3.8+ or create virtual environment."
    }
}

# Function to validate PraisonAI installation
function Test-PraisonAIInstallation {
    param($VenvInfo)
    
    try {
        if ($VenvInfo.PraisonAI -eq "praisonai") {
            # System installation - test if command exists
            $null = Get-Command praisonai -ErrorAction Stop
            $version = praisonai --version 2>$null
        } else {
            # Venv installation - test file exists
            if (!(Test-Path $VenvInfo.PraisonAI)) {
                return $false, "PraisonAI executable not found in virtual environment"
            }
            $version = & $VenvInfo.PraisonAI --version 2>$null
        }
        
        if ($version -match "praisonai") {
            return $true, $version.Trim()
        } else {
            return $false, "PraisonAI version check failed"
        }
    } catch {
        return $false, $_.Exception.Message
    }
}

# Function to load environment file
function Import-EnvironmentFile {
    param([string]$EnvPath)
    
    if (!(Test-Path $EnvPath)) {
        return
    }
    
    Write-Verbose "Loading environment from: $EnvPath"
    Get-Content $EnvPath | Where-Object { 
        $_.Trim() -ne "" -and !$_.StartsWith("#") 
    } | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Verbose "Set $name"
        }
    }
}

# Main execution
try {
    Write-Host "🦞 PraisonAI OpenClaw Launcher" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    # Resolve working directory
    if (!$WorkingDir) {
        $WorkingDir = $PSScriptRoot
    }
    $WorkingDir = Resolve-Path $WorkingDir -ErrorAction Stop
    Write-Verbose "Working directory: $WorkingDir"
    
    # Change to working directory
    Push-Location $WorkingDir
    
    # Find virtual environment
    Write-Host "🔍 Detecting Python environment..." -ForegroundColor Yellow
    $venv = Find-VirtualEnv -StartPath $VenvPath
    Write-Host "✓ Python found: $($venv.Python)" -ForegroundColor Green
    
    if ($venv.Path -ne "system") {
        Write-Host "✓ Virtual environment: $($venv.Path)" -ForegroundColor Green
        
        # Activate virtual environment if available
        if ($venv.Activate -and (Test-Path $venv.Activate)) {
            Write-Verbose "Activating virtual environment"
            & $venv.Activate
        }
    } else {
        Write-Host "⚠ Using system Python (no virtual environment)" -ForegroundColor Yellow
    }
    
    # Validate PraisonAI installation
    Write-Host "🔍 Validating PraisonAI installation..." -ForegroundColor Yellow
    $isValid, $versionInfo = Test-PraisonAIInstallation -VenvInfo $venv
    
    if (!$isValid) {
        throw "PraisonAI validation failed: $versionInfo"
    }
    
    Write-Host "✓ PraisonAI validated: $versionInfo" -ForegroundColor Green
    
    # Load environment file
    $envFile = Join-Path $WorkingDir ".env"
    if (Test-Path $envFile) {
        Write-Host "🔧 Loading environment configuration..." -ForegroundColor Yellow
        Import-EnvironmentFile -EnvPath $envFile
        Write-Host "✓ Environment loaded from: $envFile" -ForegroundColor Green
    }
    
    # Load config file if specified
    if ($ConfigFile -and (Test-Path $ConfigFile)) {
        Write-Host "📋 Configuration file: $ConfigFile" -ForegroundColor Cyan
    }
    
    # Print diagnostics if debug mode
    if ($Debug) {
        Write-Host "`n📊 Diagnostic Information:" -ForegroundColor Magenta
        Write-Host "  Script Location: $PSScriptRoot" -ForegroundColor Gray
        Write-Host "  Working Directory: $WorkingDir" -ForegroundColor Gray
        Write-Host "  Python Executable: $($venv.Python)" -ForegroundColor Gray
        Write-Host "  PraisonAI Command: $($venv.PraisonAI)" -ForegroundColor Gray
        Write-Host "  Virtual Environment: $($venv.Path)" -ForegroundColor Gray
        Write-Host "  Environment File: $(if (Test-Path $envFile) { $envFile } else { 'Not found' })" -ForegroundColor Gray
        Write-Host "  Host:Port: $Host`:$Port" -ForegroundColor Gray
        Write-Host "  PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Gray
        Write-Host "  Current User: $env:USERNAME" -ForegroundColor Gray
        
        # Test API key availability (without revealing it)
        $apiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY")
        $apiKeyStatus = if ($apiKey -and $apiKey.Length -gt 10) { "✓ Set (${apiKey.Length} chars)" } else { "❌ Missing" }
        Write-Host "  OpenAI API Key: $apiKeyStatus" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Final launch message
    Write-Host "🚀 Launching OpenClaw Dashboard..." -ForegroundColor Green
    Write-Host "   URL: http://$Host`:$Port" -ForegroundColor Cyan
    Write-Host "   Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Build command arguments
    $clawArgs = @("claw", "--port", $Port.ToString(), "--host", $Host)
    if ($ConfigFile -and (Test-Path $ConfigFile)) {
        $clawArgs += @("--config", $ConfigFile)
    }
    
    # Execute PraisonAI Claw
    if ($venv.PraisonAI -eq "praisonai") {
        # System installation
        & praisonai @clawArgs
    } else {
        # Virtual environment installation
        & $venv.PraisonAI @clawArgs
    }
    
} catch {
    Write-Host "`n❌ Launch failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Provide helpful error guidance
    if ($_.Exception.Message -match "Python.*not found") {
        Write-Host @"

💡 Python Installation Help:
  1. Install Python 3.8+ from https://www.python.org/downloads/
  2. Ensure Python is added to PATH during installation
  3. Restart PowerShell and try again

"@ -ForegroundColor Yellow
    } elseif ($_.Exception.Message -match "PraisonAI") {
        Write-Host @"

💡 PraisonAI Installation Help:
  Create virtual environment and install:
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install "praisonai[agents,tools,claw]"

"@ -ForegroundColor Yellow
    } elseif ($_.Exception.Message -match "API.*key") {
        Write-Host @"

💡 API Key Configuration Help:
  Create .env file in working directory:
    echo "OPENAI_API_KEY=your-key-here" > .env

"@ -ForegroundColor Yellow
    }
    
    exit 1
} finally {
    # Restore original location
    Pop-Location
}