<template>
  <t-card class="storyboardTable">
    <div class="titleBar dragHandle pr">
      <div class="title c">{{ $t("workbench.production.node.storyboardTable.title") }}</div>
      <t-button size="small" variant="text" @click="openEdit">{{ $t("workbench.production.edit") }}</t-button>
      <Handle :id="props.handleIds.target" type="target" :position="Position.Left" style="left: calc(-1 * var(--td-comp-paddingLR-xl))" />
      <Handle :id="props.handleIds.source" type="source" :position="Position.Right" style="right: calc(-1 * var(--td-comp-paddingLR-xl))" />
    </div>
    <div class="storyboardList">
      <t-empty v-if="!storyboardTable" style="margin-top: 16px"></t-empty>
      <div v-else-if="parsedTable.rows.length" class="storyboard-table-view">
        <div class="tableMeta">
          <t-tag size="small" theme="primary" variant="light">{{ parsedTable.rows.length }} 个分镜</t-tag>
          <t-tag size="small" theme="default" variant="light">{{ parsedTable.headers.length }} 个字段</t-tag>
        </div>
        <div class="tableScroll">
          <table>
            <thead>
              <tr>
                <th
                  v-for="header in parsedTable.headers"
                  :key="header"
                  :class="columnClass(header)"
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in parsedTable.rows" :key="rowIndex">
                <td
                  v-for="(header, colIndex) in parsedTable.headers"
                  :key="`${rowIndex}-${header}`"
                  :class="columnClass(header)"
                >
                  <span v-if="isShotNumberColumn(header)" class="shotNo">{{ row[colIndex] || rowIndex + 1 }}</span>
                  <span v-else>{{ row[colIndex] || "-" }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <pre v-else-if="productionEmbedded" class="markdown-lite">{{ storyboardTable }}</pre>
      <MdPreview v-else v-model="storyboardTable" :theme="mdTheme" />
    </div>
  </t-card>

  <t-dialog
    v-model:visible="dialogVisible"
    :header="$t('workbench.production.node.storyboardTable.editDialog')"
    :width="'90vw'"
    :confirm-btn="$t('workbench.production.save')"
    :cancel-btn="$t('workbench.production.cancel')"
    @confirm="onConfirm"
    @cancel="onCancel"
    @close="onCancel"
    :close-on-overlay-click="false"
    placement="center"
    attach="body">
    <MdEditor
      v-if="dialogVisible"
      v-model="editContent"
      :theme="mdTheme"
      :toolbars="toolbars"
      :footers="[]"
      style="height: 72vh"
      @onUploadImg="() => {}"
      @drop.prevent
      @paste="onPaste" />
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, inject, ref, watchEffect } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
import { ensureMdEditorLinkConfig } from "@/utils/mdEditorConfig";
const { themeSetting } = storeToRefs(settingStore());
const MdEditor = defineAsyncComponent(() => import("md-editor-v3").then((module) => module.MdEditor));
const MdPreview = defineAsyncComponent(() => import("md-editor-v3").then((module) => module.MdPreview));
const productionEmbedded = inject("productionEmbedded", false);
const mdTheme = computed(() => (themeSetting.value.mode === "auto" ? "light" : themeSetting.value.mode));

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
}>();

const storyboardTable = defineModel<string>({ required: true });
const editContent = ref("");
const dialogVisible = ref(false);
const parsedTable = computed(() => parseMarkdownTable(storyboardTable.value ?? ""));

watchEffect(() => {
  if (!productionEmbedded || dialogVisible.value) void ensureMdEditorLinkConfig();
});

const toolbars: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];

function openEdit() {
  editContent.value = storyboardTable.value ?? "";
  dialogVisible.value = true;
}

function onConfirm() {
  storyboardTable.value = editContent.value;
  dialogVisible.value = false;
}

function onCancel() {
  dialogVisible.value = false;
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
      e.preventDefault();
      return;
    }
  }
}

function isTableLine(line: string) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorLine(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitMarkdownRow(line: string) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];
    if (char === "|" && previous !== "\\") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) =>
    cell
      .replace(/\\\|/g, "|")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim(),
  );
}

function normalizeRow(row: string[], length: number) {
  return Array.from({ length }, (_, index) => row[index] ?? "");
}

