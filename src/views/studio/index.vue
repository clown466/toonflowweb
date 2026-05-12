<template>
  <div class="studio-page">
    <StudioHeader
      :title="project?.name || '未命名项目'"
      :current-episode="currentEpisode"
      :episodes="episodes"
      @episode-change="handleEpisodeChange"
      @refresh="refreshData"
    />

    <div class="studio-body" :style="studioLayoutStyle">
      <t-button
        v-if="!leftPanelOpen"
        class="floating-toggle left-toggle"
        shape="square"
        theme="primary"
        @click="leftPanelOpen = true"
      >
        <template #icon><i-menu-unfold-one size="18" /></template>
      </t-button>
      <t-button
        v-if="!rightPanelOpen"
        class="floating-toggle right-toggle"
        shape="square"
        theme="primary"
        @click="rightPanelOpen = true"
      >
        <template #icon><i-menu-fold-one size="18" /></template>
      </t-button>

      <div v-show="leftPanelOpen" class="studio-floating-panel story-floating-panel">
        <t-button class="panel-close-btn story-close" shape="square" variant="text" size="small" @click="leftPanelOpen = false">
          <template #icon><i-menu-fold-one size="16" /></template>
        </t-button>
        <StoryPanel
          v-model:selected-id="selectedStoryboardId"
          v-model:selected-ids="selectedStoryboardIds"
          v-model:panel-width="leftPanelWidth"
          :storyboard="flowData.storyboard"
          :loading="loading"
          @select="onStoryboardSelect"
          @preview="onPreviewStoryboard"
          @select-all="onSelectAll"
          @generate-all="onGenerateAll"
          @generate-director-board="onGenerateDirectorBoard"
          @retry="onRetryStoryboard"
          @retry-failed="onRetryFailedStoryboards"
        />
      </div>

      <div class="studio-center">
        <div class="studio-canvas-wrap">
          <Suspense>
            <ProductionFlowCanvas
              embedded
              show-embedded-toolbar
              :show-assistant="false"
              :show-canvas-controls="false"
            />
            <template #fallback>
              <div class="canvas-loading">
                <t-loading size="small" text="正在加载画布" />
              </div>
            </template>
          </Suspense>
        </div>
        <button
          class="asset-panel-toggle"
          :class="{ open: assetPanelOpen }"
          :style="{ bottom: assetPanelOpen ? assetPanelHeight + 8 + 'px' : '12px' }"
          @click="assetPanelOpen = !assetPanelOpen"
        >
          <i-pic size="14" />
          <span>资产 {{ studioAssets.length }}</span>
          <i-up v-if="!assetPanelOpen" size="14" />
          <i-down v-else size="14" />
        </button>
        <div v-if="assetPanelOpen" class="studio-assets-shell">
          <FilePanel
            v-model:panel-height="assetPanelHeight"
            :assets="studioAssets"
            :storyboard="flowData.storyboard"
            :project-id="project?.id"
            :image-model="project?.imageModel"
            :image-quality="project?.imageQuality"
            :loading="assetLoading"
            :error-message="assetError"
            @select-asset="onAssetSelect"
            @select-storyboard="onStoryboardSelectById"
            @preview-asset="onAssetPreview"
            @repaint-asset="onAssetRepaint"
            @refresh-assets="loadProjectAssets"
            @asset-image-changed="loadProjectAssets"
            @collapse="assetPanelOpen = false"
          />
        </div>
      </div>

      <div v-show="rightPanelOpen" class="studio-floating-panel agent-floating-panel">
        <t-button class="panel-close-btn agent-close" shape="square" variant="text" size="small" @click="rightPanelOpen = false">
          <template #icon><i-menu-unfold-one size="16" /></template>
        </t-button>
        <AgentPanel
          v-model:mode="agentMode"
          v-model:panel-width="rightPanelWidth"
          :connected="activeAgent.connected"
          :messages="activeAgent.messages"
          :status="activeAgent.status"
          :loading-history="activeAgent.loadingHistory"
          :think-level="activeAgent.thinkLevel"
          :flow-data="flowData"
          :project-name="project?.name"
          :image-model="project?.imageModel"
          :video-model="project?.videoModel"
          :episodes-count="episodes.length"
          :selected-storyboard-id="selectedStoryboardId"
          :selected-storyboard-ids="selectedStoryboardIds"
          :selected-asset-id="selectedAssetId"
          :selected-asset="selectedAsset"
          :selected-elements="selectedElements"
          :current-episode="currentEpisode"
          @select-storyboard="onStoryboardSelectById"
          @select-asset="onAgentAssetSelect"
          @send="handleAgentSend"
          @stop="handleAgentStop"
          @clear-memory="handleClearMemory"
          @reconnect="handleReconnect"
          @update-think-config="handleUpdateThinkConfig"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import projectStore from "@/stores/project";
