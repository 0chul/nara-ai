package com.nara.hwpx.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class BidFormDiscoveryService {
    private static final String OPEN_DATA_URL = "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService/getDataSetOpnStdBidPblancInfo";
    private static final String G2B_ORIGIN = "https://www.g2b.go.kr";
    private static final String G2B_SESSION_URL = G2B_ORIGIN + "/co/coz/coza/util/getSession.do";
    private static final String G2B_BID_COUNT_URL = G2B_ORIGIN + "/pn/pnp/pnpe/commBidPbac/selectBidPbacNoCnt.do";
    private static final String G2B_PIC_INFO_URL = G2B_ORIGIN + "/pn/pnp/pnpe/commBidPbac/selectPicInfo.do";
    private static final String G2B_ITEM_ANNOUNCE_URL = G2B_ORIGIN + "/pn/pnp/pnpe/ItemBidPbac/selectItemAnncMngV.do";
    private static final String G2B_ATTACHMENT_LIST_URL = G2B_ORIGIN + "/fs/fsc/fscb/UntyAtchFile/selectUntyAtchFileList.do";
    private static final String G2B_SECURE_FILE_DOWNLOAD_URL = G2B_ORIGIN + "/fs/fsc/fsca/fileUpload.do";
    private static final String G2B_DEFAULT_KUPLOAD_ID = "wq_uuid_1859_kupload_holder_upload";
    private static final String G2B_ATTACHMENT_PATH_PREFIX = "/data/Attachfiles/";
    private static final char RAON_VERTICAL = '\u000B';
    private static final char RAON_FORM_FEED = '\u000C';
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(
            "hwpx", "hwp", "doc", "docx", "pdf", "zip", "xlsx", "xls", "ppt", "pptx"
    );
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s\"'<>]+", Pattern.CASE_INSENSITIVE);
    private static final Pattern G2B_UNTY_FILE_NO_PATTERN = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public BidFormDiscoveryService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(10))
                .cookieHandler(cookieManager)
                .build();
    }

    public List<BidFormCandidate> discoverFormFiles(
            String bidNtceNo,
            String bidNtceOrd,
            String bidNtceUrl,
            String apiKey,
            boolean shouldEncodeKey
    ) {
        LinkedHashMap<String, BidFormCandidate> merged = new LinkedHashMap<>();

        if (StringUtils.hasText(bidNtceUrl)) {
            for (String candidateUrl : expandBidPageCandidates(bidNtceUrl)) {
                addFromBidPage(merged, candidateUrl);
            }
        }

        if (!containsHwpx(merged)) {
            addFromG2bItemBidApi(merged, bidNtceNo, bidNtceOrd, bidNtceUrl);
        }

        if (!containsHwpx(merged) && StringUtils.hasText(apiKey) && StringUtils.hasText(bidNtceNo)) {
            addFromOpenData(merged, bidNtceNo, bidNtceOrd, apiKey, shouldEncodeKey);
        }

        return merged.values().stream()
                .sorted(Comparator
                        .comparing(BidFormCandidate::hwpx).reversed()
                        .thenComparing(BidFormCandidate::fileName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public RemoteFileDownload download(String fileUrl) throws IOException, InterruptedException {
        URI uri = toHttpUri(fileUrl);
        HttpResponse<byte[]> response = httpClient.send(buildRemoteGetRequest(uri), HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() >= 400) {
            throw new IOException("Remote file download failed: HTTP " + response.statusCode());
        }

        String contentType = response.headers().firstValue("Content-Type").orElse("application/octet-stream");
        if (!looksLikeHtml(contentType, response.body())) {
            String fileName = extractFileName(response.headers().firstValue("Content-Disposition"), fileUrl);
            return new RemoteFileDownload(response.body(), fileName, contentType);
        }

        if (isG2bAttachmentFile(uri)) {
            return downloadFromG2bSecureEndpoint(uri);
        }

        throw new IOException("나라장터 보안 URL 응답(HTML)로 파일을 직접 내려받을 수 없습니다. 보안 토큰 기반 다운로드가 필요합니다.");
    }

    private HttpRequest buildRemoteGetRequest(URI uri) {
        return HttpRequest.newBuilder(uri)
                .GET()
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "*/*")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Referer", "https://www.g2b.go.kr/")
                .build();
    }

    private RemoteFileDownload downloadFromG2bSecureEndpoint(URI fileUri) throws IOException, InterruptedException {
        String path = fileUri.getPath();
        if (!StringUtils.hasText(path) || !path.startsWith(G2B_ATTACHMENT_PATH_PREFIX)) {
            throw new IOException("Unsupported G2B attachment path");
        }

        String fallbackName = extractFileName(Optional.empty(), fileUri.toString());
        String plainPayload = buildG2bSecureDownloadPayload(path, fallbackName);
        String k00 = encodeRaonParam(plainPayload);
        String requestBody = "k00=" + k00 + "&X-CSRF-Token=";

        HttpRequest request = HttpRequest.newBuilder(URI.create(G2B_SECURE_FILE_DOWNLOAD_URL))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "*/*")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Origin", G2B_ORIGIN)
                .header("Referer", G2B_ORIGIN + "/")
                .build();

        HttpResponse<byte[]> secureResponse = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (secureResponse.statusCode() >= 400) {
            throw new IOException("G2B secure download failed: HTTP " + secureResponse.statusCode());
        }

        String contentType = secureResponse.headers().firstValue("Content-Type").orElse("application/octet-stream");
        if (looksLikeHtml(contentType, secureResponse.body())) {
            throw new IOException("나라장터 보안 URL 응답(HTML)로 파일을 직접 내려받을 수 없습니다. 보안 토큰 기반 다운로드가 필요합니다.");
        }

        String fileName = extractFileName(secureResponse.headers().firstValue("Content-Disposition"), fallbackName);
        return new RemoteFileDownload(secureResponse.body(), fileName, contentType);
    }

    private boolean isG2bAttachmentFile(URI uri) {
        if (uri == null) {
            return false;
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        String path = uri.getPath() == null ? "" : uri.getPath();
        return host.endsWith("g2b.go.kr") && path.startsWith(G2B_ATTACHMENT_PATH_PREFIX);
    }

    private String buildG2bSecureDownloadPayload(String filePath, String fileName) {
        StringBuilder builder = new StringBuilder();
        appendRaonPair(builder, "kc", "c11");
        appendRaonPair(builder, "k01", "1");
        appendRaonPair(builder, "k05", "0");
        appendRaonPair(builder, "k26", filePath);
        if (StringUtils.hasText(fileName)) {
            appendRaonPair(builder, "k31", fileName);
        }
        return builder.toString();
    }

    private void appendRaonPair(StringBuilder builder, String key, String value) {
        if (builder.length() > 0) {
            builder.append(RAON_VERTICAL);
        }
        builder.append(key).append(RAON_FORM_FEED).append(value == null ? "" : value);
    }

    private String encodeRaonParam(String plain) {
        String encoded = Base64.getEncoder().encodeToString(plain.getBytes(StandardCharsets.UTF_8));
        if (encoded.length() >= 10) {
            encoded = insertAt(encoded, 8, 'r');
            encoded = insertAt(encoded, 6, 'a');
            encoded = insertAt(encoded, 9, 'o');
            encoded = insertAt(encoded, 7, 'n');
            encoded = insertAt(encoded, 8, 'w');
            encoded = insertAt(encoded, 6, 'i');
            encoded = insertAt(encoded, 9, 'z');
        } else {
            encoded = insertAt(encoded, Math.max(0, encoded.length() - 1), '$');
            encoded = insertAt(encoded, 0, '$');
        }
        return encoded.replace("+", "%2B");
    }

    private String insertAt(String source, int index, char ch) {
        int safeIndex = Math.max(0, Math.min(index, source.length()));
        return source.substring(0, safeIndex) + ch + source.substring(safeIndex);
    }

    private void addFromBidPage(Map<String, BidFormCandidate> merged, String bidNtceUrl) {
        try {
            URI uri = toHttpUri(bidNtceUrl);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                return;
            }

            String html = response.body();
            Document document = Jsoup.parse(html, bidNtceUrl);

            for (Element anchor : document.select("a[href]")) {
                String href = anchor.attr("abs:href");
                if (!StringUtils.hasText(href)) {
                    href = anchor.attr("href");
                }
                String label = anchor.text();
                if (!StringUtils.hasText(label)) {
                    label = anchor.attr("title");
                }
                addCandidate(merged, href, label, "bid-page");
            }

            Matcher matcher = URL_PATTERN.matcher(html);
            while (matcher.find()) {
                addCandidate(merged, matcher.group(), null, "bid-page");
            }
        } catch (Exception ignored) {
            // Ignore and continue with OpenAPI fallback.
        }
    }

    private void addFromOpenData(
            Map<String, BidFormCandidate> merged,
            String bidNtceNo,
            String bidNtceOrd,
            String apiKey,
            boolean shouldEncodeKey
    ) {
        for (String idParamName : List.of("bidNtceNo", "bidPbancNo")) {
            try {
                String normalizedKey = apiKey.trim();
                String serviceKey = shouldEncodeKey
                        ? URLEncoder.encode(normalizedKey, StandardCharsets.UTF_8)
                        : normalizedKey;

                List<String> queryParts = new ArrayList<>();
                queryParts.add("serviceKey=" + serviceKey);
                queryParts.add("type=json");
                queryParts.add("pageNo=1");
                queryParts.add("numOfRows=10");
                queryParts.add(idParamName + "=" + URLEncoder.encode(bidNtceNo, StandardCharsets.UTF_8));
                if (StringUtils.hasText(bidNtceOrd)) {
                    queryParts.add("bidNtceOrd=" + URLEncoder.encode(bidNtceOrd, StandardCharsets.UTF_8));
                    queryParts.add("bidPbancOrd=" + URLEncoder.encode(bidNtceOrd, StandardCharsets.UTF_8));
                }

                String requestUrl = OPEN_DATA_URL + "?" + String.join("&", queryParts);
                HttpRequest request = HttpRequest.newBuilder(URI.create(requestUrl))
                        .GET()
                        .timeout(REQUEST_TIMEOUT)
                        .header("User-Agent", "Nara-AI/1.0")
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() >= 400) {
                    continue;
                }

                String body = response.body();
                if (body.trim().startsWith("<")) {
                    Matcher matcher = URL_PATTERN.matcher(body);
                    while (matcher.find()) {
                        addCandidate(merged, matcher.group(), null, "open-data");
                    }
                    continue;
                }

                JsonNode root = objectMapper.readTree(body);
                addUrlsFromJsonNode(merged, root, null);
            } catch (Exception ignored) {
                // Continue with alternate param names.
            }
        }
    }

    private void addFromG2bItemBidApi(
            Map<String, BidFormCandidate> merged,
            String bidNtceNo,
            String bidNtceOrd,
            String bidNtceUrl
    ) {
        try {
            String bidPbancNo = resolveBidPbancNo(bidNtceNo, bidNtceUrl);
            if (!StringUtils.hasText(bidPbancNo)) {
                return;
            }
            for (String bidPbancOrd : buildBidPbancOrdCandidates(bidNtceOrd, bidNtceUrl)) {
                String referer = buildBidReferer(bidPbancNo, bidPbancOrd);

                initializeG2bSession(referer);
                warmUpBidContext(bidPbancNo, bidPbancOrd, referer);

                ObjectNode requestPayload = buildItemAnnounceRequestPayload(bidPbancNo, bidPbancOrd);
                JsonNode itemResponse = postJson(G2B_ITEM_ANNOUNCE_URL, requestPayload, referer);
                if (itemResponse == null || itemResponse.path("ErrorCode").asInt(-1) != 0) {
                    continue;
                }

                String untyAtchFileNo = itemResponse.path("dmItemMap").path("itemPbancUntyAtchFileNo").asText("");
                if (!StringUtils.hasText(untyAtchFileNo) || !G2B_UNTY_FILE_NO_PATTERN.matcher(untyAtchFileNo).matches()) {
                    continue;
                }

                String prcmBsneSeCd = itemResponse.path("dmItemMap").path("prcmBsneSeCd").asText("");
                List<String> bsneClsfCandidates = guessBsneClsfCandidates(prcmBsneSeCd);

                for (String bsneClsfCd : bsneClsfCandidates) {
                    JsonNode attachmentResponse = postJson(
                            G2B_ATTACHMENT_LIST_URL,
                            buildAttachmentListPayload(untyAtchFileNo, bsneClsfCd),
                            referer
                    );
                    if (attachmentResponse == null || attachmentResponse.path("ErrorCode").asInt(-1) != 0) {
                        continue;
                    }

                    JsonNode attachmentList = attachmentResponse.path("dlUntyAtchFileL");
                    if (!attachmentList.isArray() || attachmentList.isEmpty()) {
                        continue;
                    }

                    for (JsonNode item : attachmentList) {
                        String atchFilePath = item.path("atchFilePathNm").asText("");
                        String originalName = decodeHtml(item.path("orgnlAtchFileNm").asText(""));
                        if (!StringUtils.hasText(atchFilePath)) {
                            continue;
                        }
                        String normalizedPath = atchFilePath.startsWith("/") ? atchFilePath : "/" + atchFilePath;
                        String absoluteUrl = G2B_ORIGIN + normalizedPath;
                        addCandidate(merged, absoluteUrl, originalName, "g2b-api");
                    }

                    if (containsHwpx(merged)) {
                        return;
                    }
                }
            }
        } catch (Exception ignored) {
            // Ignore and continue with existing fallbacks.
        }
    }

    private List<String> expandBidPageCandidates(String bidNtceUrl) {
        List<String> candidates = new ArrayList<>();
        candidates.add(bidNtceUrl);

        try {
            URI uri = toHttpUri(bidNtceUrl);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            String path = uri.getPath() == null ? "" : uri.getPath();
            String query = uri.getQuery() == null ? "" : uri.getQuery();

            if (!host.endsWith("g2b.go.kr")) {
                return candidates;
            }
            if (!path.contains("/link/PNPE027_01/single/")) {
                return candidates;
            }

            if (!query.contains("pbancType=")) {
                candidates.add(replaceQueryParam(uri, "pbancType", "0"));
                candidates.add(replaceQueryParam(uri, "pbancType", "1"));
            }
        } catch (Exception ignored) {
            // Keep original URL only.
        }

        return candidates.stream().distinct().toList();
    }

    private String replaceQueryParam(URI uri, String key, String value) throws URISyntaxException {
        String query = uri.getRawQuery();
        List<String> params = new ArrayList<>();
        boolean replaced = false;

        if (StringUtils.hasText(query)) {
            for (String part : query.split("&")) {
                if (part.startsWith(key + "=")) {
                    params.add(key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8));
                    replaced = true;
                } else if (StringUtils.hasText(part)) {
                    params.add(part);
                }
            }
        }

        if (!replaced) {
            params.add(key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8));
        }

        URI rebuilt = new URI(
                uri.getScheme(),
                uri.getAuthority(),
                uri.getPath(),
                String.join("&", params),
                uri.getFragment()
        );
        return rebuilt.toString();
    }

    private String resolveBidPbancNo(String bidNtceNo, String bidNtceUrl) {
        if (StringUtils.hasText(bidNtceUrl)) {
            String byQuery = extractQueryParam(bidNtceUrl, "bidPbancNo");
            if (StringUtils.hasText(byQuery)) {
                return byQuery;
            }
            byQuery = extractQueryParam(bidNtceUrl, "bidNtceNo");
            if (StringUtils.hasText(byQuery)) {
                return byQuery;
            }
        }
        return StringUtils.hasText(bidNtceNo) ? bidNtceNo.trim() : "";
    }

    private String resolveBidPbancOrd(String bidNtceOrd, String bidNtceUrl) {
        if (StringUtils.hasText(bidNtceUrl)) {
            String byQuery = extractQueryParam(bidNtceUrl, "bidPbancOrd");
            if (StringUtils.hasText(byQuery)) {
                return normalizeBidPbancOrd(byQuery);
            }
            byQuery = extractQueryParam(bidNtceUrl, "bidNtceOrd");
            if (StringUtils.hasText(byQuery)) {
                return normalizeBidPbancOrd(byQuery);
            }
        }
        if (StringUtils.hasText(bidNtceOrd)) {
            return normalizeBidPbancOrd(bidNtceOrd);
        }
        return "000";
    }

    private List<String> buildBidPbancOrdCandidates(String bidNtceOrd, String bidNtceUrl) {
        List<String> candidates = new ArrayList<>();
        String primary = resolveBidPbancOrd(bidNtceOrd, bidNtceUrl);
        if (StringUtils.hasText(primary)) {
            candidates.add(primary);
        }

        if (StringUtils.hasText(bidNtceOrd)) {
            String normalizedInput = normalizeBidPbancOrd(bidNtceOrd);
            if (StringUtils.hasText(normalizedInput) && !candidates.contains(normalizedInput)) {
                candidates.add(normalizedInput);
            }
        }

        for (String fallback : List.of("000", "001")) {
            if (!candidates.contains(fallback)) {
                candidates.add(fallback);
            }
        }
        return candidates;
    }

    private String extractQueryParam(String rawUrl, String key) {
        try {
            URI uri = toHttpUri(rawUrl);
            String query = uri.getRawQuery();
            if (!StringUtils.hasText(query)) {
                return "";
            }
            for (String pair : query.split("&")) {
                int idx = pair.indexOf('=');
                String name = idx >= 0 ? pair.substring(0, idx) : pair;
                if (!key.equals(name)) {
                    continue;
                }
                String value = idx >= 0 ? pair.substring(idx + 1) : "";
                return URLDecoder.decode(value, StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private String buildBidReferer(String bidPbancNo, String bidPbancOrd) {
        return G2B_ORIGIN + "/link/PNPE027_01/single/?bidPbancNo="
                + URLEncoder.encode(bidPbancNo, StandardCharsets.UTF_8)
                + "&bidPbancOrd="
                + URLEncoder.encode(bidPbancOrd, StandardCharsets.UTF_8);
    }

    private void initializeG2bSession(String referer) throws IOException, InterruptedException {
        HttpRequest pageRequest = HttpRequest.newBuilder(URI.create(referer))
                .GET()
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .build();
        httpClient.send(pageRequest, HttpResponse.BodyHandlers.discarding());

        HttpRequest sessionRequest = HttpRequest.newBuilder(URI.create(G2B_SESSION_URL))
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "application/json, text/plain, */*")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Content-Type", "application/json;charset=UTF-8")
                .header("Referer", referer)
                .build();
        httpClient.send(sessionRequest, HttpResponse.BodyHandlers.discarding());
    }

    private void warmUpBidContext(String bidPbancNo, String bidPbancOrd, String referer) {
        try {
            ObjectNode bidCountPayload = objectMapper.createObjectNode();
            ObjectNode dmParam = bidCountPayload.putObject("dmParam");
            dmParam.put("bidPbancNo", bidPbancNo);
            dmParam.put("bidPbancOrd", bidPbancOrd);
            postJson(G2B_BID_COUNT_URL, bidCountPayload, referer);
        } catch (Exception ignored) {
            // Best-effort warm-up only.
        }

        try {
            ObjectNode picInfoPayload = objectMapper.createObjectNode();
            ObjectNode dlParamM = picInfoPayload.putObject("dlParamM");
            dlParamM.put("bidPbancNo", bidPbancNo);
            dlParamM.put("bidPbancOrd", bidPbancOrd);
            postJson(G2B_PIC_INFO_URL, picInfoPayload, referer);
        } catch (Exception ignored) {
            // Best-effort warm-up only.
        }
    }

    private ObjectNode buildItemAnnounceRequestPayload(String bidPbancNo, String bidPbancOrd) {
        ObjectNode payload = objectMapper.createObjectNode();
        ObjectNode dmItemMap = payload.putObject("dmItemMap");
        dmItemMap.put("bidPbancNo", bidPbancNo);
        dmItemMap.put("bidPbancOrd", bidPbancOrd);
        dmItemMap.put("bidPbancText", bidPbancNo + " - " + bidPbancOrd);
        return payload;
    }
    private ObjectNode buildAttachmentListPayload(String untyAtchFileNo, String bsneClsfCd) {
        ObjectNode payload = objectMapper.createObjectNode();
        ObjectNode map = payload.putObject("dlUntyAtchFileM");
        map.put("untyAtchFileNo", untyAtchFileNo);
        map.put("atchFileSqnos", "");
        map.put("bsnePath", "PNPE");
        map.put("bsneClsfCd", bsneClsfCd);
        map.put("tblNm", "PBANC_BID_PBANC");
        map.put("colNm", "ITEM_PBANC_UNTY_ATCH_FILE_NO");
        map.put("webPathUse", "N");
        map.put("isScanEnabled", false);
        map.put("imgUrl", "");
        map.put("atchFileKndCds", "");
        map.put("ignoreAtchFileKndCds", "");
        map.put("kbrdrIds", "");
        map.put("kuploadId", G2B_DEFAULT_KUPLOAD_ID);
        map.put("viewMode", "view");
        return payload;
    }
    private List<String> guessBsneClsfCandidates(String prcmBsneSeCd) {
        List<String> candidates = new ArrayList<>();
        if ("01".equals(prcmBsneSeCd)) {
            candidates.add("\uBB3C130026");
        } else if ("02".equals(prcmBsneSeCd)) {
            candidates.add("\uACF5130026");
        } else if ("03".equals(prcmBsneSeCd)) {
            candidates.add("\uC5C5130026");
        }
        for (String fallback : List.of("\uC5C5130026", "\uBB3C130026", "\uACF5130026")) {
            if (!candidates.contains(fallback)) {
                candidates.add(fallback);
            }
        }
        return candidates;
    }
    private JsonNode postJson(String url, JsonNode payload, String referer) throws IOException, InterruptedException {
        String body = objectMapper.writeValueAsString(payload);
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(REQUEST_TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "application/json, text/plain, */*")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Content-Type", "application/json;charset=UTF-8")
                .header("Origin", G2B_ORIGIN)
                .header("Referer", referer)
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            return null;
        }
        try {
            return objectMapper.readTree(response.body());
        } catch (Exception ignored) {
            return null;
        }
    }

    private void addUrlsFromJsonNode(Map<String, BidFormCandidate> merged, JsonNode node, String keyHint) {
        if (node == null || node.isNull()) {
            return;
        }

        if (node.isTextual()) {
            String text = node.asText();
            addCandidate(merged, text, keyHint, "open-data");

            Matcher matcher = URL_PATTERN.matcher(text);
            while (matcher.find()) {
                addCandidate(merged, matcher.group(), keyHint, "open-data");
            }
            return;
        }

        if (node.isArray()) {
            for (JsonNode item : node) {
                addUrlsFromJsonNode(merged, item, keyHint);
            }
            return;
        }

        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> addUrlsFromJsonNode(merged, entry.getValue(), entry.getKey()));
        }
    }

    private void addCandidate(Map<String, BidFormCandidate> merged, String rawUrl, String label, String source) {
        if (!StringUtils.hasText(rawUrl)) {
            return;
        }

        String fixedUrl = normalizeUrl(rawUrl);
        URI uri;
        try {
            uri = toHttpUri(fixedUrl);
        } catch (Exception e) {
            return;
        }

        String extension = extractExtension(uri.toString());
        if (extension == null) {
            extension = extractExtensionFromFileName(label);
        }
        if (extension == null || !SUPPORTED_EXTENSIONS.contains(extension)) {
            return;
        }

        String fileName = extractFileName(Optional.empty(), uri.toString());
        if (StringUtils.hasText(label)) {
            String labelTrimmed = label.trim();
            if (labelTrimmed.toLowerCase(Locale.ROOT).endsWith("." + extension)) {
                fileName = labelTrimmed;
            }
        }

        String dedupeKey = uri.toString().toLowerCase(Locale.ROOT);
        merged.putIfAbsent(dedupeKey, new BidFormCandidate(
                fileName,
                uri.toString(),
                extension,
                "hwpx".equals(extension),
                source
        ));
    }

    private String extractExtensionFromFileName(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return null;
        }

        String normalized = fileName.trim();
        int fragmentIndex = normalized.indexOf('#');
        if (fragmentIndex >= 0) {
            normalized = normalized.substring(0, fragmentIndex);
        }
        int queryIndex = normalized.indexOf('?');
        if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
        }

        int dotIndex = normalized.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == normalized.length() - 1) {
            return null;
        }

        String extension = normalized.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (extension.length() > 5) {
            return null;
        }
        return extension;
    }

    private String normalizeUrl(String source) {
        return source
                .replace("^", "&")
                .replace("&amp;", "&")
                .trim();
    }

    private URI toHttpUri(String url) {
        URI uri = URI.create(normalizeUrl(url));
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("Only http/https URLs are supported");
        }
        return uri;
    }

    private String extractExtension(String url) {
        String path = URI.create(url).getPath();
        if (!StringUtils.hasText(path)) {
            return null;
        }

        int dotIndex = path.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == path.length() - 1) {
            return null;
        }

        String extension = path.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (extension.length() > 5) {
            return null;
        }
        return extension;
    }

    private String extractFileName(Optional<String> contentDisposition, String fallbackUrl) {
        if (contentDisposition.isPresent()) {
            String disposition = contentDisposition.get();
            Matcher utf8Matcher = Pattern.compile("filename\\*=UTF-8''([^;]+)", Pattern.CASE_INSENSITIVE).matcher(disposition);
            if (utf8Matcher.find()) {
                return urlDecode(utf8Matcher.group(1));
            }

            Matcher plainMatcher = Pattern.compile("filename=\"?([^\";]+)\"?", Pattern.CASE_INSENSITIVE).matcher(disposition);
            if (plainMatcher.find()) {
                return plainMatcher.group(1).trim();
            }
        }

        try {
            URI uri = URI.create(fallbackUrl);
            String path = uri.getPath();
            if (StringUtils.hasText(path)) {
                int slashIndex = path.lastIndexOf('/');
                String name = slashIndex >= 0 ? path.substring(slashIndex + 1) : path;
                if (StringUtils.hasText(name)) {
                    return urlDecode(name);
                }
            }
        } catch (Exception ignored) {
        }

        return "download.bin";
    }

    private String urlDecode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private String decodeHtml(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        return Jsoup.parse(value).text();
    }

    private boolean looksLikeHtml(String contentType, byte[] body) {
        String normalized = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (normalized.contains("text/html")) {
            return true;
        }
        if (body == null || body.length == 0) {
            return false;
        }
        int inspectLength = Math.min(body.length, 256);
        String prefix = new String(body, 0, inspectLength, StandardCharsets.UTF_8).trim().toLowerCase(Locale.ROOT);
        return prefix.startsWith("<!doctype html") || prefix.startsWith("<html");
    }

    private String normalizeBidPbancOrd(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String trimmed = value.trim();
        if (!trimmed.chars().allMatch(Character::isDigit)) {
            return trimmed;
        }

        if (trimmed.length() >= 3) {
            return trimmed;
        }

        return String.format("%03d", Integer.parseInt(trimmed));
    }

    private boolean containsHwpx(Map<String, BidFormCandidate> merged) {
        return merged.values().stream().anyMatch(BidFormCandidate::hwpx);
    }
}
