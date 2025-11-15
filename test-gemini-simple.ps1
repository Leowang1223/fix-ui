# 簡單的 Gemini API 評分測試
Write-Host "🧪 測試 Gemini API 評分功能" -ForegroundColor Cyan
Write-Host "=" * 60

# 創建一個簡單的測試音頻文件（RIFF WAVE 標頭）
$audioBytes = [byte[]](0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 
                         0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20)
$audioPath = Join-Path $env:TEMP "test-audio.wav"
[System.IO.File]::WriteAllBytes($audioPath, $audioBytes)

Write-Host "`n📝 測試案例: 基本評分測試" -ForegroundColor Yellow
Write-Host "期望文本: 你好"
Write-Host "使用音頻: $audioPath"
Write-Host "-" * 60

try {
    # 構建 multipart/form-data 請求
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"audio`"; filename=`"test.wav`"",
        "Content-Type: audio/wav",
        "",
        [System.Text.Encoding]::UTF8.GetString($audioBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"expectedAnswer`"",
        "",
        "[`"你好`"]",
        "--$boundary",
        "Content-Disposition: form-data; name=`"transcript`"",
        "",
        "你好",
        "--$boundary",
        "Content-Disposition: form-data; name=`"lessonId`"",
        "",
        "C1-L01",
        "--$boundary",
        "Content-Disposition: form-data; name=`"questionId`"",
        "",
        "Q1",
        "--$boundary--"
    )
    
    $body = ($bodyLines -join $LF)
    
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8082/api/score" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "`n✅ 評分成功！" -ForegroundColor Green
    Write-Host "評分方法: $($result.method)"
    
    if ($result.method -eq 'gemini') {
        Write-Host "🎯 使用了 Gemini API 評分！" -ForegroundColor Green
    } else {
        Write-Host "⚠️  使用了 Mock 評分" -ForegroundColor Yellow
    }
    
    Write-Host "`n總分: $($result.overall_score)/100"
    Write-Host "轉錄: $($result.transcript)"
    Write-Host "反饋: $($result.feedback)"
    
    if ($result.suggestions) {
        Write-Host "`n建議:"
        $result.suggestions | ForEach-Object -Begin { $i = 1 } -Process {
            Write-Host "  $i. $_"
            $i++
        }
    }
    
    if ($result.mispronounced -and $result.mispronounced.Count -gt 0) {
        Write-Host "`n讀錯的字:"
        $result.mispronounced | ForEach-Object {
            Write-Host "  - $($_.text) ($($_.pinyin)): $($_.issue)"
            Write-Host "    建議: $($_.tip)"
        }
    }
    
    Write-Host "`n" + "=" * 60
    if ($result.method -eq 'gemini') {
        Write-Host "🎉 測試成功！Gemini API 運作正常！" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Gemini API 未啟用，使用了備用的 Mock 評分" -ForegroundColor Yellow
        Write-Host "可能原因："
        Write-Host "  1. API Key 未配置或無效"
        Write-Host "  2. 音頻文件格式不支持"
        Write-Host "  3. Gemini API 配額用完或網絡問題"
    }
    
} catch {
    Write-Host "`n❌ 測試失敗！" -ForegroundColor Red
    Write-Host "錯誤: $_"
    Write-Host $_.Exception.Message
} finally {
    # 清理測試文件
    if (Test-Path $audioPath) {
        Remove-Item $audioPath -Force
    }
}
