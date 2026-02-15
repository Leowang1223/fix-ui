'use client';
import { useEffect, useState, useRef } from 'react';
import TopBar from '@/components/TopBar';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type Radar = { pronunciation:number; fluency:number; accuracy:number; comprehension:number; confidence:number };
type Overview = { total_score:number; radar:Radar; totals:{ num_questions:number; avg_think:number; avg_answer:number } };
type Row = { qid?:string; index?:number; title_short:string; scores:Radar & { total:number }; metrics:{ tpm:number; ratio:number; token_count:number }; advice?: string; optimized?: string };
type RawItem = { index:number; question:string; answer:string; thinkingTime:number; answeringTime:number; expected_answer?: string | string[] };
type Output = { 
  overview:Overview; 
  per_question:Row[]; 
  recommendations:string[]; 
  version:string;
  raw_data?: {
    session_id: string;
    date?: string;
    items: RawItem[];
  };
};

export default function AnalyzePage(){
  const [data,setData]=useState<Output|null>(null);
  const [err,setErr]=useState<string| null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    (async ()=>{
      try{
        // 優先：URL 參數取得 sessionId，若存在則直接向後端請求分析結果
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        const interviewType = urlParams.get('type') || 'self_intro'; // 從 URL 參數獲取 interview_type
        
        if (sessionId) {
          const resp = await fetch(`/v1/analyze/${encodeURIComponent(sessionId)}`);
          if(!resp.ok) throw new Error(await resp.text());
          setData(await resp.json());
          return;
        }
        
        // 後備：使用測試資料呼叫 POST /v1/analyze
        const testSessionData = {
          session_id: 'test-session-001',
          date: '2024-01-15',
          interview_type: interviewType, // 添加 interview_type 到測試數據
          items: [
            { index:0, question:'請簡單介紹你自己', answer:'我叫王小明，目前就讀資工系。我特別對系統設計和人工智慧有興趣，高中時就自學 Python 並參加過全國比賽。', thinkingTime:3, answeringTime:40 },
            { index:1, question:'你在過去學習歷程中，最具代表性的成果是什麼？', answer:'我和同學合作完成一個專題，負責後端系統設計，最終獲得校內創新獎。這個經驗讓我學會團隊協作與解決實務問題。', thinkingTime:5, answeringTime:55 },
            { index:2, question:'你對未來五年或十年的規劃是什麼？', answer:'我希望先在研究所繼續學習人工智慧，之後進入科技公司累積實務經驗，長期目標是成為系統架構師。', thinkingTime:2, answeringTime:35 }
          ]
        };
        
        const resp=await fetch('/v1/analyze',{ 
          method:'POST', 
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(testSessionData)
        });
        if(!resp.ok) throw new Error(await resp.text());
        setData(await resp.json());
      }catch(e:any){ setErr(String(e.message||e)); }
    })();
  },[]);

  if(err) return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <div className="flex items-center justify-center h-screen pt-12">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">載入失敗</h2>
          <pre className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{err}</pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    </div>
  );
  
  if(!data) return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <div className="flex items-center justify-center h-screen pt-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入分析結果中...</p>
        </div>
      </div>
    </div>
  );

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      // 隱藏 TopBar 避免在 PDF 中顯示
      const topBar = document.querySelector('[data-topbar]');
      if (topBar) {
        (topBar as HTMLElement).style.display = 'none';
      }
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportRef.current.scrollWidth,
        height: reportRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        windowHeight: 1600
      });
      
      // 恢復 TopBar 顯示
      if (topBar) {
        (topBar as HTMLElement).style.display = '';
      }
      
      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth - 20; // 留邊距
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 計算需要多少頁
      const pagesNeeded = Math.ceil(imgHeight / (pdfHeight - 20));
      
      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const yOffset = -(i * (pdfHeight - 20));
        pdf.addImage(imgData, 'PNG', 10, 10 + yOffset, imgWidth, imgHeight);
      }
      
      pdf.save(`面試分析報告_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF 生成失敗:', error);
      alert('PDF 生成失敗，請重試');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div data-topbar>
        <TopBar />
      </div>
      
      <div className="pt-12 px-6 py-8">
        <div className="w-full" ref={reportRef}>
          
          {/* 報告標題 */}
          <div className="text-center mb-16 mt-8">
            <h1 className="text-4xl font-bold text-gray-900">
              面試分析報告
            </h1>
          </div>

          {/* Section 2: Data and Radar Chart - 左右對調 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* 左邊：面試表現總覽 - 佔1/3 */}
            <div className="lg:col-span-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">面試表現總覽</h3>
              <div className="space-y-4">
                {/* 總分 */}
                <div className="bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">🏆</div>
                    <div>
                      <div className="text-gray-600 text-base">總分</div>
                      <div className="text-3xl font-bold text-gray-900">{data.overview.total_score}</div>
                    </div>
                  </div>
                </div>
                
                {/* 題數 */}
                <div className="bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl">📊</div>
                    <div>
                      <div className="text-gray-600 text-base">題數</div>
                      <div className="text-3xl font-bold text-gray-900">{data.overview.totals.num_questions}</div>
                    </div>
                  </div>
                </div>
                
                {/* 平均思考秒 */}
                <div className="bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl">⏱️</div>
                    <div>
                      <div className="text-gray-600 text-base">平均思考秒</div>
                      <div className="text-3xl font-bold text-gray-900">{data.overview.totals.avg_think}</div>
                    </div>
                  </div>
                </div>
                
                {/* 建議條數 */}
                <div className="bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl">💡</div>
                    <div>
                      <div className="text-gray-600 text-base">建議條數</div>
                      <div className="text-3xl font-bold text-gray-900">{data.recommendations.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右邊：雷達圖 - 佔2/3 */}
            <div className="lg:col-span-2 bg-white p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">能力雷達圖</h3>
              <div className="h-96 flex justify-center items-center">
                  <Radar
                    data={{
                      labels: ['发音', '流畅度', '准确度', '理解力', '自信表达'],
                      datasets: [
                        {
                          label: '評分',
                          data: [
                            data.overview.radar.pronunciation,
                            data.overview.radar.fluency,
                            data.overview.radar.accuracy,
                            data.overview.radar.comprehension,
                            data.overview.radar.confidence
                          ],
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          borderColor: 'rgba(59, 130, 246, 1)',
                          borderWidth: 1.5,
                          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointBorderColor: '#fff',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { r: { beginAtZero: true, max: 100, min: 0, ticks: { stepSize: 25 } } },
                      plugins: { legend: { display: false } },
                    }}
                  />
              </div>
            </div>
          </div>

          {/* 改進建議區塊 */}
          <div className="bg-white p-6 mb-10">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">總體改進建議</h3>
            <div className="space-y-3">
              {data.recommendations.map((x,idx)=>
                <div key={idx} className="flex items-start gap-3">
                  <span className="text-amber-500 text-lg mt-0.5">•</span>
                  <span 
                    className="text-gray-800 text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: x.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Section 3: Detailed Table - New Card Layout */}
          <h2 className="text-xl font-semibold text-gray-800 mb-6">二. 逐題分析（含逐字稿與建議）</h2>
          <div className="space-y-6">
            {data.per_question.map((r, i) => {
              const id = r.qid ?? `Q${(r.index ?? i) + 1}`;
              
              const ScoreBar = ({ label, score }: { label: string; score: number }) => (
                <div>
                  <div className="flex justify-between text-base mb-1">
                    <span className="text-gray-700">{label}</span>
                    <span className="font-semibold text-gray-800">{score}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              );

              return (
                <div key={i} className="bg-white p-6 shadow-sm rounded-lg border border-gray-200">
                  {/* Card Header */}
                  <div className="flex flex-col md:flex-row justify-between md:items-center mb-5">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2 md:mb-0">
                      {id}. {r.title_short}
                    </h4>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-gray-500 text-sm">語速</div>
                        <div className="text-xl font-semibold">{r.metrics.tpm.toFixed(0)} <span className="text-sm font-normal">字/分</span></div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 text-sm">思考比</div>
                        <div className="text-xl font-semibold">{r.metrics.ratio.toFixed(2)}</div>
                      </div>
                      <div className="text-center pl-6 border-l border-gray-200">
                        <div className="text-gray-500 text-sm">總分</div>
                        <div className="text-3xl font-bold text-blue-600">{r.scores.total}</div>
                      </div>
                    </div>
                  </div>

                  {/* Score Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <ScoreBar label="发音" score={r.scores.pronunciation} />
                    <ScoreBar label="流畅度" score={r.scores.fluency} />
                    <ScoreBar label="准确度" score={r.scores.accuracy} />
                    <ScoreBar label="理解力" score={r.scores.comprehension} />
                    <ScoreBar label="自信表达" score={r.scores.confidence} />
                  </div>

                  {/* Transcript + Advice + Optimize */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h5 className="text-base font-semibold text-gray-800 mb-3">逐字稿</h5>
                    <div className="bg-gray-50 p-4 rounded-lg text-gray-800 leading-relaxed">
                      {data.raw_data?.items?.[i]?.answer || <span className="text-gray-500 italic">[此題未回答]</span>}
                    </div>

                    {r.advice && (
                      <div className="mt-5">
                        <h5 className="text-base font-semibold text-gray-800 mb-3">針對本題的改進建議</h5>
                        <div className="bg-blue-50 text-blue-900 p-4 rounded-lg whitespace-pre-line leading-loose">
                          {r.advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('\n').map((line, idx) => (
                            <div key={idx} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3">
                      {/* 在本頁就地顯示優化稿（若後端已提供） */}
                      {r.optimized ? (
                        <details className="w-full">
                          <summary className="cursor-pointer px-3 py-2 bg-green-100 hover:bg-green-200 inline-block text-green-800 font-medium">
                            📝 查看 AI 優化稿範例
                          </summary>
                          <div className="mt-3 bg-green-50 border border-green-200 p-4 rounded">
                            <div className="text-sm text-green-700 mb-2 font-medium">💡 根據上述建議的改進範例：</div>
                            <div 
                              className="text-gray-800 leading-relaxed whitespace-pre-line"
                              dangerouslySetInnerHTML={{ 
                                __html: r.optimized?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '' 
                              }}
                            />
                          </div>
                        </details>
                      ) : (
                        <div className="text-sm text-gray-500">（無優化稿可顯示）</div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Section 4: 已併入逐題卡片中，移除重複的逐字稿區塊 */}
          
          <div className="text-center mt-10">
            <button
              onClick={downloadPDF}
              className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-base rounded"
            >
              下載報告
            </button>
          </div>
          
          <div className="text-center text-gray-500 text-sm mt-5">
            version: {data.version}
          </div>
        </div>
      </div>
    </div>
  );
}