function parseMarkdownTable(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isTableLine(lines[index]) || !isSeparatorLine(lines[index + 1])) continue;
    const headers = splitMarkdownRow(lines[index]).filter(Boolean);
    if (!headers.length) break;
    const rows: string[][] = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const line = lines[rowIndex];
      if (!isTableLine(line) || isSeparatorLine(line)) break;
      rows.push(normalizeRow(splitMarkdownRow(line), headers.length));
    }
    return { headers, rows };
  }

  return { headers: [] as string[], rows: [] as string[][] };
}

function isShotNumberColumn(header: string) {
  return /镜号|序号|编号|shot|no\.?/i.test(header);
}

function columnClass(header: string) {
  if (isShotNumberColumn(header)) return "col-shot";
  if (/时长|duration/i.test(header)) return "col-duration";
  if (/景别|shotSize|镜别/i.test(header)) return "col-shot-size";
  if (/运镜|camera/i.test(header)) return "col-camera";
  if (/场景|scene/i.test(header)) return "col-scene";
  if (/叙事功能|功能|beat/i.test(header)) return "col-beat";
  if (/画面|动作|描述|videoDesc|action/i.test(header)) return "col-description";
  if (/情绪|emotion|光影|lighting/i.test(header)) return "col-mood";
  if (/台词|声音|sound|line/i.test(header)) return "col-sound";
  if (/资产|asset/i.test(header)) return "col-assets";
  return "";
}
</script>

<style lang="scss" scoped>
.storyboardTable {
  max-width: 100vw;
  width: min(980px, calc(100vw - 48px));
  min-width: 420px;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .storyboardList {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
    width: 100%;

    :deep(.md-editor) {
      border: none;
      box-shadow: none;
    }

    :deep(.md-editor-preview-wrapper) {
      padding: 0;
    }

    .markdown-lite {
      max-height: 260px;
      margin: 0;
      overflow: hidden;
      color: var(--td-text-color-secondary);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  }

  .storyboard-table-view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .tableMeta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tableScroll {
    width: 100%;
    max-height: 520px;
    overflow: auto;
    border: 1px solid var(--td-border-level-1-color, #e7e7e7);
    border-radius: 8px;
    background: var(--td-bg-color-container, #fff);
  }

  table {
    width: max-content;
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 2;
  }

  th {
    background: var(--td-bg-color-secondarycontainer, #f5f5f5);
    color: var(--td-text-color-primary, #333);
    font-weight: 600;
    white-space: nowrap;
  }

  th,
  td {
    max-width: 220px;
    padding: 8px 10px;
    border-right: 1px solid var(--td-border-level-1-color, #e7e7e7);
    border-bottom: 1px solid var(--td-border-level-1-color, #e7e7e7);
    vertical-align: top;
    color: var(--td-text-color-primary, #333);
    white-space: pre-wrap;
    word-break: break-word;

    &:last-child {
      border-right: none;
    }
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover td {
    background: var(--td-bg-color-container-hover, #f7f7f7);
  }

  .shotNo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--td-brand-color-light, #e8f3ff);
    color: var(--td-brand-color, #0052d9);
    font-weight: 600;
  }

  .col-shot {
    min-width: 64px;
    max-width: 84px;
    text-align: center;
  }

  .col-duration {
    min-width: 70px;
    max-width: 86px;
  }

  .col-shot-size,
  .col-camera,
  .col-scene,
  .col-beat {
    min-width: 96px;
    max-width: 150px;
  }

  .col-description {
    min-width: 280px;
    max-width: 420px;
  }

  .col-mood,
  .col-sound {
    min-width: 150px;
    max-width: 220px;
  }

  .col-assets {
    min-width: 140px;
    max-width: 220px;
  }

  .storyboardItem {
    display: flex;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid var(--td-border-level-1-color, #e7e7e7);

    &:last-child {
      border-bottom: none;
    }
  }

  .itemTag {
    flex-shrink: 0;
    width: 36px;
    height: 22px;
    border-radius: 4px;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    margin-top: 2px;
  }

  .itemContent {
    flex: 1;
    min-width: 0;
  }

  .itemHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .itemTags {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
    margin-left: 12px;
  }

  .itemTitle {
    font-size: 14px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.5;
  }

  .itemDetail {
    font-size: 12px;
    color: var(--td-text-color-secondary, #999);
    line-height: 1.4;

    .sep {
      margin: 0 6px;
      color: var(--td-border-level-1-color, #ddd);
    }
  }
}
</style>
