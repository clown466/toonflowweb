<template>
  <t-card class="storyboard">
    <div class="titleBar dragHandle pr">
      <div class="title">{{ $t("workbench.production.node.storyboard.title") }}</div>
      <Handle :id="props.handleIds.target" type="target" :position="Position.Left" style="left: calc(-1 * var(--td-comp-paddingLR-xl))" />
      <Handle :id="props.handleIds.source" type="source" :position="Position.Right" style="right: calc(-1 * var(--td-comp-paddingLR-xl))" />
    </div>
    <div class="content">
      <t-empty v-if="!storyboard.length" style="margin-top: 16px"></t-empty>
      <t-checkbox-group v-model="selectedIds">
        <div class="frameGrid">
          <template v-for="(item, index) in storyboard" :key="item.id">
            <div class="frameItem" @mouseenter="setHoveredFrame(index)" @mouseleave="setHoveredFrame(null)">
              <div
                class="addBetween addBetween--left"
                :class="{ expanded: hoveredIndex === index }"
                @click.stop="editStoryboaryImage(item, [index > 0 ? storyboard[index - 1]?.src || '' : '', item.src || ''], index - 1)">
                <t-button theme="primary" variant="outline" shape="circle">
                  <template #icon><i-plus /></template>
                </t-button>
              </div>

              <div class="frameCard">
                <div
                  class="frameImage"
                  :style="{
                    width: `${200 * gridScale}px`,
                    height: `${200 * gridScale}px`,
                  }">
                  <div class="ac frameCheckbox" :style="{ transform: `scale(${styleMaxSize})` }">
                    <t-checkbox :checked="selectedIds.includes(item.id!)" @click.stop :key="item?.id || index" :value="item.id" />
                    <t-tag class="frameTypeTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">
                      S{{ String(index + 1).padStart(2, "0") }}
                    </t-tag>
                  </div>

                  <t-image
                    v-if="item.src && item.state == '已完成'"
                    :src="item.src"
                    fit="contain"
                    class="frameImg"
                    @click="editStoryboaryImage(item, [item.src])">
                    <template #overlayContent>
                      <div class="imageToolsWrap show">
                        <ImageTools :style="{ transform: `scale(${styleMaxSize})` }" :src="item.src" position="br" />
                      </div>
                    </template>
                  </t-image>
                  <div v-else class="generatingPlaceholder" @click="editStoryboaryImage(item, [])">
                    <t-loading v-if="item.state === '生成中'" size="small" />
                    <t-tooltip v-else-if="item.state == '生成失败'" :content="item?.reason">
                      <span style="color: #ff4d4f">生成失败</span>
                    </t-tooltip>
                    <t-empty v-else size="small" :title="$t('workbench.production.node.storyboard.notGenerated')" />
                  </div>
                  <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.deleteNode')">
                    <div class="remove ac" :style="{ transform: `scale(${styleMaxSize})` }" @click.stop="removeFn(item.id!)">
                      <i-delete theme="outline" size="18" fill="#fff" />
                    </div>
                  </t-tooltip>
                  <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.editNode')">
                    <div class="editNode ac" :style="{ transform: `scale(${styleMaxSize})` }" @click.stop="editInfo(item)">
                      <i-edit theme="outline" size="18" fill="#fff" />
                    </div>
                  </t-tooltip>
                  <t-tooltip theme="primary" content="重绘该分镜">
                    <div
                      class="redrawNode ac"
                      :class="{ disabled: item.state === '生成中' }"
                      :style="{ transform: `scale(${styleMaxSize})` }"
                      @click.stop="redrawStoryboardImage(item)"
                    >
                      <i-refresh theme="outline" size="18" fill="#fff" />
                      <span>重绘</span>
                    </div>
                  </t-tooltip>
                </div>
              </div>
              <div
                class="addBetween addBetween--right"
                :class="{ expanded: hoveredIndex === index }"
                @click.stop="
                  editStoryboaryImage(item, [item.src || '', index < (storyboard?.length ?? 0) - 1 ? storyboard[index + 1]?.src || '' : ''], index)
                ">
                <t-button theme="primary" variant="outline" shape="circle">
                  <template #icon><i-plus /></template>
                </t-button>
              </div>
            </div>
          </template>
        </div>
      </t-checkbox-group>

      <div class="scaleControl">
        <span>{{ $t("workbench.production.node.storyboard.scaleRatio") }}</span>
        <t-input-number v-model="gridScale" :min="0.1" :max="3" :step="0.1" :decimal-places="1" size="small" style="width: 120px" />
      </div>
      <div class="ac" style="gap: 6px; margin-bottom: 6px; flex-wrap: wrap">
        <t-tag theme="primary" variant="light">{{ $t("workbench.production.node.storyboard.selectedCount", { count: selectedIds.length }) }}</t-tag>
        <t-button size="small" :disabled="!storyboard.length" theme="default" variant="outline" @click="selectedIds = []">
          {{ $t("workbench.production.node.storyboard.clearSelection") }}
        </t-button>
        <t-button size="small" :disabled="!storyboard.length" theme="default" variant="outline" @click="selectAll">
          {{ $t("workbench.production.node.storyboard.selectAll") }}
        </t-button>
        <t-button theme="danger" size="small" :disabled="!storyboard.length || !selectedIds.length" @click="handleDeleteSelected">批量删除</t-button>
      </div>
      <div class="directorBoardControlRow">
        <div class="directorBoardControlItem">
          <span class="directorBoardControlLabel">导演板类型</span>
          <t-select v-model="directorBoardType" size="small" :options="directorBoardTypeOptions" />
        </div>
        <div class="directorBoardControlItem">
          <span class="directorBoardControlLabel">出图模型</span>
          <modelSelect v-model="directorBoardImageModel" type="image" size="small" placeholder="默认使用本项目出图模型" />
        </div>
      </div>
      <div class="ac" style="gap: 10px">
        <t-button block @click="previewAll" :disabled="!storyboard.length">{{ $t("workbench.production.node.storyboard.gridPreview") }}</t-button>
        <t-button block @click="batchGenerateImage" :disabled="!storyboard.length || !selectedIds.length" :loading="generateLoading">
          {{ $t("workbench.production.node.storyboard.generateImage") }}
        </t-button>
        <t-button block theme="primary" variant="outline" @click="generateDirectorBoard" :disabled="!storyboard.length" :loading="directorBoardLoading">
          创建导演板草案
        </t-button>

        <!-- <t-button block @click="batchGenerateImage" :disabled="!storyboard.length" :loading="generateLoading">
          {{ $t("workbench.production.node.storyboard.batchGenerateImage") }}
        </t-button> -->
      </div>
      <div v-if="directorBoards.length" class="directorBoardStrip">
        <div
          class="directorBoardItem"
          :class="{ clickable: board.src && board.state === '已完成' }"
          v-for="(board, index) in directorBoards"
          :key="board.id"
          @click.stop="previewDirectorBoard(board)">
          <div class="directorBoardBadge">B{{ String(index + 1).padStart(2, "0") }}</div>
          <div class="directorBoardActions">
            <t-button class="directorBoardCanvas" size="small" theme="default" variant="base" @click.stop="editDirectorBoardImage(board)">
              <template #icon><i-edit size="13" /></template>
              画布
            </t-button>
            <t-button
              class="directorBoardRedraw"
              size="small"
              theme="primary"
              variant="base"
              :loading="board.state === '生成中'"
              :disabled="board.state === '生成中'"
              @click.stop="redrawDirectorBoard(board)"
            >
              <template #icon><i-refresh size="13" /></template>
              {{ board.src && board.state === '已完成' ? '重绘' : '生成' }}
            </t-button>
          </div>
          <t-image v-if="board.src && board.state === '已完成'" :src="board.src" fit="cover" class="directorBoardImg" />
          <div v-else class="directorBoardPlaceholder">
            <t-loading v-if="board.state === '生成中'" size="small" />
            <t-tooltip v-else-if="board.state === '生成失败'" :content="board.reason || ''">
              <span class="directorBoardError">生成失败</span>
            </t-tooltip>
            <span v-else>{{ board.state || "未生成" }}</span>
          </div>
          <div class="directorBoardName">
            <span>{{ board.name || "章节导演板" }}</span>
            <t-tag size="small" variant="light">{{ directorBoardTypeLabel(board.boardType) }}</t-tag>
          </div>
        </div>
      </div>
    </div>
    <editImage v-model="visible" v-if="visible" :flowData="currentRow" :type="currentEditMode" @save="save" />
    <t-image-viewer
      v-model:visible="previewVisible"
      :images="previewImages"
      :onClose="closePreview"
      :onDownload="downLoadImage"
      :imageScale="{ max: 10, min: 0.1 }" />
  </t-card>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import editImage from "../components/editImage/index.vue";
