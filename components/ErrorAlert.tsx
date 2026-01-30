import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface ErrorAlertProps {
  message: string | null;
  debugUrl?: string | null;
  title?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, debugUrl, title = "데이터 수집 실패" }) => {
  if (!message) return null;

  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-red-800 mb-1">{title}</h3>
          <p className="text-sm text-red-700 mb-3 whitespace-pre-line leading-relaxed">{message}</p>
          {debugUrl && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <a 
                href={debugUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline font-medium hover:text-blue-900 break-all"
              >
                <ExternalLink className="w-3 h-3" />
                브라우저에서 직접 URL 테스트 (클릭)
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};