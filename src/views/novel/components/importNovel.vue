<template>
  <div class="purgeNovel">
    <t-dialog :footer="false" v-model:visible="purgeNovelShow" :header="$t('workbench.novel.import.title')" width="50%" placement="center">
      <div class="data">
        <t-tabs :value="activeKey" disabled>
          <t-tab-panel value="To1" :label="$t('workbench.novel.import.step1')" style="height: 680px; overflow-y: auto">
            <div class="uploadArea" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
              <input
                ref="fileInputRef"
                class="hiddenFileInput"
                type="file"
                multiple
                accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                @change="handleFileInputChange" />
              <div class="dragIcon">
                <i-upload-one theme="outline" size="32" fill="var(--td-brand-color)" />
              </div>
              <p class="uploadText">{{ $t("workbench.novel.import.dragUpload") }}</p>
              <p class="uploadHint">{{ $t("workbench.novel.import.uploadHint") }}</p>
            </div>
            <t-divider>{{ $t("workbench.novel.import.or") }}</t-divider>
            <div class="formItem">
              <div class="label">{{ $t("workbench.novel.import.pasteLabel") }}</div>
              <div class="uploadWrap">
                <t-textarea v-model="content" :placeholder="$t('workbench.novel.import.pastePlaceholder')" :autosize="{ minRows: 12, maxRows: 12 }" />
              </div>
              <div class="footerInfo f ac jb" style="margin-top: 8px">
                <div>
                  <span class="charCount">{{ content.length }} {{ $t("workbench.novel.import.chars") }}</span>
                  <span v-if="content.length > 0 && content.length < 100" class="tips warn">{{ $t("workbench.novel.import.tooShort") }}</span>
                </div>
                <span>{{ $t("workbench.novel.import.parsedChapters", { count: tableData.length }) }}</span>
              </div>
            </div>

            <div style="margin-top: 16px; text-align: right">
              <t-button theme="primary" style="margin-left: 10px" :disabled="!content || !tableData.length" @click="activeKey = 'To2'">
                {{ $t("workbench.novel.import.nextStep") }}
              </t-button>
            </div>
          </t-tab-panel>
          <t-tab-panel value="To2" :label="$t('workbench.novel.import.step2')" style="height: 680px; overflow-y: auto">
            <div class="fc to2Box">
              <t-table
                ref="tableRef"
                row-key="rowKey"
                :data="tableData"
                :columns="columns"
                :selected-row-keys="selectedRowKeys"
                hover
                style="flex: 1; overflow-y: auto"
                @select-change="onSelectChange">
                <template #chapterData="{ row }">
                  <t-tooltip :content="row.chapterData" placement="top">
                    <span class="ellipsisText">{{ row.chapterData }}</span>
                  </t-tooltip>
                </template>
              </t-table>
              <div class="selectedInfo">{{ $t("workbench.novel.import.selectedInfo", { count: selectedTextLength }) }}</div>
              <div style="margin-top: 16px; text-align: right">
                <t-button variant="outline" @click="activeKey = 'To1'">{{ $t("workbench.novel.import.prevStep") }}</t-button>
                <t-button theme="primary" style="margin-left: 10px" :loading="nextLoading" @click="keep">
                  保存
                </t-button>
              </div>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { LoadingPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import parseNovel from "@/utils/parseNovel";
import mammoth from "mammoth";
import type { PrimaryTableCol, TableRowData } from "tdesign-vue-next";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
interface ChapterItem {
  rowKey: string;
  index: number;
  reel: string;
  chapter: string;
  chapterData: string;
  sourceFile?: string;
}

const purgeNovelShow = defineModel<boolean>();

const activeKey = ref("To1");
const fileInputRef = ref<HTMLInputElement>();
const content = ref("");
const uploadedRows = ref<ChapterItem[]>([]);
const uploadedContentSnapshot = ref("");
const selectedRowKeys = ref<Array<string | number>>([]);

const nextLoading = ref(false);

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "row-select", type: "multiple", width: 60 },
  { colKey: "index", title: $t("workbench.novel.import.col.chapter"), width: 100 },
  { colKey: "reel", title: $t("workbench.novel.import.col.reel"), width: 100 },
  { colKey: "chapter", title: $t("workbench.novel.import.col.chapterName"), width: 200, ellipsis: true },
  { colKey: "chapterData", title: $t("workbench.novel.import.col.chapterData"), ellipsis: true },
];