import productionAgentStore from "@/stores/productionAgent";
import useWorkspaceAgentStore from "@/stores/workspaceAgent";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";
import { DialogPlugin } from "tdesign-vue-next";
import StudioHeader from "./components/StudioHeader.vue";
import StoryPanel from "./components/StoryPanel.vue";
import FilePanel from "./components/FilePanel.vue";
import AgentPanel from "./components/AgentPanel.vue";

const ProductionFlowCanvas = defineAsyncComponent(() => import("@/views/production/index.vue"));

const { project } = storeToRefs(projectStore());
const prodStore = productionAgentStore();
const workspaceStore = useWorkspaceAgentStore();
const prodRefs = storeToRefs(prodStore);
const workspaceRefs = storeToRefs(workspaceStore);
const { flowData, episodesId } = prodRefs;
provide("episodesId", episodesId);

type AgentMode = "workspace" | "production";
const agentMode = ref<AgentMode>("workspace");

const activeAgent = computed(() => {
  const refs = agentMode.value === "workspace" ? workspaceRefs : prodRefs;
  return {
    connected: refs.connected.value,
    messages: refs.messages.value,
    status: refs.status.value,
    loadingHistory: refs.loadingHistory.value,
    thinkLevel: refs.thinkLevel.value,
  };
});

interface Episode {
  id: number;
  name: string;
}
const episodes = ref<Episode[]>([]);
const currentEpisode = computed(() => episodes.value.find(e => e.id === episodesId.value));

type ProductionDataUpdatedPayload = {
  type?: string;
  projectId?: number | string;
  episodesId?: number;
  scriptId?: number;
  scriptName?: string;
  createdCount?: number;
  storyboardIds?: number[];
  directorBoardIds?: number[];
  trackId?: number;
  videoId?: number;
  stage?: "submitted" | "progress" | string;
  submitted?: number;
  assetIds?: number[];
  records?: Array<{
    id?: number;
    assetId?: number;
    state: string;
    src?: string | null;
    errorReason?: string | null;
  }>;
};

// 选择状态
const selectedStoryboardId = ref<number | null>(null);
const selectedStoryboardIds = ref<number[]>([]);
const selectedAssetId = ref<number | null>(null);
const leftPanelOpen = ref(true);
const rightPanelOpen = ref(true);
const leftPanelWidth = ref(320);
const rightPanelWidth = ref(410);
const assetPanelOpen = ref(true);
const assetPanelHeight = ref(220);
const projectAssets = ref<any[]>([]);
const assetLoading = ref(false);
const assetError = ref("");

const selectedStoryboard = computed(() =>
  flowData.value.storyboard.find(s => s.id === selectedStoryboardId.value)
);
const selectedAsset = computed(() => findAssetById(selectedAssetId.value));
const studioAssets = computed(() => mergeStudioAssets(projectAssets.value, flowData.value.assets || []));
const selectedElements = computed(() => ({
  storyboardIds: selectedStoryboardIds.value,
  storyboard: selectedStoryboard.value || null,
  asset: selectedAsset.value || null,
  episode: currentEpisode.value || null,
}));
const studioLayoutStyle = computed(() => ({
  "--asset-safe-left": leftPanelOpen.value ? `${leftPanelWidth.value + 1}px` : "0px",
  "--asset-safe-right": rightPanelOpen.value ? `${rightPanelWidth.value + 1}px` : "0px",
}));
const generating = ref(false);
const loading = ref(false);
const assetProgressMessageId = ref<string | null>(null);
const assetProgressTotal = ref(0);
const assetProgressStates = new Map<number, string>();
let projectAssetsPollingTimer: number | null = null;

function ensureProductionEpisode(showMessage = true) {
  if (episodesId.value) return true;
  if (showMessage) window.$message.warning("当前项目还没有章节工作区，请先生成分镜表或选择章节工作区");
  return false;
}

