<template>
  <t-dialog
    :footer="false"
    :header="false"
    :closeBtn="false"
    v-model:visible="visible"
    attach="body"
    placement="center"
    mode="full-screen"
    class="fullscreenDialog">
    <div class="closure">
      <i-close-small theme="outline" size="24" fill="#4a4a4a" @click="closeFn" />
    </div>
    <VueFlow
      id="editImage"
      class="editImageCls"
      :class="{ 'asset-drop-active': assetDropActive }"
      v-model:nodes="nodes"
      v-model:edges="edges"
      :min-zoom="0.01"
      fit-view-on-init
      @connect="onConnect"
      @dragover.prevent="handleAssetDragOver"
      @dragleave="handleAssetDragLeave"
      @drop.prevent="handleAssetDrop"
      @edges-change="syncReferences">
      <template #node-upload="{ id, data }">
        <uploadNode :id="id" :data="data" @upload="syncReferences" @keep="sureNode" />
      </template>

      <template #node-generated="{ id, data }">
        <generatedNode :id="id" :data="data" :projectId="+project!.id" :context-type="type" @keep="sureNode" />
      </template>
      <template #edge-removeLine="edgeProps">
        <removeLine v-bind="edgeProps" />
      </template>
      <Background></Background>
      <Controls />

      <Panel position="top-left">
        <div class="ac" style="gap: 8px">
          <t-dropdown
            :options="[
              { content: $t('workbench.production.editImage.upload'), value: 1 },
              { content: $t('workbench.production.editImage.generate'), value: 2 },
            ]"
            @click="clickHandler">
            <t-button theme="primary" shape="circle">
              <template #icon><i-plus /></template>
            </t-button>
          </t-dropdown>
          <t-tooltip theme="primary" :content="$t('workbench.production.autoLayoutLR')">
            <t-button class="guide-layout-btn" @click="layoutGraph('LR')" variant="outline" shape="circle">
              <template #icon>
                <i-tree-diagram />
              </template>
            </t-button>
          </t-tooltip>
        </div>
      </Panel>
      <Panel v-if="canvasAssets.length" position="bottom-left">
        <div class="canvasAssetTray">
          <div class="canvasAssetTrayTitle">资产</div>
          <div class="canvasAssetTrayList">
            <button
              v-for="asset in canvasAssets"
              :key="asset.key"
              type="button"
              class="canvasAssetItem"
              draggable="true"
              :title="asset.name"
              @dragstart="onCanvasAssetDragStart($event, asset)"
            >
              <img :src="asset.src" :alt="asset.name" draggable="false" />
            </button>
          </div>
        </div>
      </Panel>
    </VueFlow>
    <storyboardImageCheck telepor v-model="storyboardVisible" :scriptId="episodesId!" @confirm="onStoryboardConfirm" @cancel="onStoryboardCancel" />
  </t-dialog>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { VueFlow, useVueFlow, Panel, type Edge } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import uploadNode from "./uploadNode.vue";
import generatedNode from "./generatedNode.vue";
import storyboardImageCheck from "@/components/storyboardImageCheck.vue";
import type { Storyboard } from "../../utils/flowBuilder";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import removeLine from "./removeLine.vue";
import projectStore from "@/stores/project";

import axios from "@/utils/axios";
import type { NodeType, UploadNodeData, GeneratedNodeData } from "../../utils/editImageType";
import { DEFAULT_EDGE_OPTIONS, createGeneratedData, cleanNodes, cleanEdges } from "../../utils/editImageType";
import { useLayout } from "../../utils/dagre";
import { v4 as uuid } from "uuid";

const episodesId = inject<Ref<number>>("episodesId");
const { project } = storeToRefs(projectStore());

// ---- storyboardImageCheck 统一管理 ----
const storyboardVisible = ref(false);
let storyboardResolve: ((rows: Storyboard[]) => void) | null = null;

provide("openStoryboardCheck", openStoryboardCheck);

const { toObject, fromObject, fitView, screenToFlowCoordinate } = useVueFlow({ id: "editImage" });
const { layout } = useLayout("editImage");

const props = withDefaults(
  defineProps<{
    flowData: {
      flowId?: number | null;
      resultImages: { src: string; prompt: string }[]; // 结果图 url 和提示词
      referanceImages: string[]; // 参考图url
    };
    type?: string;
    assetsData?: any[];
  }>(),
  {
    flowData: () => ({
      resultImages: [],
      referanceImages: [],
    }),
  },
);

