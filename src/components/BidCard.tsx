import React from 'react';
import { BidItem } from '../types';
import { Building2, MapPin, Calendar, ExternalLink, Tag, GraduationCap } from 'lucide-react';

interface BidCardProps {
  item: BidItem;
}

export const BidCard: React.FC<BidCardProps> = ({ item }) => {
  const formatCurrency = (val?: string) => {
    if (!val) return '-';
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Number(val));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const min = dateStr.substring(10, 12);
    return `${year}-${month}-${day} ${hour}:${min}`;
  };

  // Check for target keywords (Education related)
  const keywords = ['교육', '강의', '컨설팅', 'HRD', '연수', '워크숍', '세미나', '진로', '취업', '캠프'];
  const isEducation = keywords.some(k => (item.bidNtceNm || "").includes(k));

  // High value check (e.g. over 100 million KRW)
  const isHighValue = item.presmptPrce && Number(item.presmptPrce) >= 100000000;

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md ${isEducation ? 'border-2 border-indigo-400 bg-indigo-50' : 'border-gray-200'
      }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex gap-1 mb-2">
            <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${item.bidNtceSttusNm.includes("취소") ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
              }`}>
              {item.bidNtceSttusNm}
            </span>
            {isEducation && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700">
                <GraduationCap className="w-3 h-3" /> 교육/컨설팅
              </span>
            )}
            {isHighValue && <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">1억이상</span>}
          </div>
          <h3 className="text-lg font-bold text-gray-800 leading-tight hover:text-blue-600">
            <a href={item.bidNtceUrl} target="_blank" rel="noopener noreferrer">
              {item.bidNtceNm}
            </a>
          </h3>
          <div className="text-xs text-gray-500 mt-1">공고번호: {item.bidNtceNo}</div>
        </div>
        {item.presmptPrce && (
          <div className="text-right">
            <div className="text-xs text-gray-400">배정예산/추정가격</div>
            <div className={`font-bold ${isHighValue ? 'text-amber-600' : 'text-gray-700'}`}>{formatCurrency(item.presmptPrce)}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="truncate">{item.ntceInsttNm} / {item.dminsttNm}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700">
            {item.prtcptPsblRgnNm || "전국(지역제한없음)"}
          </span>
        </div>
        <div className="flex items-center gap-2 col-span-1 md:col-span-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <span className="truncate" title={item.bidprcPsblIndstrytyNm}>
            {item.bidprcPsblIndstrytyNm || "업종제한없음"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>게시일: {formatDate(item.bidNtceBgnDt)}</span>
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-gray-100">
        <a
          href={item.bidNtceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
        >
          나라장터 공고 보기 <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};