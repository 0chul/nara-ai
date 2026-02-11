import React, { useState } from 'react';
import { useBidData } from './hooks/useBidData';
import { Header } from './components/Layout/Header';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { AnalyticsDashboard } from './components/Dashboard/AnalyticsDashboard';
import { BidList } from './components/Bids/BidList';
import { ErrorAlert } from './components/ErrorAlert';
import { CheckCircle2, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  // --- Local UI State (Settings) ---
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(lastMonth);
  const [endDate, setEndDate] = useState(today);
  const [apiKey, setApiKey] = useState("07OoWggXTIVlamzKLV9cL9D3AmHJ0hU2glIVBAhayDo35JayhvW4zGgfnhXzPGoiiL1y3TES+a2DsvSD0CAslw==");
  const [shouldEncodeKey, setShouldEncodeKey] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [retentionDays, setRetentionDays] = useState(60);
  const [saveOnlyFiltered, setSaveOnlyFiltered] = useState(true);

  // --- Business Logic Hook ---
  const {
    data,
    loading,
    error,
    statusMessage,
    debugUrl,
    hasSearched,
    handleUpdateLatest,
    handleFullReset,
    parseDbDate
  } = useBidData({
    apiKey,
    shouldEncodeKey,
    startDate,
    endDate,
    retentionDays,
    saveOnlyFiltered
  });

  return (
    <div className="min-h-screen pb-12">
      <Header
        onToggleSettings={() => setShowSettings(!showSettings)}
        showSettings={showSettings}
      />

      <SettingsPanel
        showSettings={showSettings}
        apiKey={apiKey}
        setApiKey={setApiKey}
        shouldEncodeKey={shouldEncodeKey}
        setShouldEncodeKey={setShouldEncodeKey}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        saveOnlyFiltered={saveOnlyFiltered}
        setSaveOnlyFiltered={setSaveOnlyFiltered}
        retentionDays={retentionDays}
        setRetentionDays={setRetentionDays}
        dataCount={data.length}
        latestBidDate={data.length > 0 && data[0].bidNtceDt ? parseDbDate(data[0].bidNtceDt) : null}
        loading={loading}
        onUpdateLatest={handleUpdateLatest}
        onFullReset={handleFullReset}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorAlert message={error} debugUrl={debugUrl} />

        {/* Success/Status Message */}
        {statusMessage && !error && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">{statusMessage}</p>
          </div>
        )}

        {/* Debug Info Link */}
        {!error && debugUrl && hasSearched && (
          <div className="mb-4 text-right">
            <a
              href={debugUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              마지막 API 요청 URL 확인 (디버그용)
            </a>
          </div>
        )}

        <AnalyticsDashboard data={data} loading={loading} />

        <BidList
          data={data}
          loading={loading}
          error={error}
          hasSearched={hasSearched}
        />
      </main>
    </div>
  );
};

export default App;