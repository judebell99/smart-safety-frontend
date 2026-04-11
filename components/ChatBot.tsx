'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: '안녕하세요! 공장 관제 AI 비서입니다. 무엇을 보고해 드릴까요?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 🌟 1. 스크롤을 맨 아래로 내리기 위한 Ref 장착
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 🌟 2. 메시지 배열이 바뀌거나 로딩 상태가 바뀔 때마다 실행되는 스크롤 자동화
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: '네트워크 오류가 발생했습니다.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="absolute bottom-6 right-6 z-50">
      {isOpen && (
        <div className="w-[450px] h-[600px] max-h-[80vh] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl flex flex-col overflow-hidden mb-4 backdrop-blur-md bg-opacity-95">
          <div className="bg-slate-700 p-4 text-white font-bold flex justify-between items-center">
            <span className="text-lg">🤖 AI 안전 비서</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-red-400 text-xl transition-colors">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* AI 메시지는 말풍선 너비를 조금 더 넓게(90%) 주어 표나 긴 글이 잘리게 않게 함 */}
                <div className={`p-4 rounded-xl max-w-[90%] text-sm shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 border border-slate-600 rounded-bl-sm'}`}>

                  {msg.role === 'user' ? (
                    // 유저가 보낸 메시지는 마크다운 파싱 없이 그대로 렌더링
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    // 🌟 AI가 보낸 메시지는 ReactMarkdown으로 노션처럼 렌더링
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 각 마크다운 요소(태그)별 커스텀 Tailwind 스타일 정의
                        p: ({ node, ...props }) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="marker:text-blue-400" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-blue-300" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-4 mb-2 text-white border-b border-slate-500 pb-1" {...props} />,
                        table: ({ node, ...props }) => <div className="overflow-x-auto mb-3"><table className="min-w-full text-xs border-collapse border border-slate-600" {...props} /></div>,
                        th: ({ node, ...props }) => <th className="bg-slate-800 border border-slate-600 px-2 py-1 text-left font-bold" {...props} />,
                        td: ({ node, ...props }) => <td className="border border-slate-600 px-2 py-1" {...props} />,
                        code: ({ node, inline, ...props }: any) =>
                          inline ? (
                            <code className="bg-slate-900 text-pink-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                          ) : (
                            <pre className="bg-slate-900 p-3 rounded-lg overflow-x-auto text-xs font-mono text-slate-300 my-2"><code {...props} /></pre>
                          )
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}

                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-xl bg-slate-700 text-slate-400 text-sm animate-pulse rounded-bl-sm border border-slate-600">
                  데이터베이스를 조회하며 분석 중입니다...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-800 border-t border-slate-600 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="예: 오늘 발생한 위반 내역 요약해 줘."
              className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-white text-sm font-bold transition-colors shadow-lg">전송</button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center text-3xl hover:bg-blue-500 hover:scale-110 transition-all duration-300"
        >
          💬
        </button>
      )}
    </div>
  )
}