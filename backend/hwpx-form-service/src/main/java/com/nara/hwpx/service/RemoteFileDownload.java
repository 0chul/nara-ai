package com.nara.hwpx.service;

public record RemoteFileDownload(
        byte[] data,
        String fileName,
        String contentType
) {
}