import modelSelect from "@/components/modelSelect.vue";
import { LoadingPlugin } from "tdesign-vue-next";
import { Handle, Position, type Edge } from "@vue-flow/core";
import axios from "@/utils/axios";
import type { AssetItem, Storyboard } from "../utils/flowBuilder";
import projectStore from "@/stores/project";
import productionAgentStore from "@/stores/productionAgent";
const { project } = storeToRefs(projectStore());
const { episodesId } = storeToRefs(productionAgentStore());

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
  assetsData: AssetItem[];
}>();

const storyboard = defineModel<Storyboard[]>({ required: true });

const visible = ref(false);
const previewVisible = ref(false);
const previewImages = ref<string[]>([]);
const previewDownloadUrl = ref("");
const gridScale = useLocalStorage("storyboardGridScale", 1);

const hoveredIndex = ref<number | null>(null);
const selectedIds = ref<number[]>([]);

function setHoveredFrame(index: number | null) {
  hoveredIndex.value = index;
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(idx, 1);
  }
}

function selectAll() {
  selectedIds.value = storyboard.value.map((s) => s.id!).filter(Boolean);
}
function handleDeleteSelected() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.storyboard.confirmBatchDeleteBody", { index: selectedIds.value.length }),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        if (!selectedIds.value.length) {
          dialog.destroy();
          return window.$message.error($t("workbench.production.node.storyboard.pleaseSelectImage"));
        }
        axios.post("/production/storyboard/batchDelete", {
          ids: selectedIds.value,
          projectId: project.value?.id,
        });
        storyboard.value = storyboard.value.filter((i) => !selectedIds.value.includes(i.id!));
        selectedIds.value = [];
        window.$message.success($t("workbench.production.node.storyboard.deleteSuccess"));
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.storyboard.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}
const currentRow = ref<{
  flowId?: number | null;
  resultImages: { src: string; prompt: string }[];
  referanceImages: string[];
}>({
  flowId: null,
  resultImages: [],
  referanceImages: [],
});
const currentEditMode = ref<"storyboard" | "directorBoard">("storyboard");
const currentDirectorBoardId = ref<number | null>(null);