function stripLargeFields<T>(value: T): T {
  const cloned = JSON.parse(JSON.stringify(value ?? null));
  const cleanAsset = (item: any) => {
    if (!item) return;
    delete item.prompt;
    delete item.flowId;
    delete item.src;
    delete item.base64;
    if (Array.isArray(item.derive)) item.derive.forEach(cleanAsset);
  };
  cloned?.assets?.forEach(cleanAsset);
  cloned?.storyboard?.forEach((item: any) => {
    delete item.prompt;
    delete item.src;
    delete item.flowId;
    delete item.base64;
  });
  return cloned;
}

function latestAttemptState(asset: any) {
  const state = asset?.latestImageState;
  return state === "生成中" || state === "生成失败" ? state : null;
}

function normalizedAssetState(asset: any) {
  return latestAttemptState(asset) ?? asset?.state ?? "未生成";
}

function normalizedAssetErrorReason(asset: any) {
  return latestAttemptState(asset) === "生成失败"
    ? asset?.latestImageErrorReason ?? asset?.errorReason ?? ""
    : asset?.errorReason ?? "";
}

function mergeAssetState(a?: string, b?: string) {
  if (a === "生成中" || b === "生成中") return "生成中";
  if (a === "生成失败" || b === "生成失败") return "生成失败";
  return a || b || "未生成";
}

function normalizeStudioAsset(asset: any) {
  const derive = asset?.derive ?? asset?.sonAssets ?? [];
  const historyImages = Array.isArray(asset?.historyImages) ? asset.historyImages : [];
  return {
    ...asset,
    desc: asset?.desc ?? asset?.describe ?? "",
    src: asset?.src ?? asset?.filePath ?? "",
    filePath: asset?.filePath ?? asset?.src ?? "",
    state: normalizedAssetState(asset),
    errorReason: normalizedAssetErrorReason(asset),
    historyImages: historyImages.map((item: any) => ({
      ...item,
      src: item?.src ?? item?.filePath ?? "",
      filePath: item?.filePath ?? item?.src ?? "",
      state: item?.state ?? "已完成",
    })),
    derive: Array.isArray(derive)
      ? derive.map((item: any) => ({
          ...item,
          assetsId: item.assetsId ?? asset?.id,
          desc: item?.desc ?? item?.describe ?? "",
          src: item?.src ?? item?.filePath ?? "",
          filePath: item?.filePath ?? item?.src ?? "",
          state: normalizedAssetState(item),
          errorReason: normalizedAssetErrorReason(item),
          historyImages: Array.isArray(item?.historyImages)
            ? item.historyImages.map((image: any) => ({
                ...image,
                src: image?.src ?? image?.filePath ?? "",
                filePath: image?.filePath ?? image?.src ?? "",
                state: image?.state ?? "已完成",
              }))
            : [],
        }))
      : [],
  };
}

function mergeStudioAssets(globalAssets: any[], flowAssets: any[]) {
  const map = new Map<number, any>();
  globalAssets.map(normalizeStudioAsset).forEach((asset) => map.set(asset.id, asset));
  flowAssets.map(normalizeStudioAsset).forEach((asset) => {
    const current = map.get(asset.id);
    if (!current) {
      map.set(asset.id, asset);
      return;
    }
    const deriveMap = new Map<number, any>();
    (current.derive || []).forEach((item: any) => deriveMap.set(item.id, item));
    (asset.derive || []).forEach((item: any) => {
      const existing = deriveMap.get(item.id);
      deriveMap.set(item.id, {
        ...item,
        ...existing,
        imageId: existing?.imageId ?? item.imageId,
        src: existing?.src || item.src,
        filePath: existing?.filePath || item.filePath,
        state: mergeAssetState(existing?.state, item.state),
        errorReason: existing?.errorReason || item.errorReason,
        historyImages: item.historyImages?.length ? item.historyImages : existing?.historyImages,
      });
    });
    map.set(asset.id, {
      ...current,
      ...asset,
      imageId: current.imageId ?? asset.imageId,
      src: current.src || asset.src,
      filePath: current.filePath || asset.filePath,
      state: mergeAssetState(current.state, asset.state),
      errorReason: current.errorReason || asset.errorReason,
      historyImages: asset.historyImages?.length ? asset.historyImages : current.historyImages,
      derive: [...deriveMap.values()],
    });
  });
  return [...map.values()];
}