// 解析后的章节数据
const tableData = computed<ChapterItem[]>(() => {
  if (uploadedRows.value.length) return uploadedRows.value;
  if (!content.value) return [];
  try {
    return parseContentRows(content.value, "paste");
  } catch (e) {
    console.error("解析小说内容出错:", e);
    return [];
  }
});

// 选中的行数据
const selectedRows = computed(() => tableData.value.filter((item) => selectedRowKeys.value.includes(item.rowKey)));

// 已选文本总长度
const selectedTextLength = computed(() => selectedRows.value.reduce((sum, item) => sum + item.chapterData.length, 0));

// 触发上传
function triggerUpload() {
  fileInputRef.value?.click();
}

// 处理拖拽上传
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    await loadFiles(Array.from(files));
  }
}

// 读取文件内容
async function readFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.toLowerCase().split(".").pop();
  if (file.type === "text/plain" || ext === "txt") {
    return new TextDecoder().decode(buffer);
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

function normalizeFullWidthDigits(value: string) {
  return value.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
}

function parseChapterNumber(value: string) {
  const text = normalizeFullWidthDigits(value.trim());
  if (/^\d+$/.test(text)) return Number(text);
  const map: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text === "十") return 10;
  const tenParts = text.split("十");
  if (tenParts.length === 2) {
    const tens = tenParts[0] ? map[tenParts[0]] ?? 0 : 1;
    const ones = tenParts[1] ? map[tenParts[1]] ?? 0 : 0;
    return tens * 10 + ones;
  }
  if (text.length === 1 && map[text] != null) return map[text];
  return null;
}

function parseFileChapterMeta(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const patterns = [
    { regexp: /\bjuben[-_\s]*(\d{1,4})\b/i, prefix: "juben" },
    { regexp: /\bch(?:apter)?[-_\s]*(\d{1,4})\b/i, prefix: "chapter" },
    { regexp: /第\s*([0-9０-９零〇一二两三四五六七八九十]{1,8})\s*[章章节回]/i, prefix: "第" },
  ];
  for (const pattern of patterns) {
    const match = baseName.match(pattern.regexp);
    const index = match?.[1] ? parseChapterNumber(match[1]) : null;
    if (index && index > 0) {
      return {
        index,
        chapter: pattern.prefix === "juben" ? `juben${index}` : baseName.trim() || `第${index}章`,
      };
    }
  }
  return null;
}

function parseContentRows(text: string, sourceKey: string, sourceFile?: string): ChapterItem[] {
  return parseNovel(text).flatMap((reel, reelIndex) =>
    reel.chapters.map((chapter, chapterIndex) => ({
      rowKey: `${sourceKey}:${reelIndex}:${chapterIndex}:${chapter.index}`,
      index: chapter.index,
      reel: reel.reel,
      chapter: chapter.chapter,
      chapterData: chapter.text,
      sourceFile,
    })),
  );
}

function rowsFromFile(file: File, text: string, order: number) {
  const rows = parseContentRows(text, `file:${order}:${file.name}`, file.name);
  const fileMeta = parseFileChapterMeta(file.name);
  if (!fileMeta || rows.length !== 1) return rows;
  return rows.map((row) => ({
    ...row,
    rowKey: `file:${order}:${fileMeta.chapter}:${fileMeta.index}`,
    index: fileMeta.index,
    chapter: fileMeta.chapter,
  }));
}