const tagColors = ["#5bccb3", "#9c7cfc", "#fbbf24", "#5b9afc", "#e86b6b", "#7cb8fc", "#e8a855", "#34d399"];

function closePreview() {
  previewImages.value = [];
  previewDownloadUrl.value = "";
}
async function downLoadImage() {
  if (previewDownloadUrl.value) {
    const a = document.createElement("a");
    a.href = previewDownloadUrl.value;
    a.download = `directorBoard-${Date.now()}.jpg`;
    a.click();
    return;
  }
  LoadingPlugin(true);
  const allIds = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.id!);
  if (!allIds.length) {
    window.$message.warning($t("workbench.production.node.storyboard.noPreviewImages"));
    LoadingPlugin(false);
    return;
  }
  try {
    const res = await axios.post(
      "/production/storyboard/downPreviewImage",
      {
        storyboardIds: allIds,
      },
      { responseType: "blob" },
    );
    // 创建下载链接
    const url = URL.createObjectURL(res as unknown as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storyboardImagePreview-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.$message.error($t("workbench.production.node.storyboard.imageLoadFailed"));
  } finally {
    LoadingPlugin(false);
  }
}
async function previewAll() {
  LoadingPlugin(true);
  const allIds = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.id!);
  if (!allIds.length) {
    window.$message.warning($t("workbench.production.node.storyboard.noPreviewImages"));
    LoadingPlugin(false);
    return;
  }
  try {
    const { data } = await axios.post("/production/storyboard/previewImage", {
      storyboardIds: allIds,
      projectId: project.value?.id,
    });
    previewImages.value = [data];
    previewDownloadUrl.value = "";
    previewVisible.value = true;
  } catch {
    window.$message.error($t("workbench.production.node.storyboard.imageLoadFailed"));
  } finally {
    LoadingPlugin(false);
  }
}
const currentRowStoryboardInfo = ref<{ id: number | null; insertAfterIndex: number | null }>({
  id: null,
  insertAfterIndex: null,
});
const styleMaxSize = computed(() => {
  if (gridScale.value <= 1) return gridScale.value;
  else 1;
});
const generateLoading = ref(false);
const directorBoardImageModel = ref(project.value?.imageModel || "");
type DirectorBoardType = "continuity" | "textStoryboard";
const directorBoardType = useLocalStorage<DirectorBoardType>("directorBoardType", "continuity");
const directorBoardTypeOptions = [
  { label: "空间连续性导演板", value: "continuity" },
  { label: "文字分镜导演板", value: "textStoryboard" },
];
interface DirectorBoardItem {
  id: number;
  name?: string | null;
  src?: string;
  previewSrc?: string;
  state?: string | null;
  reason?: string | null;
  prompt?: string | null;
  assetIds?: string | number[] | null;
  flowId?: number | null;
  model?: string | null;
  boardType?: DirectorBoardType | string | null;
}
const directorBoards = ref<DirectorBoardItem[]>([]);
const directorBoardLoading = ref(false);
let directorBoardPollTimer: ReturnType<typeof setInterval> | null = null;