async function loadProjectAssets() {
  if (!project.value?.id) {
    projectAssets.value = [];
    assetLoading.value = false;
    assetError.value = "";
    syncProjectAssetsPolling();
    return;
  }
  assetLoading.value = true;
  assetError.value = "";
  try {
    const types = ["role", "scene", "tool"];
    const responses = await Promise.all(
      types.map((type) =>
        axios.post("/assets/getAssetsApi", {
          projectId: project.value!.id,
          type,
          name: "",
          page: 1,
          limit: 500,
          includeHistoryImages: false,
        }),
      ),
    );
    projectAssets.value = responses.flatMap((res) => res.data?.data ?? []).map(normalizeStudioAsset);
  } catch (err: any) {
    console.error("[studio] loadProjectAssets failed:", err);
    assetError.value = err?.message || "资产加载失败";
  } finally {
    assetLoading.value = false;
    syncProjectAssetsPolling();
  }
}

function hasGeneratingAssetImages() {
  return projectAssets.value.some((asset) => {
    if (asset?.state === "生成中") return true;
    return (asset?.derive || []).some((derive: any) => derive?.state === "生成中");
  });
}

function syncProjectAssetsPolling() {
  if (hasGeneratingAssetImages()) {
    if (projectAssetsPollingTimer) return;
    projectAssetsPollingTimer = window.setInterval(() => {
      void loadProjectAssets();
    }, 3000);
    return;
  }
  if (projectAssetsPollingTimer) {
    clearInterval(projectAssetsPollingTimer);
    projectAssetsPollingTimer = null;
  }
}

function buildStudioWorkspaceData(key?: string) {
  const context = {
    source: "studio",
    note: "这是 /studio 前端当前工作区上下文，只用于用户当前选择/页面状态；真实项目状态仍以后端数据库工具为准。",
    projectId: project.value?.id ?? null,
    projectName: project.value?.name ?? null,
    activeAgentMode: agentMode.value,
    activePanel: "studio",
    currentEpisode: currentEpisode.value ?? null,
    currentEpisodeId: episodesId.value ?? null,
    episodes: episodes.value,
    selectedNovelIds: [] as number[],
    selectedEventIds: [] as number[],
    selectedStoryboardId: selectedStoryboardId.value,
    selectedStoryboardIds: selectedStoryboardIds.value,
    selectedAssetId: selectedAssetId.value,
    selectedAsset: selectedAsset.value,
    selectedStoryboard: selectedStoryboard.value,
    selectedElements: selectedElements.value,
    flowSummary: {
      storyboardCount: flowData.value.storyboard?.length ?? 0,
      assetCount: studioAssets.value?.length ?? 0,
      hasScript: Boolean(flowData.value.script),
      hasScriptPlan: Boolean(flowData.value.scriptPlan),
      hasStoryboardTable: Boolean(flowData.value.storyboardTable),
    },
  };

  const dataMap: Record<string, any> = {
    studioContext: context,
    currentSelection: context.selectedElements,
    novelEvents: {
      source: "studio",
      available: false,
      selectedNovelIds: [],
      selectedEventIds: [],
      message: "当前 /studio 页面未维护小说事件列表；请以后端数据库中的 o_novel/o_eventChapter 事件分析结果为准。",
    },
    flowData: stripLargeFields(flowData.value),
    storyboard: stripLargeFields(flowData.value.storyboard),
    assets: stripLargeFields(studioAssets.value),
  };

  if (key && key in dataMap) return dataMap[key];
  return { ...context, requestedKey: key ?? null, data: key ? null : dataMap };
}

function upsertWorkspaceProgressMessage(text: string) {
  const id = assetProgressMessageId.value || `workspace_asset_progress_${Date.now()}`;
  assetProgressMessageId.value = id;
  const existing = workspaceRefs.messages.value.find((message: any) => message.id === id) as any;
  const content = [{ type: "text", status: "complete", data: text }];
  if (existing) {
    existing.content = content;
    existing.status = "complete";
    return;
  }
  workspaceRefs.messages.value.push({
    id,
    role: "assistant",
    name: "项目总控",
    status: "complete",
    datetime: new Date().toISOString(),
    content,
  } as any);
}

