param(
  [string]$Message = "",
  [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Text) {
  Write-Host "[sync] $Text"
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
  Write-Error "Git is not available in PATH. Install Git for Windows and restart VS Code terminal."
}

$insideWorkTree = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or "$insideWorkTree".Trim() -ne "true") {
  Write-Error "This folder is not a Git repository. Run initial setup first (git init, add remote, first push)."
}

$branch = (git symbolic-ref --quiet --short HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($branch) -or $branch -eq "HEAD") {
  Write-Error "Could not detect current branch. Check out a branch like main first."
}

$hasRemote = git remote | Where-Object { $_.Trim() -eq $Remote }
if (-not $hasRemote) {
  Write-Error "Remote '$Remote' was not found. Add it first: git remote add $Remote <repo-url>"
}

Write-Info "Staging changes..."
git add -A
if ($LASTEXITCODE -ne 0) {
  Write-Error "git add failed."
}

$name = "$((git config user.name))".Trim()
$email = "$((git config user.email))".Trim()
if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
  Write-Error "Git user.name/user.email are not configured. Run: git config --global user.name \"Your Name\" and git config --global user.email \"you@example.com\""
}

$hasStaged = git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Info "No staged changes to commit."
  Write-Info "Pushing latest '$branch' to '$Remote'..."
  git push $Remote $branch
  exit $LASTEXITCODE
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "Update: $timestamp"
}

Write-Info "Committing with message: $Message"
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
  Write-Error "git commit failed."
}

Write-Info "Pushing '$branch' to '$Remote'..."
git push $Remote $branch
if ($LASTEXITCODE -ne 0) {
  Write-Error "git push failed."
}

Write-Info "Sync complete."
