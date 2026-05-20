<#
.SYNOPSIS
    PraisonAI OpenClaw Windows Setup Script
.DESCRIPTION
    Creates virtual environment, installs PraisonAI with OpenClaw, and sets up Windows-specific configuration
.PARAMETER ProjectPath
    Directory to create/use for the project (default: praisonai-openclaw)
.PARAMETER VenvName
    Virtual environment directory name (default: .venv)
.PARAMETER SkipLaunch
    Skip launching the dashboard after setup
.PARAMETER ApiKey
    OpenAI API key (will prompt if not provided)
.EXAMPLE
    .\Setup-PraisonClaw.ps1
    .\Setup-PraisonClaw.ps1 -ProjectPath "my-project" -ApiKey "sk-..."
.NOTES
    This script follows the standardized Windows + OpenClaw + venv pattern
#>
param(
    [string]$ProjectPath = "praisonai-openclaw",
    [string]$VenvName = ".venv",
    [switch]$SkipLaunch = $false,
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host @"
🦞 PraisonAI OpenClaw Windows Setup
==================================
"@ -ForegroundColor Cyan

# Function to test if running in elevated mode
function Test-Administrator {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to resolve Python command
function Get-PythonCommand {
    $pythonCommands = @("python", "python3", "py")
    
    foreach ($cmd in $pythonCommands) {
        try {
            $pythonPath = Get-Command $cmd -ErrorAction Stop
            $version = & $cmd --version 2>$null
            if ($version -match "Python (\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                if ($major -eq 3 -and $minor -ge 8) {
                    return $pythonPath.Source
                }
            }
        }
        catch {
            continue
        }
    }
    
    throw "Python 3.8+ not found. Please install Python and add to PATH."
}

# Function to get API key securely
function Get-ApiKey {
    if (-not $ApiKey) {
        Write-Host "OpenAI API key required for OpenClaw functionality." -ForegroundColor Yellow
        $secureKey = Read-Host "Enter your OpenAI API key" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
        $ApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
    return $ApiKey
}

# Main setup process
try {
    Write-Host "🔍 Checking Python installation..." -ForegroundColor Yellow
    $PythonCmd = Get-PythonCommand
    Write-Host "✓ Found Python: $PythonCmd" -ForegroundColor Green
    
    # Create project directory
    if (!(Test-Path $ProjectPath)) {
        Write-Host "📁 Creating project directory: $ProjectPath" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
    }
    
    Set-Location $ProjectPath
    $ProjectDir = Get-Location
    Write-Host "✓ Working in: $ProjectDir" -ForegroundColor Green
    
    # Create virtual environment
    $VenvPath = Join-Path $ProjectDir $VenvName
    if (!(Test-Path $VenvPath)) {
        Write-Host "🐍 Creating virtual environment..." -ForegroundColor Yellow
        & $PythonCmd -m venv $VenvName
        Write-Host "✓ Virtual environment created: $VenvPath" -ForegroundColor Green
    } else {
        Write-Host "✓ Virtual environment exists: $VenvPath" -ForegroundColor Green
    }
    
    # Activate virtual environment
    $ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
    $VenvPython = Join-Path $VenvPath "Scripts\python.exe"
    $VenvPip = Join-Path $VenvPath "Scripts\pip.exe"
    
    if (!(Test-Path $ActivateScript)) {
        throw "Virtual environment activation script not found: $ActivateScript"
    }
    
    Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
    & $ActivateScript
    
    # Verify virtual environment
    if (!(Test-Path $VenvPython)) {
        throw "Virtual environment Python not found: $VenvPython"
    }
    
    Write-Host "✓ Using venv Python: $VenvPython" -ForegroundColor Green
    
    # Upgrade pip
    Write-Host "📦 Upgrading pip..." -ForegroundColor Yellow
    & $VenvPython -m pip install --upgrade pip --quiet
    
    # Install PraisonAI with OpenClaw
    Write-Host "🚀 Installing PraisonAI with OpenClaw..." -ForegroundColor Yellow
    Write-Host "   This may take a few minutes..." -ForegroundColor Gray
    & $VenvPython -m pip install "praisonai[agents,tools,claw]" --quiet
    
    # Verify installation
    $PraisonExe = Join-Path $VenvPath "Scripts\praisonai.exe"
    if (!(Test-Path $PraisonExe)) {
        throw "PraisonAI installation failed - command not found"
    }
    
    $version = & $PraisonExe --version
    Write-Host "✓ PraisonAI installed: $version" -ForegroundColor Green
    
    # Create .env file
    $EnvFile = Join-Path $ProjectDir ".env"
    if (!(Test-Path $EnvFile)) {
        Write-Host "🔑 Setting up environment configuration..." -ForegroundColor Yellow
        $apiKey = Get-ApiKey
        
        $envContent = @"
# PraisonAI OpenClaw Environment Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# OpenAI API Key (required)
OPENAI_API_KEY=$apiKey

# Optional: Other LLM providers
# ANTHROPIC_API_KEY=your-anthropic-key
# GOOGLE_API_KEY=your-google-key
# GROQ_API_KEY=your-groq-key

# Python configuration
PYTHONPATH=.

# OpenClaw configuration
CLAW_PORT=8082
CLAW_HOST=127.0.0.1

# Logging
LOG_LEVEL=INFO
"@
        $envContent | Out-File -FilePath $EnvFile -Encoding utf8
        Write-Host "✓ Environment file created: $EnvFile" -ForegroundColor Green
    } else {
        Write-Host "✓ Environment file exists: $EnvFile" -ForegroundColor Green
    }
    
    # Create PowerShell launcher script
    $LauncherScript = Join-Path $ProjectDir "run-claw.ps1"
    $launcherContent = @"
<#
.SYNOPSIS
    Launch PraisonAI OpenClaw Dashboard
.DESCRIPTION
    Activates virtual environment and launches OpenClaw with proper Windows configuration
#>
param(
    [int]`$Port = 8082,
    [string]`$Host = "127.0.0.1",
    [switch]`$Debug = `$false
)

`$ErrorActionPreference = "Stop"

# Get script directory and resolve paths
`$ScriptDir = Split-Path -Parent `$MyInvocation.MyCommand.Path
`$VenvActivate = Join-Path `$ScriptDir "$VenvName\Scripts\Activate.ps1"
`$PraisonExe = Join-Path `$ScriptDir "$VenvName\Scripts\praisonai.exe"
`$EnvFile = Join-Path `$ScriptDir ".env"

# Validate environment
if (!(Test-Path `$VenvActivate)) {
    Write-Error "Virtual environment not found. Run Setup-PraisonClaw.ps1 first."
}

if (!(Test-Path `$PraisonExe)) {
    Write-Error "PraisonAI not found in virtual environment."
}

if (!(Test-Path `$EnvFile)) {
    Write-Warning "Environment file not found: `$EnvFile"
}

# Set working directory
Push-Location `$ScriptDir

try {
    # Activate virtual environment
    Write-Host "🦞 Starting PraisonAI OpenClaw..." -ForegroundColor Cyan
    & `$VenvActivate
    
    # Load environment variables
    if (Test-Path `$EnvFile) {
        Get-Content `$EnvFile | Where-Object { `$_.Trim() -ne "" -and !`$_.StartsWith("#") } | ForEach-Object {
            if (`$_ -match "^([^=]+)=(.*)$") {
                [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], [System.EnvironmentVariableTarget]::Process)
            }
        }
    }
    
    # Print diagnostics if debug mode
    if (`$Debug) {
        Write-Host "📊 Environment Diagnostics:" -ForegroundColor Gray
        Write-Host "  Python: `$(Join-Path `$ScriptDir "$VenvName\Scripts\python.exe")" -ForegroundColor Gray
        Write-Host "  PraisonAI: `$PraisonExe" -ForegroundColor Gray
        Write-Host "  Working Dir: `$(Get-Location)" -ForegroundColor Gray
        Write-Host "  Port: `$Port" -ForegroundColor Gray
        Write-Host "  Host: `$Host" -ForegroundColor Gray
    }
    
    Write-Host "Dashboard will open at http://`$Host`:`$Port" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Launch OpenClaw
    & `$PraisonExe claw --port `$Port --host `$Host
    
} finally {
    Pop-Location
}
"@
    $launcherContent | Out-File -FilePath $LauncherScript -Encoding utf8
    Write-Host "✓ Launcher script created: $LauncherScript" -ForegroundColor Green
    
    # Create configuration template
    $ConfigTemplate = Join-Path $ProjectDir "claw-config.yaml"
    if (!(Test-Path $ConfigTemplate)) {
        $configContent = @"
# PraisonAI OpenClaw Configuration
# Windows-specific settings for MCP bridge

name: "PraisonAI OpenClaw"
description: "Windows MCP bridge for PraisonAI agents"

# Python executable (absolute path)
python_executable: "$($VenvPython -replace '\\', '\\\\')"

# Working directory (absolute path)  
working_directory: "$($ProjectDir.Path -replace '\\', '\\\\')"

# Environment variables
environment:
  PYTHONPATH: "."
  
# Subprocess configuration for Windows
subprocess:
  executable: "$($PraisonExe -replace '\\', '\\\\')"
  shell: false
  capture_output: true
  timeout: 60
  
# Health check configuration
health:
  endpoint: "http://127.0.0.1:8082/health"
  interval: 30
  timeout: 5

# MCP server configuration
mcp:
  servers:
    praisonai_tools:
      command: "$($VenvPython -replace '\\', '\\\\')"
      args: ["-m", "praisonai.mcp.server"]
"@
        $configContent | Out-File -FilePath $ConfigTemplate -Encoding utf8
        Write-Host "✓ Configuration template created: $ConfigTemplate" -ForegroundColor Green
    }
    
    # Print setup summary
    Write-Host @"

🎉 Setup Complete!
==================
"@ -ForegroundColor Green
    
    Write-Host "Project Directory: $ProjectDir" -ForegroundColor Cyan
    Write-Host "Virtual Environment: $VenvPath" -ForegroundColor Cyan
    Write-Host "PraisonAI Command: $PraisonExe" -ForegroundColor Cyan
    Write-Host "Environment File: $EnvFile" -ForegroundColor Cyan
    Write-Host "Launcher Script: $LauncherScript" -ForegroundColor Cyan
    
    Write-Host @"

📋 Verification Checklist:
- [✓] Python 3.8+ installed
- [✓] Virtual environment created  
- [✓] PraisonAI with OpenClaw installed
- [✓] Environment configured
- [✓] Launcher script ready

🚀 Quick Start:
  .\run-claw.ps1               # Launch dashboard
  .\run-claw.ps1 -Port 9000    # Custom port
  .\run-claw.ps1 -Debug        # Debug mode

"@ -ForegroundColor White
    
    # Launch dashboard unless skipped
    if (-not $SkipLaunch) {
        Write-Host "🚀 Launching OpenClaw Dashboard..." -ForegroundColor Cyan
        Write-Host "Dashboard will open at http://127.0.0.1:8082" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop the dashboard" -ForegroundColor Gray
        Write-Host ""
        
        Start-Sleep -Seconds 2
        & $LauncherScript
    } else {
        Write-Host "Skipping dashboard launch. Run '.\run-claw.ps1' to start." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host @"

❌ Setup Failed: $($_.Exception.Message)
"@ -ForegroundColor Red
    
    if ($_.Exception.Message -match "Python") {
        Write-Host @"

💡 Python Installation Help:
1. Download Python 3.8+ from https://www.python.org/downloads/
2. During installation, check "Add Python to PATH"  
3. Restart PowerShell and try again

"@ -ForegroundColor Yellow
    }
    
    if ($_.Exception.Message -match "execution.*policy") {
        Write-Host @"

💡 PowerShell Execution Policy Help:
Run this command as Administrator:
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

Or run this script with:
  PowerShell -ExecutionPolicy Bypass -File Setup-PraisonClaw.ps1

"@ -ForegroundColor Yellow
    }
    
    exit 1
}