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
      <StoryPanel
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

      <div class="studio-center">
        <PreviewPanel
          :storyboard="selectedStoryboard"
          :assets="flowData.assets"
          :loading="generating"
          @generate="onPreviewGenerate"
          @retry="onPreviewRetry"
          @edit="onPreviewEdit"
          @create-first="onCreateFirst"
        />
        <FilePanel
          :assets="flowData.assets"
          :storyboard="flowData.storyboard"
          @select-asset="onAssetSelect"
          @select-storyboard="onStoryboardSelectById"
          @preview-asset="onAssetPreview"
          @repaint-asset="onAssetRepaint"
        />
      </div>

      <AgentPanel
        v-model:mode="agentMode"
        :connected="activeAgent.connected"
        :messages="activeAgent.messages"
        :status="activeAgent.status"
        :loading-history="activeAgent.loadingHistory"
        :think-level="activeAgent.thinkLevel"
        :flow-data="flowData"
        :project-name="project?.name"
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
import PreviewPanel from "./components/PreviewPanel.vue";
import FilePanel from "./components/FilePanel.vue";
import AgentPanel from "./components/AgentPanel.vue";

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

function registerWorkspacePlanDataHandler() {
  const s = workspaceRefs.socket.value;
  if (!s) return;
  s.off("getPlanData");
  s.on("getPlanData", (payload: { key?: string } | undefined, callback: (response: any) => void) => {
    const key = payload?.key;
    callback(buildStudioWorkspaceData(key));
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
  if (episodesId.value) prodStore.getFlowData();
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
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background-color: var(--td-border-level-1-color);
}

.studio-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  background-color: var(--td-border-level-1-color);
}
</style>
