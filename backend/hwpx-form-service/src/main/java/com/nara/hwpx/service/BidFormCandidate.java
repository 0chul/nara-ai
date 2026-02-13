package com.nara.hwpx.service;

public record BidFormCandidate(
        String fileName,
        String fileUrl,
        String extension,
        boolean hwpx,
        String source
) {
}