function updateAssetProgressNotice(payload: ProductionDataUpdatedPayload) {
  if (payload.stage === "submitted") {
    assetProgressStates.clear();
    assetProgressTotal.value = payload.submitted ?? payload.records?.length ?? payload.assetIds?.length ?? 0;
    payload.assetIds?.forEach((id) => assetProgressStates.set(id, "生成中"));
  }
  payload.records?.forEach((record) => {
    const id = Number(record.assetId ?? record.id);
    if (Number.isFinite(id)) assetProgressStates.set(id, record.state);
  });
  assetProgressTotal.value = Math.max(assetProgressTotal.value, assetProgressStates.size);
  const completed = Array.from(assetProgressStates.values()).filter((state) => state === "已完成").length;
  const failed = Array.from(assetProgressStates.values()).filter((state) => state === "生成失败").length;
  const generatingCount = Math.max(assetProgressTotal.value - completed - failed, 0);
  if (payload.stage === "submitted") {
    upsertWorkspaceProgressMessage(`已提交 ${assetProgressTotal.value} 个资产图生成任务。下方资产区已开始显示生成中状态，我会继续同步完成/失败状态。`);
    return;
  }
  if (completed > 0 || failed > 0) {
    upsertWorkspaceProgressMessage(`资产图生成进度：完成 ${completed}/${assetProgressTotal.value}，失败 ${failed}，生成中 ${generatingCount}。下方资产区会同步刷新。`);
  }
}

function isProductionToolUpdate(payload: ProductionDataUpdatedPayload) {
  return ["director_boards", "video_prompt", "video_generation"].includes(String(payload.type || ""));
}

function productionToolUpdateMessage(payload: ProductionDataUpdatedPayload) {
  if (payload.type === "director_boards") {
    if (payload.stage === "director_boards_planned") return "章节导演板提示词已生成，画布数据已刷新。";
    if (payload.stage === "director_board_regenerating") return `导演板${payload.directorBoardIds?.[0] ? ` #${payload.directorBoardIds[0]}` : ""}已提交重绘，画布数据已刷新。`;
    return `章节导演板已提交生成${payload.directorBoardIds?.length ? `（${payload.directorBoardIds.length} 张）` : ""}，画布数据已刷新。`;
  }
  if (payload.type === "video_prompt") {
    return `视频提示词已生成${payload.trackId ? `并写入轨道 #${payload.trackId}` : ""}，画布数据已刷新。`;
  }
  if (payload.type === "video_generation") {
    return `视频生成任务已提交${payload.videoId ? `（视频 #${payload.videoId}）` : ""}，画布数据已刷新。`;
  }
  return "生产数据已刷新。";
}

async function refreshProductionWorkspace(payload: ProductionDataUpdatedPayload, options: { selectFirstStoryboard?: boolean } = {}) {
  await loadEpisodes();
  const targetEpisodeId = payload.episodesId ?? payload.scriptId;
  if (!targetEpisodeId) return;
  const switchedEpisode = Number(targetEpisodeId) !== Number(episodesId.value ?? 0);
  prodStore.episodesId = targetEpisodeId;
  prodStore.updateContext?.();
  if (switchedEpisode) {
    selectedStoryboardId.value = null;
    selectedStoryboardIds.value = [];
  }
  await prodStore.getFlowData();
  if (options.selectFirstStoryboard) {
    const firstStoryboardId = payload.storyboardIds?.[0] ?? flowData.value.storyboard[0]?.id;
    selectedStoryboardId.value = firstStoryboardId ?? null;
    selectedStoryboardIds.value = firstStoryboardId ? [firstStoryboardId] : [];
  }
}