async function loadDirectorBoards() {
  if (!project.value?.id || !episodesId.value) return;
  const { data } = await axios.post("/production/directorBoard/list", {
    projectId: project.value.id,
    scriptId: episodesId.value,
  });
  directorBoards.value = data ?? [];
  if (directorBoards.value.some((board) => board.state === "生成中")) startDirectorBoardPoll();
  else stopDirectorBoardPoll();
}

function startDirectorBoardPoll() {
  if (directorBoardPollTimer) return;
  directorBoardPollTimer = setInterval(() => {
    loadDirectorBoards().catch(() => {});
  }, 3000);
}

function stopDirectorBoardPoll() {
  if (!directorBoardPollTimer) return;
  clearInterval(directorBoardPollTimer);
  directorBoardPollTimer = null;
}

async function generateDirectorBoard() {
  if (!project.value?.id || !episodesId.value) return;
  const ids = selectedIds.value.length ? selectedIds.value : storyboard.value.map((item) => item.id!).filter(Boolean);
  directorBoardLoading.value = true;
  try {
    const { data } = await axios.post("/production/directorBoard/generate", {
      projectId: project.value.id,
      scriptId: episodesId.value,
      storyboardIds: ids,
      model: directorBoardImageModel.value || project.value.imageModel || "",
      boardType: directorBoardType.value,
      shotsPerBoard: 6,
      replace: true,
      generateImages: false,
    });
    directorBoards.value = data ?? [];
    selectedIds.value = [];
    window.$message.success(`已创建 ${directorBoards.value.length} 张${directorBoardTypeLabel(directorBoardType.value)}草案，点击单张“生成”再出图`);
    if (directorBoards.value.some((board) => board.state === "生成中")) startDirectorBoardPoll();
    else stopDirectorBoardPoll();
  } catch (e) {
    window.$message.error((e as any)?.message || "章节导演板生成失败");
  } finally {
    directorBoardLoading.value = false;
  }
}

function normalizeDirectorBoardType(value?: DirectorBoardItem["boardType"]): DirectorBoardType {
  return value === "textStoryboard" ? "textStoryboard" : "continuity";
}

