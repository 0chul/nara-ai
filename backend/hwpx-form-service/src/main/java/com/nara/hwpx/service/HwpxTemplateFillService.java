package com.nara.hwpx.service;

import kr.dogfoot.hwpxlib.object.HWPXFile;
import kr.dogfoot.hwpxlib.object.common.ObjectType;
import kr.dogfoot.hwpxlib.object.content.section_xml.SubList;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.Para;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.Run;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.RunItem;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.T;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.t.NormalText;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.object.Table;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.object.table.Tc;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.object.table.Tr;
import kr.dogfoot.hwpxlib.reader.HWPXReader;
import kr.dogfoot.hwpxlib.tool.finder.FieldFinder;
import kr.dogfoot.hwpxlib.tool.finder.ObjectFinder;
import kr.dogfoot.hwpxlib.writer.HWPXWriter;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class HwpxTemplateFillService {
    public byte[] fillTemplate(File templateFile, Map<String, String> fieldValues) throws Exception {
        HWPXFile hwpxFile = HWPXReader.fromFile(templateFile);

        replaceTokenPlaceholders(hwpxFile, fieldValues);
        fillNamedFields(hwpxFile, fieldValues);
        fillTableCells(hwpxFile, fieldValues);

        return HWPXWriter.toBytes(hwpxFile);
    }

    private void replaceTokenPlaceholders(HWPXFile hwpxFile, Map<String, String> fieldValues) throws Exception {
        ObjectFinder.Result[] textResults = ObjectFinder.find(
                hwpxFile,
                (thisObject, parentsPath) -> thisObject._objectType() == ObjectType.hp_t,
                false
        );

        for (ObjectFinder.Result textResult : textResults) {
            T textObject = (T) textResult.thisObject();
            applyMapToTextObject(textObject, fieldValues);
        }
    }

    private void applyMapToTextObject(T textObject, Map<String, String> fieldValues) {
        if (textObject.isOnlyText()) {
            String replaced = replaceAllTokens(textObject.onlyText(), fieldValues);
            textObject.clear();
            if (!replaced.isEmpty()) {
                textObject.addText(replaced);
            }
            return;
        }

        for (int index = 0; index < textObject.countOfItems(); index++) {
            if (textObject.getItem(index)._objectType() != ObjectType.NormalText) {
                continue;
            }

            NormalText normalText = (NormalText) textObject.getItem(index);
            normalText.text(replaceAllTokens(normalText.text(), fieldValues));
        }
    }

    private String replaceAllTokens(String source, Map<String, String> fieldValues) {
        if (source == null || source.isEmpty()) {
            return "";
        }

        String replaced = source;
        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            String token = "{{" + entry.getKey() + "}}";
            String value = entry.getValue() == null ? "" : entry.getValue();
            replaced = replaced.replace(token, value);
        }
        return replaced;
    }

    private void fillNamedFields(HWPXFile hwpxFile, Map<String, String> fieldValues) throws Exception {
        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            FieldFinder.Result[] fieldResults = FieldFinder.find(hwpxFile, entry.getKey(), false);
            for (FieldFinder.Result result : fieldResults) {
                injectFieldValue(result, entry.getValue() == null ? "" : entry.getValue());
            }
        }
    }

    private void injectFieldValue(FieldFinder.Result fieldResult, String value) {
        Para beginPara = fieldResult.beginPara();
        Run beginRun = fieldResult.beginRun();

        if (beginPara == null || beginRun == null) {
            return;
        }

        int beginRunIndex = beginPara.getRunIndex(beginRun);
        if (beginRunIndex < 0) {
            return;
        }

        if (fieldResult.endPara() == beginPara && fieldResult.endRun() != null) {
            int endRunIndex = beginPara.getRunIndex(fieldResult.endRun());
            if (endRunIndex > beginRunIndex + 1) {
                for (int index = endRunIndex - 1; index > beginRunIndex; index--) {
                    beginPara.removeRun(index);
                }
            }
        }

        Run insertedRun = new Run();
        if (beginRun.charPrIDRef() != null) {
            insertedRun.charPrIDRef(beginRun.charPrIDRef());
        }

        T insertedText = insertedRun.addNewT();
        insertedText.addText(value);

        beginPara.insertRun(insertedRun, beginRunIndex + 1);
        beginPara.removeLineSegArray();
    }

    private void fillTableCells(HWPXFile hwpxFile, Map<String, String> fieldValues) throws Exception {
        Map<String, String> orderedFields = orderForTableFill(fieldValues);
        Set<String> knownLabels = buildKnownLabelSet(orderedFields);

        ObjectFinder.Result[] tableResults = ObjectFinder.find(
                hwpxFile,
                (thisObject, parentsPath) -> thisObject instanceof Table,
                false
        );

        for (ObjectFinder.Result result : tableResults) {
            Table table = (Table) result.thisObject();
            fillSingleTable(table, orderedFields, knownLabels);
        }
    }

    private Map<String, String> orderForTableFill(Map<String, String> fieldValues) {
        List<String> priorityKeys = Arrays.asList(
                "bidTitle",
                "bidNoticeNo",
                "issuingAgency",
                "objectives",
                "schedule",
                "location",
                "programName"
        );

        LinkedHashMap<String, String> ordered = new LinkedHashMap<>();
        for (String key : priorityKeys) {
            if (fieldValues.containsKey(key)) {
                ordered.put(key, fieldValues.get(key));
            }
        }
        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            if (!ordered.containsKey(entry.getKey())) {
                ordered.put(entry.getKey(), entry.getValue());
            }
        }
        return ordered;
    }

    private void fillSingleTable(Table table, Map<String, String> fieldValues, Set<String> knownLabels) {
        List<List<CellRef>> cells = snapshotTableCells(table);
        if (cells.isEmpty()) {
            return;
        }

        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue() == null ? "" : entry.getValue();
            if (value.isEmpty()) {
                continue;
            }

            List<String> labelVariants = buildLabelVariants(key);
            CellPos labelPos = findBestLabelCell(cells, labelVariants);
            if (labelPos == null) {
                continue;
            }

            CellPos targetPos = findTargetCell(cells, labelPos, knownLabels);
            if (targetPos == null) {
                continue;
            }

            CellRef target = cells.get(targetPos.row).get(targetPos.col);
            if (target == null || target.tc == null) {
                continue;
            }

            if (!shouldWriteIntoCell(target.originalText)) {
                continue;
            }

            writeCellText(target.tc, value);
            // Refresh cached text so later keys don't overwrite the same cell.
            target.originalText = value;
            target.normalizedText = normalizeForMatch(value);
        }
    }

    private List<List<CellRef>> snapshotTableCells(Table table) {
        List<List<CellRef>> rows = new ArrayList<>();
        for (int r = 0; r < table.countOfTr(); r++) {
            Tr tr = table.getTr(r);
            List<CellRef> row = new ArrayList<>();
            for (int c = 0; c < tr.countOfTc(); c++) {
                Tc tc = tr.getTc(c);
                String text = readCellText(tc);
                row.add(new CellRef(tc, text, normalizeForMatch(text)));
            }
            rows.add(row);
        }
        return rows;
    }

    private CellPos findBestLabelCell(List<List<CellRef>> cells, List<String> labelVariants) {
        CellPos bestPos = null;
        int bestScore = 0;

        for (int r = 0; r < cells.size(); r++) {
            List<CellRef> row = cells.get(r);
            for (int c = 0; c < row.size(); c++) {
                CellRef cell = row.get(c);
                if (cell == null) {
                    continue;
                }

                for (String variant : labelVariants) {
                    String label = normalizeForMatch(variant);
                    if (label.isEmpty()) {
                        continue;
                    }

                    int score = labelMatchScore(cell.normalizedText, label, cell.originalText);
                    if (score > bestScore) {
                        bestScore = score;
                        bestPos = new CellPos(r, c);
                    }
                }
            }
        }

        // Require a reasonably confident match.
        return bestScore >= 2 ? bestPos : null;
    }

    private int labelMatchScore(String cellNorm, String labelNorm, String cellOriginal) {
        if (cellNorm == null) {
            cellNorm = "";
        }

        if (cellNorm.equals(labelNorm)) {
            return 3;
        }

        if (cellNorm.startsWith(labelNorm) || cellNorm.endsWith(labelNorm)) {
            return 2;
        }

        // Match patterns like "label:" or "label( )" in the same cell.
        if (cellNorm.contains(labelNorm)) {
            if (cellOriginal != null && (cellOriginal.contains(":") || cellOriginal.contains("："))) {
                return 2;
            }
            return 1;
        }

        return 0;
    }

    private CellPos findTargetCell(List<List<CellRef>> cells, CellPos labelPos, Set<String> knownLabels) {
        if (labelPos.row < 0 || labelPos.row >= cells.size()) {
            return null;
        }

        List<CellRef> row = cells.get(labelPos.row);
        if (labelPos.col < 0 || labelPos.col >= row.size()) {
            return null;
        }

        // Prefer a cell to the right on the same row.
        for (int c = labelPos.col + 1; c < row.size(); c++) {
            CellRef candidate = row.get(c);
            if (candidate == null || candidate.tc == null) {
                continue;
            }
            if (knownLabels.contains(candidate.normalizedText)) {
                continue;
            }
            if (shouldWriteIntoCell(candidate.originalText)) {
                return new CellPos(labelPos.row, c);
            }
        }

        // Fall back to a cell below in the same column.
        if (labelPos.row + 1 < cells.size()) {
            List<CellRef> nextRow = cells.get(labelPos.row + 1);
            if (labelPos.col < nextRow.size()) {
                CellRef candidate = nextRow.get(labelPos.col);
                if (candidate != null && candidate.tc != null
                        && !knownLabels.contains(candidate.normalizedText)
                        && shouldWriteIntoCell(candidate.originalText)) {
                    return new CellPos(labelPos.row + 1, labelPos.col);
                }
            }
        }

        return null;
    }

    private boolean shouldWriteIntoCell(String existingText) {
        if (existingText == null) {
            return true;
        }

        String trimmed = existingText.trim();
        if (trimmed.isEmpty()) {
            return true;
        }

        // If template kept a token placeholder, treat it as writable.
        if (trimmed.contains("{{") && trimmed.contains("}}")) {
            return true;
        }

        String compact = trimmed.replaceAll("\\s+", "");
        if (compact.isEmpty()) {
            return true;
        }

        // Common placeholders: underscores, hyphens, dots.
        if (compact.matches("^[_\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\.]+$")) {
            return true;
        }

        // Some forms use ":" only cells.
        if (compact.matches("^[:：]+$")) {
            return true;
        }

        return false;
    }

    private void writeCellText(Tc tc, String value) {
        if (tc == null) {
            return;
        }

        if (tc.subList() == null) {
            tc.createSubList();
        }

        SubList subList = tc.subList();
        if (subList == null) {
            return;
        }

        Para para;
        if (subList.countOfPara() > 0) {
            para = subList.getPara(0);
            for (int i = subList.countOfPara() - 1; i >= 1; i--) {
                subList.removePara(i);
            }
        } else {
            para = subList.addNewPara();
        }

        String charPrId = null;
        if (para.countOfRun() > 0) {
            Run firstRun = para.getRun(0);
            if (firstRun != null) {
                charPrId = firstRun.charPrIDRef();
            }
        }

        para.removeAllRuns();

        if (value == null || value.isEmpty()) {
            para.removeLineSegArray();
            return;
        }

        Run run = para.addNewRun();
        if (charPrId != null) {
            run.charPrIDRef(charPrId);
        }

        T t = run.addNewT();
        // Keep newlines; HWPXWriter will serialize them inside text.
        t.addText(value.replace("\r\n", "\n"));
        para.removeLineSegArray();
    }

    private String readCellText(Tc tc) {
        if (tc == null || tc.subList() == null) {
            return "";
        }

        SubList subList = tc.subList();
        if (subList == null || subList.countOfPara() == 0) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (int p = 0; p < subList.countOfPara(); p++) {
            Para para = subList.getPara(p);
            if (para == null) {
                continue;
            }

            if (sb.length() > 0) {
                sb.append('\n');
            }
            sb.append(readParaText(para));
        }
        return sb.toString();
    }

    private String readParaText(Para para) {
        if (para == null) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < para.countOfRun(); r++) {
            Run run = para.getRun(r);
            if (run == null) {
                continue;
            }

            for (int i = 0; i < run.countOfRunItem(); i++) {
                RunItem item = run.getRunItem(i);
                if (item instanceof T) {
                    sb.append(readTextObject((T) item));
                }
            }
        }
        return sb.toString();
    }

    private String readTextObject(T textObject) {
        if (textObject == null) {
            return "";
        }

        if (textObject.isOnlyText()) {
            return textObject.onlyText() == null ? "" : textObject.onlyText();
        }

        StringBuilder sb = new StringBuilder();
        for (int index = 0; index < textObject.countOfItems(); index++) {
            if (textObject.getItem(index)._objectType() != ObjectType.NormalText) {
                continue;
            }
            NormalText normalText = (NormalText) textObject.getItem(index);
            if (normalText.text() != null) {
                sb.append(normalText.text());
            }
        }
        return sb.toString();
    }

    private Set<String> buildKnownLabelSet(Map<String, String> fieldValues) {
        Set<String> labels = new HashSet<>();
        for (String key : fieldValues.keySet()) {
            for (String variant : buildLabelVariants(key)) {
                String norm = normalizeForMatch(variant);
                if (!norm.isEmpty()) {
                    labels.add(norm);
                }
            }
        }
        return labels;
    }

    private List<String> buildLabelVariants(String key) {
        List<String> variants = new ArrayList<>();
        if (key != null && !key.isBlank()) {
            variants.add(key);
        }

        Map<String, List<String>> synonyms = buildSynonymMap();
        List<String> mapped = synonyms.get(key);
        if (mapped != null) {
            variants.addAll(mapped);
        }

        return variants;
    }

    private Map<String, List<String>> buildSynonymMap() {
        Map<String, List<String>> map = new HashMap<>();
        map.put("bidTitle", Arrays.asList("공고명", "입찰공고명", "사업명", "용역명", "과업명", "건명"));
        map.put("bidNoticeNo", Arrays.asList("공고번호", "입찰공고번호", "입찰공고 번호", "공고 No", "공고NO", "공고No"));
        map.put("issuingAgency", Arrays.asList("발주기관", "수요기관", "수요기관명", "발주처", "기관명"));
        map.put("objectives", Arrays.asList("목적", "과업목적", "추진목적", "사업목적", "목표"));
        map.put("schedule", Arrays.asList("일정", "사업기간", "용역기간", "계약기간", "추진일정"));
        map.put("location", Arrays.asList("장소", "수행장소", "사업장소", "수행지역"));
        map.put("programName", Arrays.asList("프로그램명", "프로젝트명"));
        return map;
    }

    private String normalizeForMatch(String source) {
        if (source == null) {
            return "";
        }

        String s = source.trim();
        if (s.isEmpty()) {
            return "";
        }

        s = s.replace('：', ':');
        // Strip spaces and common punctuation to improve matching.
        s = s.replaceAll("\\s+", "");
        s = s.replaceAll("[\\[\\]\\(\\)\\{\\}<>]", "");
        s = s.replaceAll("[·•]", "");
        s = s.replaceAll(":+$", "");
        return s;
    }

    private static final class CellPos {
        final int row;
        final int col;

        private CellPos(int row, int col) {
            this.row = row;
            this.col = col;
        }
    }

    private static final class CellRef {
        final Tc tc;
        String originalText;
        String normalizedText;

        private CellRef(Tc tc, String originalText, String normalizedText) {
            this.tc = tc;
            this.originalText = originalText == null ? "" : originalText;
            this.normalizedText = normalizedText == null ? "" : normalizedText;
        }
    }
}