function isSupportedNovelFile(file: File) {
  const ext = file.name.toLowerCase().split(".").pop();
  if (file.type === "application/msword" || ext === "doc") return "doc";
  if (file.type === "text/plain" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "ok";
  if (ext === "txt" || ext === "docx") return "ok";
  return "unsupported";
}

async function loadFiles(files: File[]) {
  if (!files.length) {
    window.$message.error($t("workbench.novel.import.msg.selectFile"));
    return;
  }

  const unsupported = files.find((file) => isSupportedNovelFile(file) === "unsupported");
  if (unsupported) {
    window.$message.error($t("workbench.novel.import.msg.unsupportedType"));
    return;
  }
  const doc = files.find((file) => isSupportedNovelFile(file) === "doc");
  if (doc) {
    window.$message.warning($t("workbench.novel.import.msg.docNotSupported"));
    return;
  }
  const tooLarge = files.find((file) => file.size > 10 * 1024 * 1024);
  if (tooLarge) {
    window.$message.error($t("workbench.novel.import.msg.fileTooLarge"));
    return;
  }

  LoadingPlugin(true);
  try {
    const sortedFiles = [...files].sort((a, b) => {
      const aIndex = parseFileChapterMeta(a.name)?.index;
      const bIndex = parseFileChapterMeta(b.name)?.index;
      if (aIndex && bIndex && aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });
    const parsed = await Promise.all(sortedFiles.map(async (file, index) => ({ file, index, text: await readFile(file) })));
    const rows = parsed.flatMap((item) => rowsFromFile(item.file, item.text, item.index));
    const combinedText = parsed.map((item) => `# ${item.file.name}\n${item.text}`).join("\n\n");
    uploadedContentSnapshot.value = combinedText;
    uploadedRows.value = rows;
    content.value = combinedText;
    selectedRowKeys.value = rows.map((row) => row.rowKey);
  } catch {
    window.$message.error($t("workbench.novel.import.msg.parseFailed"));
  } finally {
    LoadingPlugin(false);
  }
}

async function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  await loadFiles(Array.from(input.files ?? []));
  input.value = "";
}

// 勾选变化
function onSelectChange(selectedKeys: Array<string | number>, _context: { selectedRowData: TableRowData[] }) {
  selectedRowKeys.value = selectedKeys;
}
const emit = defineEmits(["select"]);
//保存小说
async function keep() {
  nextLoading.value = true;
  if (!selectedRows.value.length) {
    window.$message.warning($t("workbench.novel.import.msg.selectChapters"));
    nextLoading.value = false;
    return;
  }
  try {
    await axios.post("/novel/addNovel", { projectId: project.value?.id, data: selectedRows.value });
    nextLoading.value = false;
    emit("select");
    window.$message.success($t("workbench.novel.import.msg.saveSuccess"));
  } catch (e) {
    window.$message.error((e as Error).message);
    nextLoading.value = false;
  } finally {
    nextLoading.value = false;
    purgeNovelShow.value = false;
  }
}
//关闭弹窗时重置数据
watch(purgeNovelShow, (newVal) => {
  if (!newVal) {
    content.value = "";
    uploadedRows.value = [];
    uploadedContentSnapshot.value = "";
    selectedRowKeys.value = [];
    activeKey.value = "To1";
  }
});

watch(content, (value) => {
  if (uploadedRows.value.length && value !== uploadedContentSnapshot.value) {
    uploadedRows.value = [];
    uploadedContentSnapshot.value = "";
  }
});

watch(tableData, (rows) => {
  selectedRowKeys.value = rows.map((row) => row.rowKey);
});
</script>

<style lang="scss" scoped>
.purgeNovel {
  .data {
    .uploadArea {
      margin-top: 20px;
      padding: 42px 20px;
      border: 2px dashed #969494;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      &:hover {
        border-color: #000000;
      }

      .hiddenFileInput {
        display: none;
      }

      .dragIcon {
        margin-bottom: 12px;
      }

      .uploadText {
        font-size: 14px;
        margin: 0 0 8px;
      }

      .uploadHint {
        font-size: 12px;
        margin: 0;
      }
    }
    .to2Box {
      height: 100%;
    }
    .formItem {
      .label {
        font-weight: 500;
        margin-bottom: 8px;
      }
      .footerInfo {
        font-size: 12px;
        .tips.warn {
          margin-left: 8px;
        }
      }
    }
  }
}
.ellipsisText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  max-width: 100%;
}
.selectedInfo {
  margin-top: 12px;
  font-size: 14px;
}
</style>