function directorBoardTypeLabel(value?: DirectorBoardItem["boardType"]) {
  return normalizeDirectorBoardType(value) === "textStoryboard" ? "文字分镜" : "连续性";
}

function previewDirectorBoard(board: DirectorBoardItem) {
  if (board.state === "生成中") {
    window.$message.info("章节导演板还在生成中");
    return;
  }
  if (board.state === "生成失败") {
    window.$message.error(board.reason || "章节导演板生成失败");
    return;
  }
  const previewSrc = board.previewSrc || board.src;
  if (!previewSrc) {
    window.$message.info("当前章节导演板还没有可预览图片");
    return;
  }
  previewImages.value = [previewSrc];
  previewDownloadUrl.value = previewSrc;
  previewVisible.value = true;
}

function parseDirectorBoardAssetIds(value: DirectorBoardItem["assetIds"]) {
  if (Array.isArray(value)) return value.map(Number).filter((id) => Number.isFinite(id));
  try {
    const parsed = JSON.parse(String(value || "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

function findAssetImage(assetId: number) {
  const asset = props.assetsData.find((item) => item.id === assetId);
  if (asset?.src) return asset.src;
  for (const item of props.assetsData) {
    const derive = item.derive?.find((child) => child.id === assetId);
    if (derive?.src) return derive.src;
  }
  return "";
}

function editDirectorBoardImage(board: DirectorBoardItem) {
  currentEditMode.value = "directorBoard";
  currentDirectorBoardId.value = board.id;
  currentRowStoryboardInfo.value = { id: null, insertAfterIndex: null };
  const referenceImages = parseDirectorBoardAssetIds(board.assetIds).map(findAssetImage).filter(Boolean);
  currentRow.value = {
    flowId: board.flowId ?? null,
    resultImages: [{ src: board.previewSrc || board.src || "", prompt: board.prompt || "" }],
    referanceImages: referenceImages,
  };
  visible.value = true;
}

async function redrawDirectorBoard(board: DirectorBoardItem) {
  if (!project.value?.id || !episodesId.value) return;
  if (board.state === "生成中") return window.$message.info("该章节导演板正在生成中");
  const model = directorBoardImageModel.value || project.value.imageModel || "";
  if (!model) return window.$message.warning("请先选择导演板出图模型");
  const requestedBoardType = directorBoardType.value;
  board.state = "生成中";
  board.reason = "";
  board.src = "";
  board.previewSrc = "";
  board.boardType = requestedBoardType;
  try {
    await axios.post("/production/directorBoard/regenerate", {
      projectId: project.value.id,
      scriptId: episodesId.value,
      boardId: board.id,
      model,
      boardType: requestedBoardType,
    });
    window.$message.success("已提交该章节导演板重绘任务");
    await loadDirectorBoards();
    startDirectorBoardPoll();
  } catch (e) {
    const reason = (e as any)?.message || "章节导演板重绘失败";
    board.state = "生成失败";
    board.reason = reason;
    window.$message.error(reason);
  }
}

watch(
  () => project.value?.imageModel,
  (value) => {
    directorBoardImageModel.value = value || "";
  },
);

async function batchGenerateImage() {
  if (!selectedIds.value.length) return window.$message.warning("请先选择分镜面板");
  generateLoading.value = true;
  try {
    await productionAgentStore().batchGenerateStoryboard(selectedIds.value, true);
    window.$message.success($t("workbench.production.node.storyboard.batchGenerateSuccess"));
    selectedIds.value = [];
  } catch (e) {
    window.$message.error($t("workbench.production.node.storyboard.batchGenerateFailed"));
  } finally {
    generateLoading.value = false;
  }
}

async function redrawStoryboardImage(item: Storyboard) {
  if (!item.id) return window.$message.warning("当前分镜还没有保存，不能重绘");
  if (item.state === "生成中") return window.$message.info("当前分镜正在生成中");
  try {
    item.state = "生成中";
    item.reason = "";
    item.src = "";
    await productionAgentStore().batchGenerateStoryboard([item.id], true);
    window.$message.success("已提交该分镜重绘任务");
  } catch (e) {
    window.$message.error((e as any)?.message || "该分镜重绘失败");
  }
}

function editStoryboaryImage(item: Storyboard, images: string[], insertAfterIndex: number | null = null) {
  currentEditMode.value = "storyboard";
  currentDirectorBoardId.value = null;
  currentRowStoryboardInfo.value = {
    id: insertAfterIndex == null ? item?.id! : null,
    insertAfterIndex,
  };
  currentRow.value = {
    flowId: item?.flowId ?? null,
    resultImages: [],
    referanceImages: [],
  };

  if (currentRowStoryboardInfo.value.id) {
    let imagesPush: string[] = [];

    if (item.associateAssetsIds && item.associateAssetsIds.length > 0) {
      const assetsImages: string[] = [];
      for (const id of item.associateAssetsIds) {
        // 先查顶层 asset
        const asset = props.assetsData.find((a) => a.id === id);
        if (asset) {
          if (asset.src) assetsImages.push(asset.src);
          continue;
        }
        // 再查 derive
        for (const a of props.assetsData) {
          const derive = a.derive?.find((d) => d.id === id);
          if (derive) {
            if (derive.src) assetsImages.push(derive.src);
            break;
          }
        }
      }
      imagesPush = imagesPush.concat(assetsImages);
    }
    // if (item?.referenceIds && item.referenceIds.length > 0) {
    //   const referenImages = storyboard.value
    //     .filter((s) => item.referenceIds!.includes(s.id))
    //     .map((s) => s.src)
    //     .filter(Boolean) as string[];
    //   imagesPush = imagesPush.concat(referenImages);
    // }
    currentRow.value.referanceImages = imagesPush;
    currentRow.value.resultImages = [{ src: images.length ? images[0] : "", prompt: item.prompt ?? "" }];
  } else {
    currentRow.value.referanceImages = images.filter(Boolean);
  }
  visible.value = true;
}

async function save({ imageUrl, flowId, prompt }: { imageUrl: string; flowId: number; prompt?: string }) {
  if (!imageUrl) return;

  if (currentEditMode.value === "directorBoard") {
    const id = currentDirectorBoardId.value;
    if (!id || !project.value?.id || !episodesId.value) return;
    const target = directorBoards.value.find((board) => board.id === id);
    if (target) {
      target.src = imageUrl;
      target.previewSrc = imageUrl;
      target.state = "已完成";
      target.reason = "";
      target.flowId = flowId;
      if (typeof prompt === "string") target.prompt = prompt;
    }
    await axios.post("/production/directorBoard/updateUrl", {
      id,
      projectId: project.value.id,
      scriptId: episodesId.value,
      url: imageUrl,
      flowId,
      prompt,
    });
    await loadDirectorBoards();
    return;
  }

  const { id, insertAfterIndex } = currentRowStoryboardInfo.value;

  // 插入模式：在两张图之间新增一条分镜
  if (id === null && insertAfterIndex !== null) {
    const newFrame: Storyboard = {
      duration: 0,
      prompt: "",
      src: imageUrl,
      videoDesc: "",
      shouldGenerateImage: 1,
      state: "已完成",
    };
    const { data } = await axios.post("/production/storyboard/addStoryboard", {
      ...newFrame,
      projectId: project.value?.id,
      scriptId: episodesId.value,
      flowId,
    });

    storyboard.value.splice(insertAfterIndex + 1, 0, { ...newFrame, id: data.id!, flowId });
    productionAgentStore().setFlowData();
    return;
  }

  // 更新模式：更新对应分镜的 src
  const target = storyboard.value.find((s) => s.id === id);
  if (target) {
    target.src = imageUrl;
    target.state = "已完成";
    target.flowId = flowId;
  }
  await axios.post("/production/storyboard/updateStoryboardUrl", {
    id: id,
    url: imageUrl,
    flowId,
  });
}

async function removeFn(id: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.storyboard.confirmDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      if (!id) {
        const index = storyboard.value.findIndex((s) => s.id === id);
        if (index !== -1) {
          storyboard.value.splice(index, 1);
        }
        dialog.destroy();
        return;
      }
      try {
        await axios.post("/production/storyboard/removeFrame", {
          id,
          projectId: project.value?.id,
        });
        const index = storyboard.value.findIndex((s) => s.id === id);
        if (index !== -1) {
          storyboard.value.splice(index, 1);
        }
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.storyboard.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

function editInfo(item: Storyboard) {
  const formData = reactive({
    prompt: item.prompt ?? "",
    videoDesc: item?.videoDesc ?? "",
  });

  const bodyVNode = () =>
    h("div", { class: "editInfoForm" }, [
      h("div", { class: "editInfoField" }, [
        h("label", { class: "editInfoLabel" }, $t("workbench.production.node.storyboard.prompt")),
        h(resolveComponent("t-textarea"), {
          value: formData.prompt,
          placeholder: $t("workbench.production.node.storyboard.promptPlaceholder"),
          autosize: { minRows: 3, maxRows: 6 },
          "onUpdate:value": (v: string) => (formData.prompt = v),
        }),
      ]),
      h("div", { class: "editInfoField" }, [
        h("label", { class: "editInfoLabel" }, $t("workbench.production.node.storyboard.videoDesc")),
        h(resolveComponent("t-textarea"), {
          value: formData.videoDesc,
          placeholder: $t("workbench.production.node.storyboard.videoDescPlaceholder"),
          autosize: { minRows: 3, maxRows: 6 },
          "onUpdate:value": (v: string) => (formData.videoDesc = v),
        }),
      ]),
    ]);

  const confirmDialog = DialogPlugin.confirm({
    header: $t("workbench.production.node.storyboard.editInfo"),
    body: bodyVNode,
    width: 480,
    confirmBtn: {
      content: $t("common.submit"),
      theme: "primary",
      loading: false,
    },
    onConfirm: async () => {
      confirmDialog.update({ confirmBtn: { content: $t("common.submitting"), loading: true } });
      try {
        await axios.post("/production/storyboard/editStoryboardInfo", {
          id: item.id,
          prompt: formData.prompt,
          videoDesc: formData.videoDesc,
        });
        item.prompt = formData.prompt;
        item.videoDesc = formData.videoDesc;
        window.$message.success($t("common.editSuccess"));
      } catch (e) {
        window.$message.error((e as any)?.message || $t("common.editFailed"));
      } finally {
        confirmDialog.update({ confirmBtn: { content: $t("common.submit"), loading: false } });
        confirmDialog.destroy();
      }
    },
  });
}

watch(
  () => [project.value?.id, episodesId.value],
  () => {
    loadDirectorBoards().catch(() => {});
  },
  { immediate: true },
);

function handleDirectorBoardsUpdated(event: Event) {
  const detail = (event as CustomEvent<{ projectId?: number; scriptId?: number }>).detail;
  if (detail?.projectId && Number(detail.projectId) !== Number(project.value?.id)) return;
  if (detail?.scriptId && Number(detail.scriptId) !== Number(episodesId.value)) return;
  loadDirectorBoards().catch(() => {});
}

onMounted(() => {
  window.addEventListener("toonflow-director-boards-updated", handleDirectorBoardsUpdated);
});

onUnmounted(() => {
  window.removeEventListener("toonflow-director-boards-updated", handleDirectorBoardsUpdated);
  stopDirectorBoardPoll();
});
</script>

<style lang="scss" scoped>
.storyboard {
  min-width: 500px;
  max-width: 100vw;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;
  }
  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .content {
    margin-top: 12px;
  }

  .frameGrid {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0;
  }

  .frameItem {
    position: relative;
    display: inline-flex;
    align-items: flex-start;
    margin: 4px;
  }

  .addBetween {
    position: absolute;
    z-index: 10;
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    span {
      line-height: 1;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    &.expanded {
      opacity: 1;
      pointer-events: auto;
    }
    &:hover {
      // background: var(--td-brand-color);
      // color: #fff;
      // transform: scale(1.15);
    }
    &--left {
      transform: translate(calc(-50% - 4px), -50%);
    }
    &--right {
      transform: translate(calc(50% + 4px), -50%);
      right: 0;
    }
  }

  .frameCard {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .frameImage {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    transition: opacity 0.2s ease;
    &:hover {
      .remove,
      .editNode {
        opacity: 1;
      }
    }
    .remove {
      position: absolute;
      top: 3px;
      right: 3px;
      z-index: 9999;
      padding: 5px;
      border-radius: 10px;
      background-color: rgba(220, 50, 50, 0.7);
      cursor: pointer;
      opacity: 0;
      transform-origin: top right;
      &:hover {
        background-color: rgba(220, 50, 50, 1);
      }
    }
    .editNode {
      position: absolute;
      bottom: 3px;
      left: 3px;
      z-index: 9999;
      padding: 5px;
      border-radius: 10px;
      background-color: rgba(24, 144, 255, 0.7);
      cursor: pointer;
      transform-origin: bottom left;
      opacity: 0;
      &:hover {
        background-color: rgba(24, 144, 255, 1);
      }
    }
    .redrawNode {
      position: absolute;
      top: 3px;
      right: 34px;
      z-index: 9999;
      gap: 3px;
      padding: 4px 7px;
      border-radius: 6px;
      background-color: rgba(24, 144, 255, 0.86);
      color: #fff;
      font-size: 12px;
      line-height: 18px;
      cursor: pointer;
      transform-origin: top right;
      opacity: 1;
      &:hover {
        background-color: rgba(24, 144, 255, 1);
      }
      &.disabled {
        cursor: not-allowed;
        opacity: 0.55;
        background-color: rgba(100, 116, 139, 0.72);
      }
    }
  }

  .generatingPlaceholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background-color: var(--td-bg-color-container-hover, #f5f5f5);
    font-size: 12px;
  }

  .frameImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    .imageToolsWrap {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    &:hover {
      .imageToolsWrap {
        opacity: 1;
        pointer-events: auto;
      }
    }
  }

  .frameCheckbox {
    position: absolute;
    left: 3px;
    top: 3px;
    z-index: 3;
    transform-origin: top left;
  }

  .frameTypeTag {
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    border: none;
    z-index: 2;
    padding: 0 4px;
    line-height: 18px;
    border-radius: 3px;
  }

  .frameTag {
    position: absolute;
    right: 8px;
    bottom: 8px;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    border: none;
  }

  .scaleControl {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--td-text-color-primary, #333);
  }

  .directorBoardControlRow {
    display: grid;
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .directorBoardControlItem {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }

  .directorBoardControlLabel {
    font-size: 13px;
    color: var(--td-text-color-secondary);
    white-space: nowrap;
  }

  .directorBoardStrip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
    margin-top: 10px;
  }
  .directorBoardItem {
    position: relative;
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--td-bg-color-container);
    min-height: 112px;
    transition:
      border-color 0.16s ease,
      transform 0.16s ease;

    &.clickable {
      cursor: zoom-in;

      &:hover {
        border-color: var(--td-brand-color);
        transform: translateY(-1px);
      }
    }
  }
  .directorBoardImg,
  .directorBoardPlaceholder {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
  .directorBoardPlaceholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--td-text-color-secondary);
    background: var(--td-bg-color-secondarycontainer);
  }
  .directorBoardBadge {
    position: absolute;
    top: 4px;
    left: 4px;
    z-index: 1;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.62);
    color: #fff;
    font-size: 11px;
  }
  .directorBoardActions {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 2;
    display: flex;
    gap: 4px;
  }
  .directorBoardCanvas,
  .directorBoardRedraw {
    height: 22px;
    padding: 0 6px;
    font-size: 12px;
  }
  .directorBoardName {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 5px 6px;
    font-size: 12px;
    color: var(--td-text-color-secondary);
  }
  .directorBoardName span:first-child {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .directorBoardError {
    color: var(--td-error-color);
  }

  .frameInfo {
    margin-top: 6px;
    font-size: 12px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.4;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
:deep(.t-image__wrapper) {
  background-color: transparent !important;
}
.editInfoForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.editInfoField {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editInfoLabel {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}
</style>
