<template>
  <div class="studio-page">
    <StudioHeader
      :title="project?.name || '未命名项目'"
      :current-episode="currentEpisode"
      :episodes="episodes"
      @episode-change="handleEpisodeChange"
      @refresh="refreshData"
    />

    <div class="studio-body">
      <div class="studio-canvas">
        <ProductionFlowCanvas
          flow-id="studioFlowBox"
          embedded
          :show-episode-selector="false"
          :show-right-chat="false"
          :auto-select-first-episode="false"
        />
      </div>

      <t-button
        class="panel-float-toggle left"
        :class="{ active: leftPanelOpen }"
        shape="square"
        theme="default"
        variant="outline"
        @click="leftPanelOpen = !leftPanelOpen"
      >
        <template #icon><i-list v-if="!leftPanelOpen" size="18" /><i-close v-else size="18" /></template>
      </t-button>

      <transition name="studio-slide-left">
        <StoryPanel
          v-show="leftPanelOpen"
          class="studio-floating-panel story-floating-panel"
          :style="{ bottom: sidePanelBottom }"
          v-model:selected-id="selectedStoryboardId"
          v-model:selected-ids="selectedStoryboardIds"
          :storyboard="flowData.storyboard"
          :loading="loading"
          @select="onStoryboardSelect"
          @preview="onPreviewStoryboard"
          @select-all="onSelectAll"
          @generate-all="onGenerateAll"
          @retry="onRetryStoryboard"
          @retry-failed="onRetryFailedStoryboards"
        />
      </transition>

      <t-button
        class="panel-float-toggle right"
        :class="{ active: rightPanelOpen }"
        shape="square"
        theme="default"
        variant="outline"
        @click="rightPanelOpen = !rightPanelOpen"
      >
        <template #icon><i-robot v-if="!rightPanelOpen" size="18" /><i-close v-else size="18" /></template>
      </t-button>

      <transition name="studio-slide-right">
        <AgentPanel
          v-show="rightPanelOpen"
          class="studio-floating-panel agent-floating-panel"
          :style="{ bottom: sidePanelBottom }"
          v-model:mode="agentMode"
          :connected="activeAgent.connected"
          :messages="activeAgent.messages"
          :status="activeAgent.status"
          :loading-history="activeAgent.loadingHistory"
          :think-level="activeAgent.thinkLevel"
          :flow-data="flowData"
          :project-name="project?.name"
          :episodes-count="episodes.length"
          :image-model="currentImageModel"
          :image-model-options="imageModelOptions"
          :loading-image-models="loadingImageModels"
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
          @load-image-models="handleLoadImageModels"
          @set-image-model="handleSetImageModel"
        />
      </transition>

      <div class="asset-drawer" :class="{ collapsed: !assetsPanelOpen }" :style="{ height: assetsPanelOpen ? `${assetPanelHeight}px` : '44px' }">
        <div class="asset-drawer-tab">
          <button type="button" class="asset-tab-btn" @click="assetsPanelOpen = !assetsPanelOpen">
            <i-pic size="15" />
            <span>资产 {{ flowData.assets.length }}</span>
            <i-up v-if="assetsPanelOpen" size="14" />
            <i-down v-else size="14" />
          </button>
        </div>
        <FilePanel
          v-show="assetsPanelOpen"
          v-model:panel-height="assetPanelHeight"
          :assets="flowData.assets"
          :storyboard="flowData.storyboard"
          @select-asset="onAssetSelect"
          @select-storyboard="onStoryboardSelectById"
          @preview-asset="onAssetPreview"
          @repaint-asset="onAssetRepaint"
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
import ProductionFlowCanvas from "../production/ProductionFlowCanvas.vue";

const { project } = storeToRefs(projectStore());
const prodStore = productionAgentStore();
const workspaceStore = useWorkspaceAgentStore();
const prodRefs = storeToRefs(prodStore);
const workspaceRefs = storeToRefs(workspaceStore);
const { flowData, episodesId } = prodRefs;

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
  createdCount?: number;
  storyboardIds?: number[];
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

const selectedStoryboard = computed(() =>
  flowData.value.storyboard.find(s => s.id === selectedStoryboardId.value)
);
const selectedAsset = computed(() => findAssetById(selectedAssetId.value));
const selectedElements = computed(() => ({
  storyboardIds: selectedStoryboardIds.value,
  storyboard: selectedStoryboard.value || null,
  asset: selectedAsset.value || null,
  episode: currentEpisode.value || null,
}));
const generating = ref(false);
const loading = ref(false);
const leftPanelOpen = ref(true);
const rightPanelOpen = ref(true);
const assetsPanelOpen = ref(true);
const assetPanelHeight = ref(240);
const sidePanelBottom = computed(() => assetsPanelOpen.value ? `${assetPanelHeight.value + 28}px` : "58px");
const assetProgressMessageId = ref<string | null>(null);
const assetProgressTotal = ref(0);
const assetProgressStates = new Map<number, string>();

// 图像模型状态
const imageModelOptions = ref<any[]>([]);
const loadingImageModels = ref(false);
const currentImageModel = computed(() => workspaceRefs.currentImageModel.value || undefined);

async function handleLoadImageModels() {
  if (agentMode.value !== "workspace") return;
  loadingImageModels.value = true;
  try {
    await workspaceStore.getImageModels();
    imageModelOptions.value = workspaceStore.imageModels;
  } catch (err) {
    console.error("[Studio] handleLoadImageModels error:", err);
  } finally {
    loadingImageModels.value = false;
  }
}

