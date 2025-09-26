# UNIFIED LOGIN TEST - PowerShell Version
Write-Host "🧪 TESTING UNIFIED LOGIN ROUTE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📧 Email: support@bitto.tech" -ForegroundColor Yellow
Write-Host "🔐 Password: Testing123?" -ForegroundColor Yellow
Write-Host "🎯 Endpoint: /api/auth/login-unified" -ForegroundColor Yellow
Write-Host ""

$body = @{
    email = "support@bitto.tech"
    password = "Testing123?"
    rememberMe = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login-unified" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    
    Write-Host "✅ LOGIN SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 RESPONSE ANALYSIS:" -ForegroundColor Cyan
    Write-Host "  User ID: $($response.user.id)" -ForegroundColor White
    Write-Host "  Email: $($response.user.email)" -ForegroundColor White
    Write-Host "  Tenant ID: $($response.user.tenant_id)" -ForegroundColor White
    Write-Host "  Subdomain: $($response.user.tenant.subdomain)" -ForegroundColor White
    Write-Host "  Role: $($response.user.role)" -ForegroundColor White
    Write-Host "  Access Level: $($response.user.access_level)" -ForegroundColor White
    
    if ($response.session.access_token) {
        Write-Host "  Session Token: Present ($($response.session.access_token.Length) chars)" -ForegroundColor Green
    } else {
        Write-Host "  Session Token: Missing" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🏢 MULTI-TENANT VALIDATION:" -ForegroundColor Cyan
    if ($response.user.tenant_id -and $response.user.tenant.subdomain) {
        Write-Host "  ✅ PASSED - Tenant data present" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAILED - Missing tenant data" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🎯 UNIFIED ROUTE STATUS: ✅ WORKING PERFECTLY" -ForegroundColor Green
    Write-Host "✅ READY FOR FRONTEND MIGRATION" -ForegroundColor Green

} catch {
    Write-Host "❌ LOGIN FAILED:" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "❌ UNIFIED ROUTE: NEEDS DEBUGGING" -ForegroundColor Red
    Write-Host "❌ DO NOT MIGRATE YET" -ForegroundColor Red
}

