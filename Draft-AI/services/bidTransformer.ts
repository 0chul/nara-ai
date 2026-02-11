import { BidItem } from '../types';
import { AnalysisResult } from '../types';

/**
 * Extract industry type from bid's industry classification
 */
function extractIndustry(industryName: string): string {
    if (!industryName) return '공공/교육';

    // Common patterns
    if (industryName.includes('교육')) return '교육';
    if (industryName.includes('제조')) return '제조/생산';
    if (industryName.includes('건설')) return '건설/인프라';
    if (industryName.includes('IT') || industryName.includes('정보통신')) return 'IT/통신';
    if (industryName.includes('금융')) return '금융/보험';
    if (industryName.includes('의료') || industryName.includes('보건')) return '의료/보건';

    return industryName || '공공/교육';
}

/**
 * Extract educational objectives from bid title
 */
function extractObjectives(bidTitle: string): string[] {
    const objectives: string[] = [];

    if (bidTitle.includes('역량강화') || bidTitle.includes('역량 강화')) {
        objectives.push('핵심 역량 강화');
    }
    if (bidTitle.includes('리더십')) {
        objectives.push('리더십 개발');
    }
    if (bidTitle.includes('교육') || bidTitle.includes('과정')) {
        objectives.push('전문 교육 실시');
    }
    if (bidTitle.includes('워크숍') || bidTitle.includes('세미나')) {
        objectives.push('실무 워크숍 진행');
    }
    if (bidTitle.includes('컨설팅')) {
        objectives.push('전문 컨설팅 제공');
    }

    // Default if nothing matched
    if (objectives.length === 0) {
        objectives.push('교육 프로그램 운영');
        objectives.push('실무 역량 향상');
    }

    return objectives;
}

/**
 * Extract modules/topics from bid title
 */
function extractModules(bidTitle: string): string[] {
    const modules: string[] = [];

    // Extract keywords as module names
    if (bidTitle.includes('리더십')) modules.push('리더십 개발');
    if (bidTitle.includes('소통') || bidTitle.includes('커뮤니케이션')) modules.push('커뮤니케이션 스킬');
    if (bidTitle.includes('AI') || bidTitle.includes('인공지능')) modules.push('AI 활용 교육');
    if (bidTitle.includes('DT') || bidTitle.includes('디지털')) modules.push('디지털 트랜스포메이션');
    if (bidTitle.includes('데이터')) modules.push('데이터 분석');
    if (bidTitle.includes('안전')) modules.push('안전 교육');
    if (bidTitle.includes('CS') || bidTitle.includes('고객')) modules.push('고객 서비스');
    if (bidTitle.includes('ESG')) modules.push('ESG 경영');

    // Default modules if no specific ones found
    if (modules.length === 0) {
        modules.push('교육 프로그램 모듈 1');
        modules.push('교육 프로그램 모듈 2');
    }

    return modules;
}

/**
 * Format schedule from bid dates
 */
function formatSchedule(beginDate: string, endDate: string): string {
    if (!beginDate && !endDate) return '일정 미정';

    const formatDate = (dateStr: string): string => {
        if (!dateStr || dateStr.length < 8) return '';
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    };

    const begin = formatDate(beginDate);
    const end = formatDate(endDate);

    if (begin && end) {
        return `${begin} ~ ${end} (입찰 기간 기준)`;
    } else if (begin) {
        return `${begin}부터`;
    } else if (end) {
        return `${end}까지`;
    }

    return '일정 협의';
}

/**
 * Main conversion function: BidItem → AnalysisResult
 * This allows a selected bid to be treated as an analyzed RFP
 */
export function convertBidToRFP(bid: BidItem): AnalysisResult {
    return {
        clientName: bid.ntceInsttNm || bid.dminsttNm || '발주 기관',
        industry: extractIndustry(bid.bidprcPsblIndstrytyNm),
        department: bid.dminsttNm || '수요 부서',
        programName: bid.bidNtceNm,
        objectives: extractObjectives(bid.bidNtceNm),
        targetAudience: '교육 대상자 (RFP 문서 참조)',
        schedule: formatSchedule(bid.bidNtceBgnDt, bid.bidNtceEndDt),
        location: bid.prtcptPsblRgnNm || '지역 미명시',
        modules: extractModules(bid.bidNtceNm),
        specialRequests: [
            bid.presmptPrce ? `예상 예산: ${bid.presmptPrce}원` : '',
            `입찰 공고 URL: ${bid.bidNtceUrl}`,
            `공고번호: ${bid.bidNtceNo}-${bid.bidNtceOrd}`,
            `사업 구분: ${bid.bsnsDivNm || '미명시'}`
        ].filter(Boolean).join(' | ')
    };
}

/**
 * Helper to check if a bid matches education-related keywords
 * (Can be used for filtering in the browser)
 */
export function isEducationBid(bid: BidItem): boolean {
    const keywords = ['교육', '강의', '컨설팅', 'HRD', '연수', '워크숍', '세미나', '진로', '취업', '캠프'];
    const title = bid.bidNtceNm || '';
    return keywords.some(keyword => title.includes(keyword));
}