const emit = defineEmits(["save"]);

const visible = defineModel({
  type: Boolean,
  default: false,
});
const { addEdges, getNodes, getEdges, updateNodeData } = useVueFlow("editImage");

const nodes = ref<NodeType[]>([]);
const edges = ref<Edge<any, any, string>[]>([]);
const assetDropActive = ref(false);

const canvasAssets = computed(() => {
  const result: Array<{ key: string; id: number; imageId?: number | null; name: string; type?: string; src: string; filePath?: string; prompt?: string }> = [];
  const addAsset = (asset: any, prefix: string, parent?: any) => {
    const src = asset?.src || asset?.filePath || "";
    if (!src || !asset?.id) return;
    result.push({
      key: `${prefix}-${asset.id}`,
      id: Number(asset.id),
      imageId: asset.imageId ?? null,
      name: asset.name || parent?.name || `资产 #${asset.id}`,
      type: asset.type || parent?.type || "",
      src,
      filePath: asset.filePath || "",
      prompt: asset.prompt || parent?.prompt || "",
    });
  };
  for (const asset of props.assetsData || []) {
    addAsset(asset, "asset");
    const derives = Array.isArray(asset?.derive) && asset.derive.length ? asset.derive : asset?.sonAssets || [];
    for (const derive of derives) addAsset(derive, "derive", asset);
  }
  return result;
});

// 防抖定时器
let syncTimer: ReturnType<typeof setTimeout> | null = null;
function openStoryboardCheck(): Promise<Storyboard[]> {
  storyboardVisible.value = true;
  return new Promise<Storyboard[]>((resolve) => {
    storyboardResolve = resolve;
  });
}

function onStoryboardConfirm(rows: Storyboard[]) {
  storyboardVisible.value = false;
  storyboardResolve?.(rows);
  storyboardResolve = null;
}

function onStoryboardCancel() {
  storyboardVisible.value = false;
  storyboardResolve?.([]);
  storyboardResolve = null;
}

// 根据当前连线，将 upload 节点的图片同步到 generated 节点的 references
function syncReferences() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(_doSyncReferences, 60);
}

function _doSyncReferences() {
  const allNodes = getNodes.value;
  const allEdges = getEdges.value;

  // 用 Map 预索引节点，避免重复 find（O(n) → O(1)）
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // 按 target 分组 edges，减少重复遍历
  const edgesByTarget = new Map<string, string[]>();
  for (const e of allEdges) {
    const list = edgesByTarget.get(e.target);
    if (list) list.push(e.source);
    else edgesByTarget.set(e.target, [e.source]);
  }

  // 找出所有 generated 节点并同步 references
  for (const genNode of allNodes) {
    if (genNode.type !== "generated") continue;

    const sourceIds = edgesByTarget.get(genNode.id) ?? [];
    const connectedImages = sourceIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((n) => {
        if (n.type === "upload") {
          return { image: (n.data as UploadNodeData).image || "" };
        } else if (n.type === "generated") {
          return { image: (n.data as GeneratedNodeData).generatedImage || "" };
        }
        return { image: "" };
      })
      .filter((i) => i.image);

    // 仅在数据变化时才更新，避免无效的响应式触发
    const currentRefs: { image: string }[] = (genNode.data as GeneratedNodeData).references ?? [];
    const isSame = currentRefs.length === connectedImages.length && connectedImages.every((img, idx) => currentRefs[idx]?.image === img.image);
    if (!isSame) {
      updateNodeData(genNode.id, { references: connectedImages });
    }
  }
}

// 连接处理
const onConnect = (params: any) => {
  // 禁止自己连接自己
  if (params.source === params.target) return;

  // 禁止重复连线及反向连线：A→B 或 B→A 已存在则忽略
  const isDuplicate = getEdges.value.some(
    (e) => (e.source === params.source && e.target === params.target) || (e.source === params.target && e.target === params.source),
  );
  if (isDuplicate) return;

  addEdges([
    {
      id: uuid(),
      source: params.source,
      target: params.target,
      ...DEFAULT_EDGE_OPTIONS,
    },
  ]);
  // 连线建立后立即同步
  nextTick(syncReferences);
};
function clickHandler(value: any) {
  const type = value.value === 1 ? "upload" : "generated";
  addUploadNode(type);
}
// 添加新的上传节点
const addUploadNode = (type: string, image: string = "", prompt: string = "", position?: { x: number; y: number }) => {
  const newNodeId = uuid();
  const lastNode = nodes.value.filter((n) => n.type === type).pop();
  const newY = position?.y ?? (lastNode ? lastNode.position.y + 350 : 100);
  const newX = position?.x ?? (type === "generated" ? 600 : 100);

  nodes.value.push({
    id: newNodeId,
    type,
    position: { x: newX, y: newY },
    data: type === "generated" ? createGeneratedData(image, prompt) : { image },
  } as NodeType);

  return newNodeId;
};

