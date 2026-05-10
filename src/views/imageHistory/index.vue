<template>
  <div class="imageHistory">
    <div class="header">
      <div class="headerInfo">
        <h2>历史出图</h2>
        <p>查看资产图、分镜图、章节导演板的历史生成结果</p>
      </div>
      <t-button @click="getImageHistory" :loading="loading">
        <template #icon>
          <i-redo :size="18" />
        </template>
        刷新
      </t-button>
    </div>

    <div class="filters">
      <t-select label="项目：" v-model="projectId" :options="projectOptions" @change="onFilterChange" />
      <t-select label="类型：" v-model="source" :options="sourceOptions" @change="onFilterChange" />
      <t-select label="状态：" v-model="state" :options="stateOptions" @change="onFilterChange" />
    </div>

    <t-loading :loading="loading">
      <div v-if="items.length" class="historyGrid">
        <div v-for="item in items" :key="item.id" class="historyItem">
          <div class="thumb" @click="preview(item)">
            <img v-if="item.src && !imageErrors[item.id]" :src="item.src" :alt="item.title" loading="lazy" @error="imageErrors[item.id] = true" />
            <div v-else class="thumbFallback">
              <i-pic size="32" />
              <span>{{ item.state === "生成失败" ? "生成失败" : "暂无图片" }}</span>
            </div>
          </div>
          <div class="meta">
            <div class="titleLine">
              <span class="titleText">{{ item.title }}</span>
              <t-tag size="small" :theme="sourceTheme(item.source)" variant="light">{{ item.sourceLabel }}</t-tag>
            </div>
            <div class="subLine">{{ item.projectName }}<span v-if="item.scriptName"> / {{ item.scriptName }}</span></div>
            <div class="tagLine">
              <t-tag size="small" :theme="stateTheme(item.state)" variant="light">{{ item.state || "未知" }}</t-tag>
              <t-tag v-if="item.model" size="small" theme="default" variant="light">{{ item.model }}</t-tag>
              <t-tag v-if="item.resolution" size="small" theme="default" variant="light">{{ item.resolution }}</t-tag>
            </div>
            <div class="prompt">{{ item.prompt || item.errorReason || "无提示词记录" }}</div>
            <div class="actions">
              <t-button size="small" variant="outline" :disabled="!item.previewSrc" @click="preview(item)">预览</t-button>
              <t-button size="small" variant="text" :disabled="!item.prompt" @click="copyPrompt(item.prompt)">复制提示词</t-button>
            </div>
          </div>
        </div>
      </div>
      <t-empty v-else title="暂无历史出图" description="当前筛选条件下没有已记录的出图结果" />
    </t-loading>

    <t-pagination
      class="pagination"
      v-model:current="pagination.page"
      v-model:pageSize="pagination.limit"
      show-sizer
      :total="pagination.total"
      @page-size-change="getImageHistory"
      @current-change="getImageHistory" />

    <t-image-viewer v-model:visible="previewVisible" :images="previewImages" :closeOnEscKeydown="true" :closeOnOverlay="true" />
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

type ImageHistorySource = "asset" | "storyboard" | "directorBoard";

interface ImageHistoryItem {
  id: string;
  source: ImageHistorySource;
  sourceLabel: string;
  entityId: number;
  projectId: number | null;
  projectName: string;
  scriptId?: number | null;
  scriptName?: string | null;
  title: string;
  prompt?: string | null;
  model?: string | null;
  resolution?: string | null;
  state?: string | null;
  errorReason?: string | null;
  src: string;
  previewSrc: string;
}

const { project } = storeToRefs(projectStore());

const loading = ref(false);
const items = ref<ImageHistoryItem[]>([]);
const imageErrors = ref<Record<string, boolean>>({});
const previewVisible = ref(false);
const previewImages = ref<string[]>([]);
const projectId = ref<number | "">(project.value?.id || "");
const source = ref<ImageHistorySource | "">("");
const state = ref("");
const projectOptions = ref<{ label: string; value: number | "" }[]>([{ label: "全部", value: "" }]);
const pagination = ref({ page: 1, limit: 24, total: 0 });

const sourceOptions = [
  { label: "全部", value: "" },
  { label: "资产图", value: "asset" },
  { label: "分镜图", value: "storyboard" },
  { label: "章节导演板", value: "directorBoard" },
];

const stateOptions = [
  { label: "全部", value: "" },
  { label: "进行中", value: "生成中" },
  { label: "已完成", value: "已完成" },
  { label: "生成失败", value: "生成失败" },
];

onMounted(() => {
  getProjects();
  getImageHistory();
});

function onFilterChange() {
  pagination.value.page = 1;
  imageErrors.value = {};
  getImageHistory();
}

async function getProjects() {
  const { data } = await axios.post("/task/getProject").catch(() => ({ data: [] }));
  projectOptions.value = [{ label: "全部", value: "" }, ...data.map((item: any) => ({ label: item.name, value: item.id }))];
}

async function getImageHistory() {
  loading.value = true;
  try {
    const { data } = await axios.post("/history/getImageHistory", {
      projectId: projectId.value === "" ? null : projectId.value,
      source: source.value || null,
      state: state.value || null,
      page: pagination.value.page,
      limit: pagination.value.limit,
    });
    items.value = data.data ?? [];
    pagination.value.total = Number(data.total ?? 0);
  } catch (error) {
    window.$message.error((error as Error).message || "获取历史出图失败");
  } finally {
    loading.value = false;
  }
}

function preview(item: ImageHistoryItem) {
  if (!item.previewSrc) {
    window.$message.warning(item.errorReason || "当前记录没有可预览图片");
    return;
  }
  previewImages.value = [item.previewSrc];
  previewVisible.value = true;
}

async function copyPrompt(prompt?: string | null) {
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    window.$message.success("已复制提示词");
  } catch {
    window.$message.error("复制失败");
  }
}

function sourceTheme(value: ImageHistorySource) {
  if (value === "storyboard") return "primary";
  if (value === "directorBoard") return "warning";
  return "success";
}

function stateTheme(value?: string | null) {
  if (value === "生成失败") return "danger";
  if (value === "生成中") return "primary";
  return "success";
}
</script>

<style lang="scss" scoped>
.imageHistory {
  width: 100%;
  min-height: 100%;
  padding: 32px;
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
  }
  .headerInfo {
    h2 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
      color: #1f2937;
    }
    p {
      margin: 6px 0 0;
      color: #6b7280;
    }
  }
  .filters {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 20px;
    :deep(.t-select__wrap) {
      min-width: 220px;
    }
  }
  .historyGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }
  .historyItem {
    overflow: hidden;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    display: flex;
    flex-direction: column;
    min-height: 420px;
  }
  .thumb {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #f3f4f6;
    cursor: pointer;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }
  .thumbFallback {
    width: 100%;
    height: 100%;
    min-height: 146px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #9ca3af;
    font-size: 13px;
  }
  .meta {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .titleLine {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
  .titleText {
    min-width: 0;
    font-weight: 600;
    color: #111827;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .subLine {
    color: #6b7280;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tagLine {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .prompt {
    color: #374151;
    font-size: 13px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
  }
  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
