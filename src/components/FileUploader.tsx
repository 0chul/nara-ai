import React, { useState } from 'react';
import { Upload, FileText, File as FileIcon, X, Plus, Play, Database, Pin, ArrowRight } from 'lucide-react';
import { RFPMetadata, BidItem } from '../types';
import { getAllBids } from '../services/naraDb';

interface FileUploaderProps {
  onUploadComplete: (files: RFPMetadata[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<RFPMetadata[]>([]);
  const [pinnedBids, setPinnedBids] = useState<BidItem[]>([]);

  // Load pinned bids from DB
  React.useEffect(() => {
    const loadPinned = async () => {
      const bids = await getAllBids();
      setPinnedBids(bids.filter(b => b.isPinned));
    };
    loadPinned();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: File[]) => {
    setIsUploading(true);

    // Simulate processing time for multiple files
    setTimeout(() => {
      const newMetadataList: RFPMetadata[] = files.map(file => ({
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
        uploadDate: new Date().toLocaleDateString()
      }));

      setUploadedFiles((prev: RFPMetadata[]) => [...prev, ...newMetadataList]);
      setIsUploading(false);
    }, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Important: Convert FileList to Array immediately before async operations or clearing input
      // Cast to File[] to resolve TypeScript error: Argument of type 'unknown[]' is not assignable to parameter of type 'File[]'
      const selectedFiles = Array.from(e.target.files) as File[];
      processFiles(selectedFiles);
    }
    // Reset value to allow selecting the same file again if needed
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prev: RFPMetadata[]) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleConfirm = () => {
    if (uploadedFiles.length > 0) {
      onUploadComplete(uploadedFiles);
    }
  };

  const startFromBid = (bid: BidItem) => {
    // This is handled by a separate event, but to make it work from here, 
    // we can simulate the bid selection logic or just trigger the app-level handler
    // Since App.tsx handles onSelectBid via NaraBidBrowser, we should probably 
    // expose a way to trigger that or just manually call onUploadComplete with bid data.

    // For simplicity, let's just trigger the global event or provide the data.
    // In our case, handleBidSelection in App.tsx is the logic we want.
    // Let's use a CustomEvent to pass the bid back to App.tsx
    window.dispatchEvent(new CustomEvent('select-pinned-bid', { detail: bid }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">RFP 소스 선택</h2>
        <p className="text-slate-500 mt-2">파일을 업로드하거나 나라장터 입찰 공고에서 가져오세요.</p>
      </div>

      {/* Pinned Bids Recommendation */}
      {pinnedBids.length > 0 && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Pin size={18} className="text-blue-600 fill-blue-600" />
            <h3 className="font-bold text-blue-900">핀업된 관심 공고</h3>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">Quick Start</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedBids.map(bid => (
              <div
                key={`${bid.bidNtceNo}-${bid.bidNtceOrd}`}
                onClick={() => startFromBid(bid)}
                className="bg-white border border-blue-200 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:shadow-md hover:border-blue-400 transition-all"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-slate-800 truncate mb-1">{bid.bidNtceNm}</p>
                  <p className="text-xs text-slate-500 truncate">{bid.ntceInsttNm} • D-{
                    Math.ceil((new Date(bid.bidNtceEndDt.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                  }일 남음</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Selection Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-nara-browser'))}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2 transition-all"
        >
          <Database className="w-5 h-5" />
          나라장터 입찰 공고 가져오기
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-slate-50 text-slate-500">또는</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 min-h-[300px]
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
        >
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileSelect}
            accept=".pdf,.ppt,.pptx,.doc,.docx"
          />

          {isUploading ? (
            <div className="flex flex-col items-center animate-pulse">
              <FileText size={48} className="text-blue-500 mb-4" />
              <span className="text-lg font-medium text-slate-700">파일 처리 중...</span>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 text-center">파일 드래그 또는 클릭</h3>
              <p className="text-sm text-slate-500 mt-2 text-center">PDF, PPTX, DOCX 지원<br />(여러 파일 선택 가능)</p>
              <div className="mt-6 flex gap-2 justify-center">
                <div className="flex items-center text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  <Plus size={10} className="mr-1" /> 다중 업로드 가능
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: File List & Action */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[300px]">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileIcon size={18} />
              업로드 목록
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{uploadedFiles.length}</span>
            </h3>
          </div>

          <div className="flex-1 p-4 overflow-y-auto max-h-[300px]">
            {uploadedFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <FileText size={40} className="text-slate-200" />
                <p className="text-sm">업로드된 파일이 없습니다.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.fileName}</p>
                        <p className="text-xs text-slate-400">{file.fileSize} • {file.uploadDate}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="파일 삭제"
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleConfirm}
              disabled={uploadedFiles.length === 0}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                  ${uploadedFiles.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              <Play size={20} fill="currentColor" />
              분석 에이전트 실행
            </button>
            {uploadedFiles.length > 0 && (
              <p className="text-xs text-center text-slate-500 mt-2">
                {uploadedFiles.length}개의 문서를 분석하여 요구사항을 추출합니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};