async function handleSetImageModel(model: string) {
  try {
    await workspaceStore.setImageModel(model);
    window.$message.success("图像模型已更新");
  } catch (err) {
    console.error("[Studio] handleSetImageModel error:", err);
    window.$message.error("更新图像模型失败");
  }
}

function ensureProductionEpisode(showMessage = true) {
  if (episodesId.value) return true;
  if (showMessage) window.$message.warning("当前项目还没有可生产的剧集，请先生成或选择剧集");
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
      assetCount: flowData.value.assets?.length ?? 0,
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
    assets: stripLargeFields(flowData.value.assets),
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
      if (!flowData.value.assets?.length) await prodStore.getFlowData();
      if (payload.assetIds?.length) prodStore.markAssetImagesGenerating?.(payload.assetIds);
      if (payload.records?.length) prodStore.applyAssetImageRecords?.(payload.records as any);
      updateAssetProgressNotice(payload);
      return;
    }
    await loadEpisodes();
    if (payload?.episodesId) {
      prodStore.episodesId = payload.episodesId;
      prodStore.updateContext?.();
      await prodStore.getFlowData();
      const firstStoryboardId = payload.storyboardIds?.[0] ?? flowData.value.storyboard[0]?.id;
      selectedStoryboardId.value = firstStoryboardId ?? null;
      selectedStoryboardIds.value = firstStoryboardId ? [firstStoryboardId] : [];
      window.$message.success(payload.createdCount ? `Flova 已生成 ${payload.createdCount} 个分镜` : "已切换到已有分镜剧集");
    }
  });
}

watch(
  () => workspaceRefs.socket.value,
  () => registerWorkspacePlanDataHandler(),
  { immediate: true },
);

onMounted(async () => {
  await loadEpisodes();
  if (episodes.value.length > 0 && !episodesId.value) {
    prodStore.episodesId = episodes.value[0].id;
  }
  workspaceStore.connect();
  workspaceStore.getHistory?.();
  if (episodesId.value) {
    prodStore.connect();
    prodStore.getHistory?.();
    await prodStore.getFlowData();
  } else {
    await prodStore.getFlowData();
  }
  if (flowData.value.storyboard.length > 0) {
    selectedStoryboardId.value = flowData.value.storyboard[0].id || null;
  }
});

onUnmounted(() => {
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
}

function refreshData() {
  prodStore.getFlowData();
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
    window.$message.success(`已提交 ${ids.length} 个分镜生成任务`);
  } catch (err: any) {
    console.error("[studio] generate storyboard failed:", err);
    window.$message.error(err?.message || "分镜生成失败");
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
  for (const asset of flowData.value.assets || []) {
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

// Agent 相关
function currentStore() {
  return agentMode.value === "workspace" ? workspaceStore : prodStore;
}

function handleAgentSend(text: string) {
  if (agentMode.value === "production" && !ensureProductionEpisode()) return;
  currentStore().chat(text);
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
  height: calc(100vh - var(--td-comp-size-xxxl, 48px));
  background-color: var(--td-bg-color-page);
  overflow: hidden;
}

.studio-body {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: var(--td-bg-color-page);
}

.studio-canvas {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  background-color: var(--td-bg-color-container);
}

.studio-floating-panel {
  position: absolute !important;
  top: 12px;
  bottom: 58px;
  z-index: 20;
  overflow: hidden;
  border: 1px solid var(--td-border-level-1-color);
  box-shadow: var(--td-shadow-3);
}

.story-floating-panel {
  left: 12px;
  border-radius: 8px;
}

.agent-floating-panel {
  right: 12px;
  border-radius: 8px;
}

.panel-float-toggle {
  position: absolute;
  top: 14px;
  z-index: 35;
  background-color: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-2);

  &.left {
    left: 16px;
  }

  &.right {
    right: 16px;
  }

  &.active.left {
    left: 348px;
  }

  &.active.right {
    right: 438px;
  }
}

.asset-drawer {
  position: absolute;
  left: 72px;
  right: 72px;
  bottom: 12px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  min-height: 44px;
  max-height: min(46vh, 420px);
  overflow: visible;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 8px;
  background-color: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-3);
  transition: height 0.2s ease;

  &.collapsed {
    left: 50%;
    right: auto;
    width: 180px;
    transform: translateX(-50%);
    overflow: hidden;
  }

  :deep(.file-panel) {
    height: 100% !important;
    min-height: 0;
    border-top: 0;
    border-radius: 0 0 8px 8px;
  }
}

.asset-drawer-tab {
  display: flex;
  justify-content: center;
  height: 0;
  pointer-events: none;
}

.asset-tab-btn {
  position: relative;
  top: -34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 999px;
  background: var(--td-bg-color-container);
  color: var(--td-text-color-primary);
  font-size: 12px;
  box-shadow: var(--td-shadow-2);
  cursor: pointer;
  pointer-events: auto;
}

.studio-slide-left-enter-active,
.studio-slide-left-leave-active,
.studio-slide-right-enter-active,
.studio-slide-right-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.studio-slide-left-enter-from,
.studio-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.studio-slide-right-enter-from,
.studio-slide-right-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 900px) {
  .studio-floating-panel {
    top: 8px;
    bottom: 56px;
    max-width: calc(100vw - 24px);
  }

  .story-floating-panel {
    left: 8px;
  }

  .agent-floating-panel {
    right: 8px;
  }

  .panel-float-toggle.active.left {
    left: 16px;
  }

  .panel-float-toggle.active.right {
    right: 16px;
  }

  .asset-drawer {
    left: 12px;
    right: 12px;
  }
}
</style>
