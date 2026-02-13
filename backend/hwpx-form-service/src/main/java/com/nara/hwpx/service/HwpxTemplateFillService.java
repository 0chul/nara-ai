package com.nara.hwpx.service;

import kr.dogfoot.hwpxlib.object.HWPXFile;
import kr.dogfoot.hwpxlib.object.common.ObjectType;
import kr.dogfoot.hwpxlib.object.content.section_xml.SubList;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.Para;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.Run;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.RunItem;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.T;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.object.Table;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.object.table.Tc;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.object.table.Tr;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.t.NormalText;
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

/**
 * POC-level HWPX template filler:
 * - {{token}} replacement
 * - named fields (FieldBegin.name) injection
 * - table label matching (Korean synonyms) -> fill the cell to the right/below
 *
 * For POC UX, we allow overwriting non-empty target cells once a label match is found
 * (to make "something changes" visible), while still avoiding writing into another label cell.
 */
@Service
public class HwpxTemplateFillService {
    public FillResult fillTemplate(File templateFile, Map<String, String> fieldValues) throws Exception {
        HWPXFile hwpxFile = HWPXReader.fromFile(templateFile);

        FillStats stats = new FillStats();
        stats.tokenReplacements = replaceTokenPlaceholders(hwpxFile, fieldValues);
        stats.namedFieldsFilled = fillNamedFields(hwpxFile, fieldValues);
        TableFillStats tableStats = fillTableCells(hwpxFile, fieldValues);
        stats.tableCellsFilled = tableStats.cellsFilled;
        stats.inlineLabelCellsFilled = tableStats.inlineCellsFilled;
        stats.total = stats.tokenReplacements + stats.namedFieldsFilled + stats.tableCellsFilled + stats.inlineLabelCellsFilled;

        return new FillResult(HWPXWriter.toBytes(hwpxFile), stats);
    }

    private int replaceTokenPlaceholders(HWPXFile hwpxFile, Map<String, String> fieldValues) throws Exception {
        ObjectFinder.Result[] textResults = ObjectFinder.find(
                hwpxFile,
                (thisObject, parentsPath) -> thisObject._objectType() == ObjectType.hp_t,
                false
        );

        int replacements = 0;
        for (ObjectFinder.Result textResult : textResults) {
            T textObject = (T) textResult.thisObject();
            replacements += applyMapToTextObject(textObject, fieldValues);
        }
        return replacements;
    }

    private int applyMapToTextObject(T textObject, Map<String, String> fieldValues) {
        if (textObject == null) {
            return 0;
        }

        int replacements = 0;
        if (textObject.isOnlyText()) {
            ReplaceResult replaced = replaceAllTokens(textObject.onlyText(), fieldValues);
            textObject.clear();
            if (!replaced.value.isEmpty()) {
                textObject.addText(replaced.value);
            }
            return replaced.replacements;
        }

        for (int index = 0; index < textObject.countOfItems(); index++) {
            if (textObject.getItem(index)._objectType() != ObjectType.NormalText) {
                continue;
            }

            NormalText normalText = (NormalText) textObject.getItem(index);
            ReplaceResult replaced = replaceAllTokens(normalText.text(), fieldValues);
            normalText.text(replaced.value);
            replacements += replaced.replacements;
        }

        return replacements;
    }

    private ReplaceResult replaceAllTokens(String source, Map<String, String> fieldValues) {
        if (source == null || source.isEmpty()) {
            return new ReplaceResult("", 0);
        }

        String replaced = source;
        int replacements = 0;
        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            String token = "{{" + entry.getKey() + "}}";
            String value = entry.getValue() == null ? "" : entry.getValue();

            int hits = countOccurrences(replaced, token);
            if (hits > 0) {
                replaced = replaced.replace(token, value);
                replacements += hits;
            }
        }