function registerWorkspacePlanDataHandler() {
  const s = workspaceRefs.socket.value;
  if (!s) return;
  s.off("getPlanData");
  s.off("productionDataUpdated");
  s.on("getPlanData", (payload: { key?: string } | undefined, callback: (response: any) => void) => {
    const key = payload?.key;
    callback(buildStudioWorkspaceData(key));
  });
  s.on("productionDataUpdated", async (payload: ProductionDataUpdatedPayload) => {
    if (String(payload?.projectId ?? "") !== String(project.value?.id ?? "")) return;
    if (payload?.type === "asset_images") {
      if (payload.assetIds?.length) prodStore.markAssetImagesGenerating?.(payload.assetIds);
      if (payload.records?.length) prodStore.applyAssetImageRecords?.(payload.records as any);
      updateAssetProgressNotice(payload);
      await loadProjectAssets();
      if (payload.stage === "submitted" && episodesId.value) {
        await prodStore.getFlowData();
      }
      return;
    }
    if (isProductionToolUpdate(payload)) {
      await refreshProductionWorkspace(payload);
      window.$message.success(productionToolUpdateMessage(payload));
      return;
    }
    if (payload?.episodesId) {
      await refreshProductionWorkspace(payload, { selectFirstStoryboard: true });
      if (payload.stage === "workspace_resolved") {
        window.$message.success(`已切换到${payload.scriptName ? `「${payload.scriptName}」` : "目标章节工作区"}，正在生成分镜`);
      } else {
        window.$message.success(payload.createdCount ? `Flova 已生成 ${payload.createdCount} 个分镜` : "已切换到已有章节工作区");
      }
    }
  });
}

function syncWorkspaceAgentContext() {
  const s = workspaceRefs.socket.value;
  const projectId = project.value?.id;
  if (!s || !projectId) return;
  s.emit("updateContext", {
    isolationKey: `${projectId}:workspaceAgent`,
    projectId,
    scriptId: episodesId.value ?? null,
  });
}

watch(
  () => workspaceRefs.socket.value,
  () => {
    registerWorkspacePlanDataHandler();
    syncWorkspaceAgentContext();
  },
  { immediate: true },
);

watch(
  () => [project.value?.id, episodesId.value, workspaceRefs.connected.value] as const,
  () => syncWorkspaceAgentContext(),
);

watch(
  () => project.value?.id,
  () => {
    void loadProjectAssets();
  },
);

function handleAssetsUpdated(event: Event) {
  const detail = (event as CustomEvent<{ projectId?: string | number }>).detail;
  if (detail?.projectId && String(detail.projectId) !== String(project.value?.id ?? "")) return;
  void loadProjectAssets();
}

onMounted(async () => {
  window.addEventListener("toonflow-assets-updated", handleAssetsUpdated);
  await Promise.all([loadEpisodes(), loadProjectAssets()]);
  if (episodes.value.length > 0 && !episodesId.value) {
    prodStore.episodesId = episodes.value[0].id;
  }
  workspaceStore.connect();
  workspaceStore.getHistory?.();
  if (episodesId.value) {
    prodStore.connect();
    prodStore.getHistory?.();
    await prodStore.getFlowData();
  }
  if (flowData.value.storyboard.length > 0) {
    selectedStoryboardId.value = flowData.value.storyboard[0].id || null;
  }
});

onActivated(() => {
  void loadProjectAssets();
});

onUnmounted(() => {
  window.removeEventListener("toonflow-assets-updated", handleAssetsUpdated);
  if (projectAssetsPollingTimer) {
    clearInterval(projectAssetsPollingTimer);
    projectAssetsPollingTimer = null;
  }
  workspaceStore.disconnect();
  prodStore.disconnect();
});

async function loadEpisodes() {
  try {
    const { data } = await axios.post("/script/getScrptApi", {
      projectId: project.value?.id,
      includeFlovaProductionContainer: true,
    });
    episodes.value = data || [];
  } catch (err) {
    console.error("[studio] loadEpisodes failed:", err);
  }
}

function handleEpisodeChange(id: number) {
  prodStore.episodesId = id;
  prodStore.updateContext?.();
  if (ensureProductionEpisode(false)) prodStore.getFlowData();
  void loadProjectAssets();
}

function refreshData() {
  if (episodesId.value) prodStore.getFlowData();
  void loadProjectAssets();
  if (agentMode.value === "workspace") workspaceStore.getHistory?.();
}

// StoryPanel 事件
function onStoryboardSelect(item: any) {
  selectedStoryboardId.value = item.id;
}

function onStoryboardSelectById(id: number) {
  selectedStoryboardId.value = id;
  if (id && !selectedStoryboardIds.value.includes(id)) {
    selectedStoryboardIds.value = [id];
  }
}

function onPreviewStoryboard(items: any[]) {
  if (items.length > 0) selectedStoryboardId.value = items[0].id;
}

function onSelectAll(ids: number[]) {
  selectedStoryboardIds.value = ids;
}

