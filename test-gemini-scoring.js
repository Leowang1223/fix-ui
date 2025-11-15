const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testGeminiScoring() {
  console.log('🧪 測試 Gemini API 評分功能\n');
  console.log('=' .repeat(60));

  // 測試配置
  const API_BASE = 'http://localhost:8082';
  const testCases = [
    {
      name: '測試案例 1: 正確發音',
      expectedText: '你好',
      transcript: '你好',
      shouldPass: true
    },
    {
      name: '測試案例 2: 發音錯誤',
      expectedText: '你好',
      transcript: '你呵',
      shouldPass: false
    },
    {
      name: '測試案例 3: 完整句子',
      expectedText: '我今天很高興',
      transcript: '我今天很高興',
      shouldPass: true
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 ${testCase.name}`);
    console.log(`期望文本: ${testCase.expectedText}`);
    console.log(`轉錄文本: ${testCase.transcript}`);
    console.log('-'.repeat(60));

    try {
      // 創建測試請求
      const formData = new FormData();
      
      // 創建一個簡單的音頻文件（實際上我們主要測試文本評分邏輯）
      const audioBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46]); // 簡單的音頻標頭
      formData.append('audio', audioBuffer, {
        filename: 'test.webm',
        contentType: 'audio/webm'
      });
      
      formData.append('expectedAnswer', JSON.stringify([testCase.expectedText]));
      formData.append('transcript', testCase.transcript);
      formData.append('lessonId', 'C1-L01');
      formData.append('questionId', 'Q' + i);

      // 發送評分請求
      const response = await axios.post(
        `${API_BASE}/api/score`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      const result = response.data;
      
      console.log('\n✅ 評分成功！');
      console.log(`評分方法: ${result.method || 'unknown'}`);
      console.log(`總分: ${result.overall_score}/100`);
      console.log(`發音: ${result.pronunciation}/100`);
      console.log(`流暢度: ${result.fluency}/100`);
      console.log(`準確度: ${result.accuracy}/100`);
      console.log(`完整度: ${result.completeness}/100`);
      console.log(`是否通過: ${result.passed ? '✅ 是' : '❌ 否'}`);
      
      if (result.feedback) {
        console.log(`\n反饋: ${result.feedback}`);
      }
      
      if (result.suggestions && result.suggestions.length > 0) {
        console.log('\n建議:');
        result.suggestions.forEach((s, idx) => {
          console.log(`  ${idx + 1}. ${s}`);
        });
      }

      // 驗證結果
      if (result.method === 'gemini') {
        console.log('\n🎯 使用了 Gemini API 評分');
        successCount++;
      } else if (result.method === 'mock') {
        console.log('\n⚠️  使用了 Mock 評分（Gemini API 可能未配置或失敗）');
        failCount++;
      } else {
        console.log('\n⚠️  未知的評分方法');
        failCount++;
      }

      // 檢查評分邏輯是否合理
      if (testCase.shouldPass && result.passed) {
        console.log('✅ 評分邏輯正確：應該通過且確實通過');
      } else if (!testCase.shouldPass && !result.passed) {
        console.log('✅ 評分邏輯正確：應該失敗且確實失敗');
      } else {
        console.log('⚠️  評分邏輯可能有問題：預期與實際不符');
      }

    } catch (error) {
      console.log('\n❌ 評分失敗！');
      if (error.response) {
        console.log(`狀態碼: ${error.response.status}`);
        console.log(`錯誤信息: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.log('無法連接到後端服務');
        console.log('請確保後端服務正在運行 (port 8082)');
      } else {
        console.log(`錯誤: ${error.message}`);
      }
      failCount++;
    }
  }

  // 最終報告
  console.log('\n' + '='.repeat(60));
  console.log('📊 測試總結');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount}/${testCases.length}`);
  console.log(`❌ 失敗: ${failCount}/${testCases.length}`);
  
  if (successCount === testCases.length) {
    console.log('\n🎉 所有測試通過！Gemini API 運作正常！');
  } else if (successCount > 0) {
    console.log('\n⚠️  部分測試通過，請檢查失敗的案例');
  } else {
    console.log('\n❌ 所有測試失敗，請檢查：');
    console.log('   1. Gemini API Key 是否正確配置在 apps/backend/.env');
    console.log('   2. 後端服務是否正常運行');
    console.log('   3. 網絡連接是否正常');
  }
}

// 執行測試
testGeminiScoring().catch(error => {
  console.error('\n💥 測試過程發生錯誤:', error.message);
  process.exit(1);
});
