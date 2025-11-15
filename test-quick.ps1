Write-Host "Testing Gemini API..." -ForegroundColor Cyan

$body = @{
    expectedAnswer = '["你好"]'
    transcript = "你好"
    lessonId = "C1-L01"
    questionId = "Q1"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8082/api/score" `
        -Method POST `
        -Body ($body | ConvertTo-Json) `
        -ContentType "application/json"
    
    Write-Host "`nResult:" -ForegroundColor Green
    Write-Host "Method: $($response.method)"
    Write-Host "Score: $($response.overall_score)"
    Write-Host "Feedback: $($response.feedback)"
    
    if ($response.method -eq 'gemini') {
        Write-Host "`nGemini API is working!" -ForegroundColor Green
    } else {
        Write-Host "`nUsing mock scoring (Gemini not active)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
