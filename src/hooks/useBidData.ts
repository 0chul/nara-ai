import { useState, useEffect, useCallback } from 'react';
import { fetchBidNotices } from '../services/api';
import { saveBids, getAllBids, clearBids, getLatestBid, cleanupOldBids } from '../services/db';
import { BidItem } from '../types';

interface UseBidDataProps {
    apiKey: string;
    shouldEncodeKey: boolean;
    startDate: string;
    endDate: string;
    retentionDays: number;
    saveOnlyFiltered: boolean;
}

export const useBidData = ({
    apiKey,
    shouldEncodeKey,
    startDate,
    endDate,
    retentionDays,
    saveOnlyFiltered
}: UseBidDataProps) => {
    const [data, setData] = useState<BidItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Helper to convert YYYYMMDD... to YYYY-MM-DD
    const parseDbDate = (dateStr: string): string => {
        if (!dateStr || dateStr.length < 8) return '';
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    };

    const refreshDataFromDb = useCallback(async () => {
        const savedBids = await getAllBids();
        if (savedBids.length > 0) {
            setData(savedBids);
            setHasSearched(true);
        } else {
            setData([]);
            setHasSearched(false);
        }
    }, []);

    // Initialize data from Local DB on mount
    useEffect(() => {
        refreshDataFromDb();
    }, [refreshDataFromDb]);

    // Helper to check conditions (Unified Logic)
    const isTargetBid = (item: BidItem) => {
        const keywords = ['교육', '강의', '컨설팅', 'HRD', '연수', '워크숍', '세미나', '진로', '취업', '캠프'];
        return keywords.some(keyword => (item.bidNtceNm || "").includes(keyword));
    };

    // Mode 1: Incremental Update
    const handleUpdateLatest = async () => {
        setLoading(true);
        setError(null);
        setStatusMessage(null);
        setDebugUrl(null);

        if (!apiKey) {
            setError("서비스 키가 필요합니다.");
            setLoading(false);
            return;
        }

        try {
            const latestBid = await getLatestBid();
            let fetchStart = startDate;

            if (latestBid && latestBid.bidNtceDt) {
                fetchStart = parseDbDate(latestBid.bidNtceDt);
                console.log(`[useBidData] Found latest bid date: ${fetchStart}`);
            } else {
                console.log(`[useBidData] No existing data. Starting full fetch from ${startDate}`);
            }

            setStatusMessage(`${fetchStart} 부터 ${endDate} 까지 데이터를 확인 중...`);
            const result = await fetchBidNotices(fetchStart, endDate, apiKey, shouldEncodeKey);

            if (result.debugUrl) setDebugUrl(result.debugUrl);

            if (result.error) {
                setError(result.error);
            } else {
                const newItems = result.items || [];
                if (newItems.length > 0) {
                    let itemsToSave = newItems;
                    if (saveOnlyFiltered) {
                        itemsToSave = newItems.filter(isTargetBid);
                    }

                    if (itemsToSave.length > 0) {
                        await saveBids(itemsToSave);
                        setStatusMessage(`업데이트 완료! ${newItems.length}건 스캔, ${itemsToSave.length}건 저장.`);
                    } else {
                        setStatusMessage("수집된 공고 중 조건에 맞는 새로운 공고가 없습니다.");
                    }

                    await cleanupOldBids(retentionDays);
                    await refreshDataFromDb();
                } else {
                    setStatusMessage("새로운 공고가 없습니다. (최신 상태)");
                }
                setHasSearched(true);
            }
        } catch (e: any) {
            setError(e.message || "업데이트 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    // Mode 2: Full Refresh
    const handleFullReset = async () => {
        if (!window.confirm("저장된 모든 데이터를 삭제하고 처음부터 다시 수집하시겠습니까?\n(데이터 양에 따라 시간이 걸릴 수 있습니다)")) {
            return;
        }

        setLoading(true);
        setError(null);
        setStatusMessage("기존 데이터를 삭제하고 전체 기간을 재수집합니다...");
        setDebugUrl(null);

        if (!apiKey) {
            setError("서비스 키가 필요합니다.");
            setLoading(false);
            return;
        }

        try {
            await clearBids();
            setData([]);

            const result = await fetchBidNotices(startDate, endDate, apiKey, shouldEncodeKey);

            if (result.debugUrl) setDebugUrl(result.debugUrl);

            if (result.error) {
                setError(result.error);
            } else {
                const newItems = result.items || [];
                if (newItems.length > 0) {
                    let itemsToSave = newItems;
                    if (saveOnlyFiltered) {
                        itemsToSave = newItems.filter(isTargetBid);
                    }

                    if (itemsToSave.length > 0) {
                        await saveBids(itemsToSave);
                        await refreshDataFromDb();
                        setStatusMessage(`전체 수집 완료! ${itemsToSave.length}건이 저장되었습니다.`);
                    } else {
                        setStatusMessage("조회된 데이터 중 조건에 맞는 공고가 없습니다.");
                    }

                    await cleanupOldBids(retentionDays);
                } else {
                    setStatusMessage("해당 기간에 조회된 데이터가 없습니다.");
                }
                setHasSearched(true);
            }
        } catch (e: any) {
            setError(e.message || "전체 수집 중 오류 발생");
        } finally {
            setLoading(false);
        }
    };

    return {
        data,
        loading,
        error,
        statusMessage,
        debugUrl,
        hasSearched,
        handleUpdateLatest,
        handleFullReset,
        parseDbDate
    };
};
