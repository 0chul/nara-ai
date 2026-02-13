package com.nara.hwpx.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nara.hwpx.service.BidFormCandidate;
import com.nara.hwpx.service.BidFormDiscoveryService;
import com.nara.hwpx.service.HwpxTemplateFillService;
import com.nara.hwpx.service.RemoteFileDownload;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hwpx")
public class HwpxFillController {
    private final HwpxTemplateFillService fillService;
    private final BidFormDiscoveryService bidFormDiscoveryService;
    private final ObjectMapper objectMapper;

    public HwpxFillController(
            HwpxTemplateFillService fillService,
            BidFormDiscoveryService bidFormDiscoveryService,
            ObjectMapper objectMapper
    ) {
        this.fillService = fillService;
        this.bidFormDiscoveryService = bidFormDiscoveryService;
        this.objectMapper = objectMapper;
    }

    @PostMapping(value = "/fill", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> fillTemplate(
            @RequestParam("templateFile") MultipartFile templateFile,
            @RequestParam("fieldsJson") String fieldsJson,
            @RequestParam(value = "outputFileName", required = false) String outputFileName
    ) {
        if (templateFile.isEmpty()) {
            return ResponseEntity.badRequest().body("templateFile is required".getBytes());
        }

        String originalFileName = templateFile.getOriginalFilename();
        if (originalFileName == null || !originalFileName.toLowerCase().endsWith(".hwpx")) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body("Only .hwpx templates are supported in this endpoint".getBytes());
        }

        Path tempTemplatePath = null;
        try {
            Map<String, String> fields = objectMapper.readValue(fieldsJson, new TypeReference<Map<String, String>>() {
            });
            tempTemplatePath = Files.createTempFile("nara-template-", ".hwpx");

            templateFile.transferTo(tempTemplatePath);
            HwpxTemplateFillService.FillResult result = fillService.fillTemplate(tempTemplatePath.toFile(), fields);

            String safeOutputName = makeOutputFileName(outputFileName, originalFileName);
            int filledTotal = result.stats() == null ? 0 : result.stats().total;
            if (filledTotal <= 0) {
                String message = "HWPX fill skipped: no writable placeholders were detected in this template. "
                        + "For POC, try a real submission form template (서식/양식) or add {{token}} placeholders.";
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.TEXT_PLAIN)
                        .header("X-HWPX-Fill-Total", "0")
                        .body(message.getBytes(StandardCharsets.UTF_8));
            }
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeOutputName + "\"")
                    .header("X-HWPX-Fill-Total", String.valueOf(filledTotal))
                    .header("X-HWPX-Fill-Token", String.valueOf(result.stats().tokenReplacements))
                    .header("X-HWPX-Fill-Field", String.valueOf(result.stats().namedFieldsFilled))
                    .header("X-HWPX-Fill-Table", String.valueOf(result.stats().tableCellsFilled))
                    .header("X-HWPX-Fill-Inline", String.valueOf(result.stats().inlineLabelCellsFilled))
                    .body(result.bytes());
        } catch (Exception ex) {
            String message = "HWPX fill failed: " + sanitizeError(ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(message.getBytes(StandardCharsets.UTF_8));
        } finally {
            if (tempTemplatePath != null) {
                try {
                    Files.deleteIfExists(tempTemplatePath);
                } catch (Exception ignore) {
                    // best-effort cleanup
                }
            }
        }
    }

    @GetMapping("/forms/discover")
    public ResponseEntity<?> discoverForms(
            @RequestParam(value = "bidNtceNo", required = false) String bidNtceNo,
            @RequestParam(value = "bidNtceOrd", required = false) String bidNtceOrd,
            @RequestParam(value = "bidNtceUrl", required = false) String bidNtceUrl,
            @RequestParam(value = "apiKey", required = false) String apiKey,
            @RequestParam(value = "shouldEncodeKey", required = false, defaultValue = "true") boolean shouldEncodeKey
    ) {
        if (!StringUtils.hasText(bidNtceNo)) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body("bidNtceNo is required");
        }

        try {
            List<BidFormCandidate> forms = bidFormDiscoveryService.discoverFormFiles(
                    bidNtceNo,
                    bidNtceOrd,
                    bidNtceUrl,
                    apiKey,
                    shouldEncodeKey
            );
            return ResponseEntity.ok(forms);
        } catch (Exception ex) {
            String message = "Form discovery failed: " + sanitizeError(ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(message.getBytes(StandardCharsets.UTF_8));
        }
    }

    @GetMapping("/forms/download")
    public ResponseEntity<byte[]> downloadForm(@RequestParam("fileUrl") String fileUrl) {
        try {
            RemoteFileDownload downloaded = bidFormDiscoveryService.download(fileUrl);
            String safeName = downloaded.fileName().replaceAll("[\\\\/:*?\"<>|]", "_");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(downloaded.contentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeName + "\"")
                    .body(downloaded.data());
        } catch (Exception ex) {
            String message = "Remote form download failed: " + sanitizeError(ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(message.getBytes(StandardCharsets.UTF_8));
        }
    }

    private String makeOutputFileName(String outputFileName, String sourceFileName) {
        String baseName;
        if (StringUtils.hasText(outputFileName)) {
            baseName = outputFileName.trim();
        } else {
            int extPos = sourceFileName.toLowerCase().lastIndexOf(".hwpx");
            baseName = extPos > 0 ? sourceFileName.substring(0, extPos) : sourceFileName;
            baseName = baseName + "-filled";
        }

        if (!baseName.toLowerCase().endsWith(".hwpx")) {
            baseName += ".hwpx";
        }

        return baseName.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private String sanitizeError(String source) {
        if (!StringUtils.hasText(source)) {
            return "unknown error";
        }

        String trimmed = source.trim();
        if (trimmed.length() > 500) {
            return trimmed.substring(0, 500) + "...";
        }
        return trimmed;
    }
}
