# Manually trigger the queue worker
# Run this if cron isn't working and you need to process jobs

$url = "https://sculptai.docsflow.app/api/queue/worker"
$headers = @{
    "Authorization" = "Bearer 7K9mP2xQ8vL4nR6wY3sT1hF5jD0bV9zA"
    "Content-Type" = "application/json"
}

Write-Host "🔄 Triggering queue worker..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Processed: $($result.processed) jobs" -ForegroundColor Cyan
    Write-Host "   Duration: $($result.duration_ms)ms" -ForegroundColor Cyan
    Write-Host "   Job IDs: $($result.jobs -join ', ')" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