function parseDraggedAsset(event: DragEvent) {
  const raw = event.dataTransfer?.getData("application/x-toonflow-asset");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind !== "toonflow-asset-image" || !parsed?.src) return null;
    return parsed as { id?: number; name?: string; src: string };
  } catch {
    return null;
  }
}

function writeAssetDragData(event: DragEvent, asset: { id: number; imageId?: number | null; name?: string; type?: string; src: string; filePath?: string; prompt?: string }) {
  if (!event.dataTransfer) return;
  const payload = {
    kind: "toonflow-asset-image",
    id: asset.id,
    imageId: asset.imageId ?? null,
    name: asset.name || "",
    type: asset.type || "",
    src: asset.src,
    filePath: asset.filePath || "",
    prompt: asset.prompt || "",
  };
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-toonflow-asset", JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", `引用资产 ID: ${asset.id}，名称：${asset.name || ""}，图片：${asset.src}`);
}

function onCanvasAssetDragStart(event: DragEvent, asset: { id: number; imageId?: number | null; name?: string; type?: string; src: string; filePath?: string; prompt?: string }) {
  writeAssetDragData(event, asset);
}

function handleAssetDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("application/x-toonflow-asset")) return;
  event.dataTransfer.dropEffect = "copy";
  assetDropActive.value = true;
}

function handleAssetDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement | null;
  if (current && event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) return;
  assetDropActive.value = false;
}

function handleAssetDrop(event: DragEvent) {
  assetDropActive.value = false;
  const asset = parseDraggedAsset(event);
  if (!asset) return;
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  });
  const sourceId = addUploadNode("upload", asset.src, "", position);
  const generatedNodes = nodes.value.filter((node) => node.type === "generated");
  for (const target of generatedNodes) {
    edges.value.push({
      id: uuid(),
      source: sourceId,
      target: target.id,
      ...DEFAULT_EDGE_OPTIONS,
    });
  }
  nextTick(syncReferences);
  window.$message.success(`已加入参考图${asset.name ? `：${asset.name}` : ""}`);
}
//保存节点
async function sureNode(imageUrl: string, prompt?: string) {
  try {
    const payload = {
      nodes: cleanNodes(getNodes.value as NodeType[]),
      edges: cleanEdges(getEdges.value),
    };

    if (props.flowData.flowId) {
      await axios.post("/production/editImage/updateImageFlow", { ...payload, flowId: props.flowData.flowId });
      emit("save", { imageUrl, flowId: props.flowData.flowId, prompt });
    } else {
      const { data } = await axios.post("/production/editImage/saveImageFlow", { ...payload });
      emit("save", { imageUrl, flowId: data?.id, prompt });
    }
    visible.value = false;
  } catch (e) {
    window.$message.error((e as any).message || $t("workbench.production.editImage.saveFailed"));
  }
}
onMounted(async () => {
  try {
    if (!props.flowData.flowId) return buildFlow();
    const { data } = await axios.post("/production/editImage/getImageFlow", {
      id: props.flowData.flowId,
    });
    if (!data) return buildFlow();
    edges.value = data.edges.map((e: any) => ({ ...e, ...DEFAULT_EDGE_OPTIONS }));
    nodes.value = data.nodes;
    refreshDirectorBoardFlowFromProps();
    await nextTick();
    setTimeout(() => fitView({ duration: 300 }), 100);
  } catch (e) {
    window.$message.error((e as any).message || $t("workbench.production.editImage.fetchFailed"));
  }
});

function buildFlow() {
  const uploadIds: string[] = [];
  const generatedIds: string[] = [];
  props.flowData.referanceImages.forEach((i: string) => {
    uploadIds.push(addUploadNode("upload", i));
  });
  props.flowData.resultImages.forEach((i: { src: string; prompt: string }) => {
    generatedIds.push(addUploadNode("generated", i.src, i.prompt));
  });
  // 将每个 upload 节点连接到每个 generated 节点
  for (const sourceId of uploadIds) {
    for (const targetId of generatedIds) {
      edges.value.push({
        id: uuid(),
        source: sourceId,
        target: targetId,
        ...DEFAULT_EDGE_OPTIONS,
      });
    }
  }
  nextTick(() => {
    syncReferences();
    setTimeout(() => fitView({ duration: 300 }), 100);
  });
}