        return new ReplaceResult(replaced, replacements);
    }

    private int fillNamedFields(HWPXFile hwpxFile, Map<String, String> fieldValues) throws Exception {
        int filled = 0;
        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            FieldFinder.Result[] fieldResults = FieldFinder.find(hwpxFile, entry.getKey(), false);
            for (FieldFinder.Result result : fieldResults) {
                injectFieldValue(result, entry.getValue() == null ? "" : entry.getValue());
                filled++;
            }
        }
        return filled;
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
        insertedText.addText(value == null ? "" : value);

        beginPara.insertRun(insertedRun, beginRunIndex + 1);
        beginPara.removeLineSegArray();
    }

    private TableFillStats fillTableCells(HWPXFile hwpxFile, Map<String, String> fieldValues) throws Exception {
        Map<String, String> orderedFields = orderForTableFill(fieldValues);
        Set<String> knownLabels = buildKnownLabelSet(orderedFields);

        ObjectFinder.Result[] tableResults = ObjectFinder.find(
                hwpxFile,
                (thisObject, parentsPath) -> thisObject instanceof Table,
                false
        );

        int cellsFilled = 0;
        int inlineCellsFilled = 0;
        for (ObjectFinder.Result result : tableResults) {
            Table table = (Table) result.thisObject();
            SingleTableFillStats stats = fillSingleTable(table, orderedFields, knownLabels);
            cellsFilled += stats.cellsFilled;
            inlineCellsFilled += stats.inlineCellsFilled;
        }

        return new TableFillStats(cellsFilled, inlineCellsFilled);
    }

    private Map<String, String> orderForTableFill(Map<String, String> fieldValues) {
        List<String> priorityKeys = Arrays.asList(
                "programName",
                "bidTitle",
                "bidNoticeNo",
                "issuingAgency",
                "objectives",
                "schedule",
                "location"
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

    private SingleTableFillStats fillSingleTable(Table table, Map<String, String> fieldValues, Set<String> knownLabels) {
        List<List<CellRef>> cells = snapshotTableCells(table);
        if (cells.isEmpty()) {
            return new SingleTableFillStats(0, 0);
        }

        int cellsFilled = 0;
        int inlineCellsFilled = 0;

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
                // Some templates keep "Label: ____" inside a single cell.
                CellRef labelCell = safeCellAt(cells, labelPos);
                if (tryFillInlineInLabelCell(labelCell, value)) {
                    inlineCellsFilled++;
                }
                continue;
            }

            CellRef target = safeCellAt(cells, targetPos);
            if (target == null || target.tc == null) {
                continue;
            }

            if (knownLabels.contains(target.normalizedText)) {
                continue;
            }

            String existing = target.originalText == null ? "" : target.originalText.trim();
            if (!existing.isEmpty() && existing.equals(value.trim())) {
                continue;
            }

            // POC: allow overwrite once label is matched, but keep simple guardrails.
            // If the target cell looks like a label itself, skip.
            if (looksLikeLabelCell(target.originalText, knownLabels)) {
                continue;
            }

            if (!shouldWriteIntoCell(target.originalText) && !allowOverwriteForPoc(key)) {
                continue;
            }

            writeCellText(target.tc, value);
            target.originalText = value;
            target.normalizedText = normalizeForMatch(value);
            cellsFilled++;
        }

        return new SingleTableFillStats(cellsFilled, inlineCellsFilled);
    }

    private List<List<CellRef>> snapshotTableCells(Table table) {
        List<List<CellRef>> rows = new ArrayList<>();
        if (table == null) {
            return rows;
        }

        for (int r = 0; r < table.countOfTr(); r++) {
            Tr tr = table.getTr(r);
            if (tr == null) {
                continue;
            }
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
        List<CellRef> row = safeRowAt(cells, labelPos.row);
        if (row == null) {
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

            return new CellPos(labelPos.row, c);
        }

        // Fall back to a cell below in the same column.
        List<CellRef> nextRow = safeRowAt(cells, labelPos.row + 1);
        if (nextRow != null && labelPos.col >= 0 && labelPos.col < nextRow.size()) {
            CellRef candidate = nextRow.get(labelPos.col);
            if (candidate != null && candidate.tc != null && !knownLabels.contains(candidate.normalizedText)) {
                return new CellPos(labelPos.row + 1, labelPos.col);
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

        // Common placeholders: underscores, hyphens, dots, bullets.
        if (compact.matches("^[_\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\.·ㆍ∙•]+$")) {
            return true;
        }

        // Some forms use ":" only cells.
        if (compact.matches("^[:：]+$")) {
            return true;
        }

        // Checkbox-like placeholders.
        if (compact.matches("^[□■☐☑✓✔○●◇◆]+$")) {
            return true;
        }

        // Korean placeholder words often used in forms.
        if (compact.matches("^(입력|작성|기재|기입|선택|미정|추후작성|추후|예시|내용)$")) {
            return true;
        }

        String lower = compact.toLowerCase();
        if (lower.matches("^(tbd|n/a|na)$")) {
            return true;
        }

        return false;
    }

    private boolean allowOverwriteForPoc(String key) {
        if (key == null) {
            return false;
        }

        // POC: these are the fields users expect to see filled even if the template has defaults.
        return Arrays.asList(
                "programName",
                "objectives",
                "schedule",
                "location",
                "bidTitle",
                "bidNoticeNo",
                "issuingAgency"
        ).contains(key);
    }

    private boolean looksLikeLabelCell(String text, Set<String> knownLabels) {
        if (text == null) {
            return false;
        }
        String norm = normalizeForMatch(text);
        if (norm.isEmpty()) {
            return false;
        }
        if (knownLabels.contains(norm)) {
            return true;
        }

        // If it's "something:" and the "something" is a known label, treat it as label-ish.
        int colonIndex = indexOfAny(text, ':', '：');
        if (colonIndex > 0) {
            String left = normalizeForMatch(text.substring(0, colonIndex));
            return !left.isEmpty() && knownLabels.contains(left);
        }
        return false;
    }

    private boolean tryFillInlineInLabelCell(CellRef labelCell, String value) {
        if (labelCell == null || labelCell.tc == null) {
            return false;
        }

        String original = labelCell.originalText == null ? "" : labelCell.originalText;
        int colonIndex = indexOfAny(original, ':', '：');
        if (colonIndex < 0) {
            return false;
        }

        char colon = original.charAt(colonIndex);
        String left = original.substring(0, colonIndex).trim();
        String right = original.substring(colonIndex + 1);

        if (!shouldWriteIntoCell(right) && !allowOverwriteForPoc("objectives")) {
            return false;
        }

        String composed = left + colon + " " + value;
        writeCellText(labelCell.tc, composed);
        labelCell.originalText = composed;
        labelCell.normalizedText = normalizeForMatch(composed);
        return true;
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
        if (para != null && para.countOfRun() > 0) {
            Run firstRun = para.getRun(0);
            if (firstRun != null) {
                charPrId = firstRun.charPrIDRef();
            }
        }

        if (para != null) {
            para.removeAllRuns();
        }

        String safeValue = value == null ? "" : value;
        if (safeValue.isEmpty() || para == null) {
            if (para != null) {
                para.removeLineSegArray();
            }
            return;
        }

        Run run = para.addNewRun();
        if (charPrId != null) {
            run.charPrIDRef(charPrId);
        }

        T t = run.addNewT();
        // Keep newlines; HWPXWriter will serialize them inside text.
        t.addText(safeValue.replace("\r\n", "\n"));
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

        map.put("bidTitle", Arrays.asList("공고명", "입찰공고명", "용역명", "과업명", "건명"));
        map.put("bidNoticeNo", Arrays.asList("공고번호", "입찰공고번호", "입찰공고 번호", "공고 No", "공고NO", "공고No"));
        map.put("issuingAgency", Arrays.asList("발주기관", "수요기관", "수요기관명", "발주처", "기관명"));
        map.put("objectives", Arrays.asList("목적", "과업목적", "추진목적", "사업목적", "목표"));
        map.put("schedule", Arrays.asList("일정", "사업기간", "용역기간", "계약기간", "추진일정"));
        map.put("location", Arrays.asList("장소", "수행장소", "사업장소", "수행지역", "지역"));
        map.put("programName", Arrays.asList("사업명", "프로그램명", "프로젝트명"));

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
        s = s.replaceAll("[·ㆍ∙•]", "");
        s = s.replaceAll(":+$", "");
        return s;
    }

    private List<CellRef> safeRowAt(List<List<CellRef>> cells, int rowIndex) {
        if (rowIndex < 0 || rowIndex >= cells.size()) {
            return null;
        }
        return cells.get(rowIndex);
    }

    private CellRef safeCellAt(List<List<CellRef>> cells, CellPos pos) {
        if (pos == null) {
            return null;
        }
        List<CellRef> row = safeRowAt(cells, pos.row);
        if (row == null || pos.col < 0 || pos.col >= row.size()) {
            return null;
        }
        return row.get(pos.col);
    }

    private int countOccurrences(String haystack, String needle) {
        if (haystack == null || haystack.isEmpty() || needle == null || needle.isEmpty()) {
            return 0;
        }
        int count = 0;
        int idx = 0;
        while (true) {
            int found = haystack.indexOf(needle, idx);
            if (found < 0) {
                return count;
            }
            count++;
            idx = found + needle.length();
        }
    }

    private int indexOfAny(String s, char a, char b) {
        if (s == null || s.isEmpty()) {
            return -1;
        }
        int ia = s.indexOf(a);
        int ib = s.indexOf(b);
        if (ia < 0) {
            return ib;
        }
        if (ib < 0) {
            return ia;
        }
        return Math.min(ia, ib);
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

    private static final class ReplaceResult {
        final String value;
        final int replacements;

        private ReplaceResult(String value, int replacements) {
            this.value = value == null ? "" : value;
            this.replacements = Math.max(0, replacements);
        }
    }

    private static final class TableFillStats {
        final int cellsFilled;
        final int inlineCellsFilled;

        private TableFillStats(int cellsFilled, int inlineCellsFilled) {
            this.cellsFilled = Math.max(0, cellsFilled);
            this.inlineCellsFilled = Math.max(0, inlineCellsFilled);
        }
    }

    private static final class SingleTableFillStats {
        final int cellsFilled;
        final int inlineCellsFilled;

        private SingleTableFillStats(int cellsFilled, int inlineCellsFilled) {
            this.cellsFilled = Math.max(0, cellsFilled);
            this.inlineCellsFilled = Math.max(0, inlineCellsFilled);
        }
    }

    public static final class FillStats {
        public int tokenReplacements;
        public int namedFieldsFilled;
        public int tableCellsFilled;
        public int inlineLabelCellsFilled;
        public int total;
    }

    public static final class FillResult {
        private final byte[] bytes;
        private final FillStats stats;

        public FillResult(byte[] bytes, FillStats stats) {
            this.bytes = bytes == null ? new byte[0] : bytes;
            this.stats = stats == null ? new FillStats() : stats;
        }

        public byte[] bytes() {
            return bytes;
        }

        public FillStats stats() {
            return stats;
        }
    }
}

