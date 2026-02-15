'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useState } from 'react'

type TopBarProps = {
  onEndInterview?: () => Promise<void>
  onCleanupResources?: () => void
}

export default function TopBar({ onEndInterview, onCleanupResources }: TopBarProps) {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowConfirmDialog(true)
  }

  const handleConfirm = async () => {
    setShowConfirmDialog(false)
    try {
      // 先執行資源清理（與 beforeunload 共用）
      if (onCleanupResources) {
        onCleanupResources()
      }
      
      // 調用結束面試函數（包含額外的狀態重置）
      if (onEndInterview) {
        await onEndInterview()
      }
      
      // 返回 Dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('結束面試時發生錯誤:', error)
      // 即使出錯也返回 Dashboard
      router.push('/dashboard')
    }
  }

  const handleCancel = () => {
    setShowConfirmDialog(false)
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleBackClick}
              className="text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
              aria-label="返回首頁"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center flex-shrink-0">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Talk Learning
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 自定義確認對話框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                即將結束面試
              </h3>
              <p className="text-gray-600 mb-6">
                確定要結束面試並返回 Dashboard 嗎？
                <br />
                <span className="text-sm text-gray-500">
                  手動結束不會保存面試記錄
                </span>
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