function comparableImageUrl(value: string) {
  return String(value || "")
    .replace(/^\/oss\/smallImage\//, "/")
    .replace(/^\/oss\//, "/")
    .replace(/\/smallImage\//, "/");
}

function refreshDirectorBoardFlowFromProps() {
  if (props.type !== "directorBoard") return;

  const result = props.flowData.resultImages?.[0];
  const generatedNode = nodes.value.find((node) => node.type === "generated") as NodeType | undefined;
  if (!generatedNode || generatedNode.type !== "generated") return;

  if (typeof result?.prompt === "string") {
    generatedNode.data.prompt = result.prompt;
  }
  if (result?.src) {
    generatedNode.data.generatedImage = result.src;
  }

  const existingUploadImages = new Set(
    nodes.value
      .filter((node) => node.type === "upload")
      .map((node) => comparableImageUrl((node.data as UploadNodeData).image))
      .filter(Boolean),
  );

  for (const image of props.flowData.referanceImages || []) {
    const key = comparableImageUrl(image);
    if (!key || existingUploadImages.has(key)) continue;
    const sourceId = addUploadNode("upload", image);
    edges.value.push({
      id: uuid(),
      source: sourceId,
      target: generatedNode.id,
      ...DEFAULT_EDGE_OPTIONS,
    });
    existingUploadImages.add(key);
  }

  nextTick(syncReferences);
}

function closeFn() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.production.editImage.closeConfirmTitle"),
    body: $t("workbench.production.editImage.closeConfirmBody"),
    confirmBtn: $t("common.confirm"),
    cancelBtn: $t("common.cancel"),
    onConfirm: () => {
      if (props.flowData.flowId) {
        const payload = {
          flowId: props.flowData.flowId,
          nodes: cleanNodes(getNodes.value as NodeType[]),
          edges: cleanEdges(getEdges.value),
        };
        axios.post("/production/editImage/updateImageFlow", { ...payload });
      }
      visible.value = false;
      dialog.destroy();
    },
  });
}
async function layoutGraph(direction: "LR" | "TB") {
  const oldData = toObject();
  oldData.nodes = layout(oldData.nodes, oldData.edges, direction);
  await fromObject(oldData);
  await nextTick();
  fitView({ duration: 300 });
}
</script>

<style lang="scss" scoped>
.fullscreenDialog {
  .closure {
    position: absolute;
    margin-top: 10px;
    top: var(--td-comp-paddingTB-xl);
    right: var(--td-comp-paddingLR-xxl);
    z-index: 9999;
    cursor: pointer;
  }
  .editImageCls {
    width: 100%;

    &.asset-drop-active {
      outline: 2px dashed var(--td-brand-color);
      outline-offset: -12px;
      background-color: rgba(0, 82, 217, 0.04);
    }
  }
}

:deep(.fullscreenDialog) {
  .t-dialog__header {
    display: none !important;
  }
  .t-dialog__body {
    padding: 0 !important;
  }
  .t-dialog__wrap {
    padding: 0 !important;
  }
}
.item {
  width: 45px;
  padding: 5px;
  color: var(--mainColor);
  &:hover {
    background-color: var(--td-bg-color-container-hover);
    border-radius: 4px;
    cursor: pointer;
  }
}

$handelSize: 12px;

:deep(.source) {
  height: $handelSize;
  width: $handelSize;
}
:deep(.target) {
  height: $handelSize;
  width: $handelSize;
}

.canvasAssetTray {
  width: min(520px, calc(100vw - 48px));
  padding: 8px;
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 8px;
  background: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-2);

  .canvasAssetTrayTitle {
    margin-bottom: 6px;
    color: var(--td-text-color-secondary);
    font-size: 12px;
  }

  .canvasAssetTrayList {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    max-width: 100%;
  }

  .canvasAssetItem {
    width: 48px;
    height: 48px;
    flex: 0 0 auto;
    padding: 0;
    border: 1px solid var(--td-border-level-2-color);
    border-radius: 6px;
    overflow: hidden;
    background: var(--td-bg-color-component);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }
}
</style>