async function onGenerateAll(items: any[]) {
  if (!ensureProductionEpisode()) return;
  const ids = items.map((i: any) => i.id).filter(Boolean);
  if (ids.length === 0) return;

  generating.value = true;
  try {
    await prodStore.batchGenerateStoryboard(ids);
    window.$message.success(`已提交 ${ids.length} 个首帧分镜图生成任务`);
  } catch (err: any) {
    console.error("[studio] generate storyboard failed:", err);
    window.$message.error(err?.message || "首帧分镜图生成失败");
  } finally {
    generating.value = false;
  }
}

type DirectorBoardType = "continuity" | "textStoryboard" | "hybridStoryboard" | "spatialSixPanel";

async function onGenerateDirectorBoard(items: any[], boardType: DirectorBoardType = "hybridStoryboard") {
  if (!ensureProductionEpisode()) return;
  const ids = items.map((i: any) => Number(i.id)).filter((id: number) => Number.isFinite(id) && id > 0);
  if (ids.length === 0 || !project.value?.id || !episodesId.value) return;

  generating.value = true;
  try {
    const { data } = await axios.post("/production/directorBoard/generate", {
      projectId: Number(project.value.id),
      scriptId: Number(episodesId.value),
      storyboardIds: ids,
      boardType,
      shotsPerBoard: 6,
      replace: true,
      generateImages: false,
    });
    window.dispatchEvent(new CustomEvent("toonflow-director-boards-updated", {
      detail: {
        projectId: Number(project.value.id),
        scriptId: Number(episodesId.value),
      },
    }));
    window.$message.success(`已创建 ${(data ?? []).length || Math.ceil(ids.length / 6)} 张章节导演板草案，点击单张“生成”再出图`);
  } catch (err: any) {
    console.error("[studio] generate director board failed:", err);
    window.$message.error(err?.message || "章节导演板生成失败");
  } finally {
    generating.value = false;
  }
}

async function onRetryStoryboard(item: any) {
  if (!item.id) return;
  await onGenerateAll([item]);
}

async function onRetryFailedStoryboards(ids: number[]) {
  if (ids.length === 0) {
    window.$message.info("没有失败分镜可重试");
    return;
  }
  await onGenerateAll(ids.map(id => ({ id })));
}

function findAssetById(id: number | null) {
  if (!id) return null;
  for (const asset of studioAssets.value || []) {
    if (asset.id === id) return asset;
    const derive = asset.derive?.find((item: any) => item.id === id);
    if (derive) return { ...derive, parentAsset: asset };
  }
  return null;
}

// FilePanel 事件
function onAssetSelect(asset: any) {
  selectedAssetId.value = asset.id;
  console.log("[studio] asset selected", asset);
}

function onAgentAssetSelect(id: number) {
  selectedAssetId.value = id;
}

function onAssetPreview(asset: any) {
  console.log("[studio] asset preview", asset);
}

async function onAssetRepaint(derive: any) {
  if (!derive?.id) return;
  if (!ensureProductionEpisode()) return;
  generating.value = true;
  try {
    await prodStore.batchGenerateAssets([derive.id]);
    window.$message.success(`已提交资产「${derive.name || derive.id}」重绘任务`);
  } catch (err: any) {
    console.error("[studio] repaint asset failed:", err);
    window.$message.error(err?.message || "资产重绘失败");
  } finally {
    generating.value = false;
  }
}

// PreviewPanel 事件
async function onPreviewGenerate() {
  if (!selectedStoryboardId.value) {
    window.$message.warning("请先选择一个分镜");
    return;
  }
  await onGenerateAll([{ id: selectedStoryboardId.value }]);
}

async function onPreviewRetry() {
  if (!selectedStoryboardId.value) return;
  await onRetryStoryboard({ id: selectedStoryboardId.value });
}

function onPreviewEdit() {
  window.$message.info("编辑功能即将支持，请使用 Agent 对话修改");
}

function onCreateFirst() {
  window.$message.info("请在左侧分镜列表中创建第一个分镜，或让 Agent 帮你生成分镜表");
}

// Agent 相关
function currentStore() {
  return agentMode.value === "workspace" ? workspaceStore : prodStore;
}

function handleAgentSend(text: string, displayText?: string) {
  if (agentMode.value === "production" && !ensureProductionEpisode()) return;
  currentStore().chat(text, undefined, displayText);
}

function handleAgentStop() {
  currentStore().stopGenerate();
}

async function handleClearMemory(type: "message" | "summary" | "all") {
  try {
    if (agentMode.value === "workspace") {
      await workspaceStore.clearMemory(type);
    } else {
      if (!ensureProductionEpisode()) return;
      await axios.post(`/agents/clearMemory`, {
        projectId: project.value?.id,
        agentType: "productionAgent",
        episodesId: episodesId.value,
        type,
      });
      window.$message.success("记忆已清除");
      prodStore.getHistory();
    }
  } catch (err: any) {
    console.error("[studio] clearMemory failed:", err);
    window.$message.error(err?.message || "操作失败");
  }
}

function handleReconnect() {
  if (agentMode.value === "production" && !ensureProductionEpisode()) return;
  const dialog = DialogPlugin.confirm({
    header: "重新连接",
    body: "确定要重新连接 Agent 吗？",
    confirmBtn: "确定",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: () => {
      currentStore().reconnect?.();
      currentStore().getHistory?.();
      dialog.destroy();
    },
  });
}

function handleUpdateThinkConfig(value: number) {
  if (agentMode.value === "production" && !episodesId.value) return;
  currentStore().updateThinkConfig?.(value);
}

watch(() => flowData.value.storyboard, (newVal) => {
  if (newVal.length > 0 && !selectedStoryboardId.value) {
    selectedStoryboardId.value = newVal[0].id || null;
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
.studio-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--td-bg-color-page);
  overflow: hidden;
}

.studio-body {
  position: relative;
  display: flex;
  flex: 1;
  overflow: hidden;
  background-color: var(--td-border-level-1-color);
}

.studio-center {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--td-border-level-1-color);
}

.studio-canvas-wrap {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background-color: var(--td-bg-color-page);
}

.canvas-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--td-text-color-secondary);
}

.studio-assets-shell {
  flex-shrink: 0;
  min-width: 0;
  margin-left: var(--asset-safe-left);
  margin-right: var(--asset-safe-right);
  transition: margin 0.2s ease;
}

.asset-panel-toggle {
  position: absolute;
  left: var(--asset-safe-left);
  right: var(--asset-safe-right);
  z-index: 32;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: max-content;
  height: 30px;
  margin-inline: auto;
  padding: 0 12px;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 16px;
  background-color: var(--td-bg-color-container);
  color: var(--td-text-color-primary);
  box-shadow: var(--td-shadow-2);
  cursor: pointer;
  font-size: 12px;
  transition: left 0.2s ease, right 0.2s ease, bottom 0.2s ease, background-color 0.2s ease;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  &.open {
    border-color: var(--td-brand-color);
    color: var(--td-brand-color);
  }
}

.studio-floating-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  min-height: 0;
  box-shadow: var(--td-shadow-3);
  border: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-container);
}

.story-floating-panel {
  left: 0;
}

.agent-floating-panel {
  right: 0;
}

.panel-close-btn {
  position: absolute;
  top: 8px;
  z-index: 35;
}

.story-close {
  right: 8px;
}

.agent-close {
  left: 8px;
}

.floating-toggle {
  position: absolute;
  top: 8px;
  z-index: 40;
  box-shadow: var(--td-shadow-2);
}

.left-toggle {
  left: 8px;
}

.right-toggle {
  right: 8px;
}

.story-floating-panel :deep(.story-panel),
.agent-floating-panel :deep(.agent-panel) {
  height: 100%;
  box-shadow: none;
}

.story-floating-panel :deep(.story-panel) {
  border-right: 1px solid var(--td-border-level-1-color);
}

.agent-floating-panel :deep(.agent-panel) {
  border-left: 1px solid var(--td-border-level-1-color);
}

.story-floating-panel :deep(.story-panel .panel-header) {
  padding-right: 48px;
}

.agent-floating-panel :deep(.agent-panel .panel-header) {
  padding-left: 48px;
}

@media (max-width: 960px) {
  .studio-center {
    --asset-safe-left: 0px !important;
    --asset-safe-right: 0px !important;
  }

  .studio-floating-panel {
    top: 0;
    bottom: 0;
  }

  .story-floating-panel {
    left: 0;
    right: 56px;
  }

  .agent-floating-panel {
    left: 56px;
    right: 0;
  }
}
</style>
