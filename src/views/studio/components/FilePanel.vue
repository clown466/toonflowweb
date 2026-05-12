<template>
  <div class="file-panel" :style="{ height: panelHeight + 'px' }">
    <div class="panel-header">
      <div class="header-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" size="14" />
          <span>{{ tab.label }}</span>
          <t-badge v-if="tab.count !== undefined" :count="tab.count" size="small" />
        </div>
      </div>
      <div class="header-actions">
        <t-input
          v-model="searchQuery"
          :placeholder="$t('studio.files.search')"
          size="small"
          clearable
          style="width: 140px"
        >
          <template #prefixIcon><i-search size="14" /></template>
        </t-input>
        <t-divider layout="vertical" />
        <t-tooltip :content="filterType ? `筛选: ${filterType}` : '筛选类型'">
          <t-popup trigger="click" placement="bottom">
            <t-button variant="text" shape="square" size="small">
              <template #icon><i-filter size="14" /></template>
            </t-button>
            <template #content>
              <div class="filter-menu">
                <div class="menu-item" :class="{ active: !filterType }" @click="filterType = ''">全部</div>
                <div class="menu-item" :class="{ active: filterType === 'role' }" @click="filterType = 'role'">角色</div>
                <div class="menu-item" :class="{ active: filterType === 'scene' }" @click="filterType = 'scene'">场景</div>
                <div class="menu-item" :class="{ active: filterType === 'tool' }" @click="filterType = 'tool'">道具</div>
                <div class="menu-item" :class="{ active: filterType === 'clip' }" @click="filterType = 'clip'">片段</div>
              </div>
            </template>
          </t-popup>
        </t-tooltip>
        <t-button variant="text" shape="square" size="small" :loading="loading" @click="emit('refreshAssets')">
          <template #icon><i-refresh size="14" /></template>
        </t-button>
        <t-button variant="text" shape="square" size="small" @click="emit('collapse')">
          <template #icon><i-down size="14" /></template>
        </t-button>
      </div>
    </div>

    <div class="panel-body">
      <t-alert v-if="errorMessage" theme="error" :message="errorMessage" close style="margin: 8px 12px 0" />

      <!-- Assets Tab -->
      <div v-if="activeTab === 'assets'" class="file-grid">
        <div v-if="loading && displayAssets.length === 0" class="empty-state">
          <t-loading size="small" text="正在加载资产" />
        </div>
        <div v-else-if="displayAssets.length === 0" class="empty-state">
          <t-empty :title="$t('studio.files.noAssets')" :description="$t('studio.files.noAssetsDesc')" />
        </div>
        <div
          v-for="asset in displayAssets"
          :key="asset.key"
          class="file-card"
          :class="{ selected: selectedKey === asset.key, draggable: !!asset.src }"
          :draggable="!!asset.src"
          @dragstart="onAssetDragStart($event, asset)"
          @click="onSelectAsset(asset)"
          @dblclick="onPreviewAsset(asset)"
        >
          <div class="card-thumb">
            <img v-if="asset.src" :src="asset.src" draggable="false" />
            <div v-else-if="asset.state === '生成中'" class="thumb-state generating">
              <t-loading size="small" />
            </div>
            <div v-else-if="asset.state === '生成失败'" class="thumb-state error">
              <i-refresh size="14" />
            </div>
            <div v-else class="thumb-placeholder">
              <i-user size="24" />
            </div>
            <div class="card-type">{{ assetTypeLabel(asset.type) }}</div>
            <t-tooltip v-if="canRegenerateAssetImage(asset)" content="编辑提示词并重新生成">
              <button
                class="image-edit-button"
                type="button"
                @click.stop="openPromptEditor(asset)"
                @dblclick.stop
              >
                <i-edit size="13" />
              </button>
            </t-tooltip>
            <t-tooltip v-if="canSwitchAssetImage(asset)" content="选择其他图片">
              <button
                class="image-switch-button"
                type="button"
                @click.stop="openImageChoice(asset)"
                @dblclick.stop
              >
                <i-pic size="13" />
              </button>
            </t-tooltip>
          </div>
          <div class="card-info">
            <div class="info-name" :title="asset.name">{{ asset.name }}</div>
            <div class="info-meta">
              <span v-if="asset.parentName" :title="asset.parentName">{{ asset.parentName }}</span>
              <span v-else>{{ $t("studio.files.single") }}</span>
            </div>
            <t-tag :theme="stateTheme(asset.state)" size="small" variant="light">
              {{ stateLabel(asset.state || '未生成') }}
            </t-tag>
          </div>
          <div v-if="asset.isDerived && !asset.isHistory" class="card-actions">
            <t-button size="small" variant="outline" :disabled="asset.state === '生成中'" @click.stop="onRepaintDerive(asset)">
              重绘
            </t-button>
          </div>
        </div>
      </div>

      <!-- Storyboard Tab -->
      <div v-else-if="activeTab === 'storyboard'" class="file-list">
        <div v-if="filteredStoryboard.length === 0" class="empty-state">
          <t-empty :title="$t('studio.files.noStoryboard')" />
        </div>
        <div
          v-for="(item, index) in filteredStoryboard"
          :key="item.id || index"
          class="list-item"
          @click="item.id && emit('selectStoryboard', item.id)"
        >
          <div class="item-thumb">
            <img v-if="item.src && item.state === '已完成'" :src="item.src" />
            <div v-else-if="item.state === '生成中'" class="thumb-state generating">
              <t-loading size="small" />
            </div>
            <div v-else-if="item.state === '生成失败'" class="thumb-state error">
              <i-refresh size="14" />
            </div>
            <div v-else class="thumb-state pending">
              <i-image-error size="14" />
            </div>
          </div>
          <div class="item-info">
            <div class="info-top">
              <span class="info-index">#{{ index + 1 }}</span>
              <t-tag :theme="stateTheme(item.state)" size="small" variant="light">
                {{ stateLabel(item.state) }}
              </t-tag>
            </div>
            <div class="info-prompt" :title="item.prompt">{{ item.prompt || $t("studio.files.noPrompt") }}</div>
            <div class="info-duration">{{ item.duration || 0 }}s</div>
          </div>
        </div>
      </div>

      
    </div>

    <!-- Resize handle -->
    <div ref="resizeHandle" class="resize-handle top" />

    <!-- Asset Preview Dialog -->
    <t-dialog v-model:visible="showPreview" :header="previewAsset?.name || '图片预览'" width="min(80vw, 960px)" :footer="false">
      <div class="asset-preview-dialog">
        <img v-if="previewAsset?.src" :src="previewAsset.src" :alt="previewAsset.name || 'asset preview'" />
        <t-empty v-else title="暂无可预览图片" />
      </div>
    </t-dialog>

    <!-- Asset Image Choice Dialog -->
    <t-dialog v-model:visible="showImageChoice" :header="`选择图片 - ${imageChoiceAsset?.name || ''}`" width="min(82vw, 960px)">
      <div class="asset-choice-dialog">
        <div v-if="imageChoiceLoading" class="asset-choice-loading">
          <t-loading size="small" text="正在加载图片" />
        </div>
        <t-empty v-else-if="imageChoiceImages.length === 0" title="暂无可选图片" description="先在资产中心生成或上传图片后再选择" />
        <div v-else class="asset-choice-grid">
          <button
            v-for="image in imageChoiceImages"
            :key="image.id"
            type="button"
            class="asset-choice-card"
            :class="{ selected: selectedChoiceImageId === image.id, disabled: image.state !== '已完成' }"
            :disabled="image.state !== '已完成'"
            @click="selectedChoiceImageId = image.id"
          >
            <img v-if="image.src" :src="image.src" :alt="`image-${image.id}`" />
            <div v-else class="choice-state">{{ stateLabel(image.state || '未生成') }}</div>
            <t-tag v-if="image.selected" class="choice-badge" theme="success" size="small" variant="light">当前</t-tag>
            <div v-if="selectedChoiceImageId === image.id" class="choice-check">
              <i-check-one theme="filled" size="18" />
            </div>
          </button>
        </div>
      </div>
      <template #footer>
        <t-button variant="outline" @click="showImageChoice = false">取消</t-button>
        <t-button theme="primary" :loading="imageChoiceSaving" :disabled="!selectedChoiceImageId" @click="confirmImageChoice">设为当前图片</t-button>
      </template>
    </t-dialog>

    <!-- Asset Prompt Regeneration Dialog -->
    <t-dialog
      v-model:visible="showPromptEditor"
      :header="`编辑提示词 - ${promptEditAsset?.name || ''}`"
      width="min(760px, 92vw)"
      :close-on-overlay-click="false"
    >
      <div class="asset-prompt-dialog">
        <div class="prompt-dialog-grid">
          <div class="prompt-field">
            <span class="field-label">出图模型</span>
            <modelSelect v-model="promptEditModel" type="image" size="small" placeholder="选择出图模型" />
          </div>
          <div class="prompt-field">
            <span class="field-label">图片大小</span>
            <t-select v-model="promptEditResolution" size="small">
              <t-option key="1K" label="1K" value="1K" />
              <t-option key="2K" label="2K" value="2K" />
              <t-option key="4K" label="4K" value="4K" />
            </t-select>
          </div>
        </div>
        <div class="prompt-field">
          <span class="field-label">生图预设</span>
          <t-select v-model="promptEditSkillId" :options="promptSkillOptions" :loading="promptSkillLoading" size="small" clearable placeholder="默认：视觉手册标准生图" />
        </div>
        <div class="prompt-field">
          <span class="field-label">提示词</span>
          <t-textarea
            v-model="promptEditText"
            :autosize="{ minRows: 8, maxRows: 14 }"
            placeholder="直接修改这个资产要发送给生图模型的提示词"
          />
        </div>
        <t-alert
          theme="info"
          message="全新生成不会带当前图片参考；修改原图会把当前资产图作为参考图传入，再按上面的提示词修改。"
        />
      </div>
      <template #footer>
        <t-button variant="outline" @click="showPromptEditor = false">取消</t-button>
        <t-button
          variant="outline"
          :loading="promptSubmittingMode === 'fresh'"
          :disabled="Boolean(promptSubmittingMode)"
          @click="submitPromptRegeneration('fresh')"
        >
          全新生成
        </t-button>
        <t-tooltip :content="promptEditHasReference ? '参考当前资产图修改' : '当前资产没有可参考图片'">
          <t-button
            theme="primary"
            :loading="promptSubmittingMode === 'edit'"
            :disabled="Boolean(promptSubmittingMode) || !promptEditHasReference"
            @click="submitPromptRegeneration('edit')"
          >
            修改原图
          </t-button>
        </t-tooltip>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { useMouse, useMousePressed } from "@vueuse/core";
import axios from "@/utils/axios";
import modelSelect from "@/components/modelSelect.vue";

interface DeriveAsset {
  id: number;
  key?: string;
  assetsId?: number;
  imageId?: number;
  name?: string;
  src?: string | null;
  filePath?: string | null;
  type?: string;
  state?: string;
  prompt?: string | null;
  describe?: string | null;
  parentName?: string;
  isDerived?: boolean;
  isHistory?: boolean;
  historyImages?: HistoryImage[];
}

interface Asset {
  id: number;
  key?: string;
  imageId?: number;
  name: string;
  src?: string | null;
  filePath?: string | null;
  type?: string;
  state?: string;
  prompt?: string | null;
  describe?: string | null;
  derive?: DeriveAsset[];
  sonAssets?: DeriveAsset[];
  historyImages?: HistoryImage[];
  parentName?: string;
  isDerived?: boolean;
  isHistory?: boolean;
}

interface HistoryImage {
  id: number;
  assetsId?: number;
  src?: string | null;
  filePath?: string | null;
  type?: string;
  state?: string;
  selected?: boolean;
}

interface ChoiceImage {
  id: number;
  src: string;
  state: string;
  selected?: boolean;
}

interface StoryboardItem {
  id?: number;
  src?: string | null;
  prompt?: string;
  state: string;
  duration?: number;
}

const props = defineProps<{
  assets: any[];
  storyboard: StoryboardItem[];
  projectId?: string | number;
  imageModel?: string | null;
  imageQuality?: string | null;
  loading?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  (e: "selectAsset", asset: Asset | DeriveAsset): void;
  (e: "selectStoryboard", id: number): void;
  (e: "previewAsset", asset: Asset | DeriveAsset): void;
  (e: "repaintAsset", asset: DeriveAsset): void;
  (e: "refreshAssets"): void;
  (e: "assetImageChanged", asset: Asset | DeriveAsset): void;
  (e: "collapse"): void;
}>();

const activeTab = ref("assets");
const searchQuery = ref("");
const selectedKey = ref<string | undefined>();
const panelHeight = defineModel<number>("panelHeight", { default: 200 });

const tabs = computed(() => [
  { key: "assets", label: '资产', icon: "i-pic", count: props.assets.length },
  { key: "storyboard", label: '分镜', icon: "i-film", count: props.storyboard.length },
  // 文件系统未接入，暂不显示
  // { key: "files", label: '文件', icon: "i-folder-close" },
]);

const filterType = ref('');

const filteredAssets = computed(() => {
  let result = props.assets;
  if (filterType.value) {
    result = result.filter(a => a.type === filterType.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(a =>
      a.name?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q)
    );
  }
  return result;
});

const displayAssets = computed(() =>
  filteredAssets.value.flatMap((asset) => {
    const normalizedAsset = asset as Asset;
    const items: Array<Asset | DeriveAsset> = [
      {
        ...normalizedAsset,
        key: `asset-${normalizedAsset.id}`,
        src: assetThumb(normalizedAsset),
        state: assetVisualState(normalizedAsset),
        isDerived: false,
      },
    ];
    assetDerives(normalizedAsset).forEach((derive) => {
      items.push({
        ...derive,
        key: `derive-${derive.id}`,
        type: derive.type || normalizedAsset.type,
        name: derive.name || normalizedAsset.name,
        parentName: normalizedAsset.name,
        src: deriveThumb(derive),
        state: derive.state || "未生成",
        isDerived: true,
      });
    });
    return items;
  }),
);

const filteredStoryboard = computed(() => {
  if (!searchQuery.value) return props.storyboard;
  const q = searchQuery.value.toLowerCase();
  return props.storyboard.filter(s =>
    s.prompt?.toLowerCase().includes(q)
  );
});

type TagTheme = "default" | "primary" | "danger" | "warning" | "success";

const stateMap: Record<string, { theme: TagTheme; label: string }> = {
  "未生成": { theme: "default", label: $t("studio.state.pending") },
  "生成中": { theme: "warning", label: $t("studio.state.generating") },
  "已完成": { theme: "success", label: $t("studio.state.completed") },
  "生成失败": { theme: "danger", label: $t("studio.state.failed") },
};

function stateTheme(state?: string): TagTheme {
  return (state ? stateMap[state]?.theme : undefined) || "default";
}

function stateLabel(state: string): string {
  return stateMap[state]?.label || state;
}

function assetTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    character: $t("studio.assetTypes.character"),
    role: $t("studio.assetTypes.role"),
    scene: $t("studio.assetTypes.scene"),
    prop: $t("studio.assetTypes.prop"),
    tool: $t("studio.assetTypes.tool"),
  };
  return labels[type || ""] || type || $t("studio.assetTypes.unknown");
}

function pickSrc(item?: { src?: string | null; filePath?: string | null }) {
  return item?.src || item?.filePath || "";
}

function assetDerives(asset: Asset) {
  return Array.isArray(asset.derive) && asset.derive.length > 0 ? asset.derive : asset.sonAssets || [];
}

function deriveThumb(derive: DeriveAsset) {
  return pickSrc(derive);
}

function assetThumb(asset: Asset) {
  const ownSrc = pickSrc(asset);
  if (ownSrc) return ownSrc;
  const completedDerive = assetDerives(asset).find((derive) => pickSrc(derive));
  return pickSrc(completedDerive);
}

function assetVisualState(asset: Asset) {
  if (asset.state && asset.state !== "未生成") return asset.state;
  const derives = assetDerives(asset);
  if (derives.some((derive) => derive.state === "生成中")) return "生成中";
  if (assetThumb(asset)) return "已完成";
  if (derives.some((derive) => derive.state === "生成失败")) return "生成失败";
  return asset.state || "未生成";
}

function onSelectAsset(asset: Asset | DeriveAsset) {
  selectedKey.value = asset.key;
  emit("selectAsset", asset);
}

const showPreview = ref(false);
const previewAsset = ref<Asset | DeriveAsset | null>(null);
const showImageChoice = ref(false);
const imageChoiceLoading = ref(false);
const imageChoiceSaving = ref(false);
const imageChoiceAsset = ref<Asset | DeriveAsset | null>(null);
const imageChoiceImages = ref<ChoiceImage[]>([]);
const selectedChoiceImageId = ref<number | null>(null);
const showPromptEditor = ref(false);
const promptEditAsset = ref<Asset | DeriveAsset | null>(null);
const promptEditText = ref("");
const promptEditModel = ref("");
const promptEditResolution = ref("1K");
const promptEditSkillId = ref("");
const promptSubmittingMode = ref<"" | "fresh" | "edit">("");
const promptSkillLoading = ref(false);
const imageGenerationSkills = ref<Array<{ id: string; name: string; description?: string; targetTypes: string[]; aspectRatio?: string }>>([]);

function onPreviewAsset(asset: Asset | DeriveAsset) {
  const src = pickSrc(asset);
  if (!src) {
    window.$message.warning("该资产还没有可预览图片");
    return;
  }
  previewAsset.value = { ...asset, src };
  showPreview.value = true;
  emit('previewAsset', asset);
}

function onRepaintDerive(derive: DeriveAsset) {
  emit("repaintAsset", derive);
}

function onAssetDragStart(event: DragEvent, asset: Asset | DeriveAsset) {
  const src = pickSrc(asset);
  if (!src || !event.dataTransfer) return;
  const payload = {
    kind: "toonflow-asset-image",
    id: asset.id,
    imageId: asset.imageId ?? null,
    name: asset.name || "",
    type: asset.type || "",
    src,
    filePath: asset.filePath || "",
    prompt: asset.prompt || "",
    parentName: asset.parentName || "",
  };
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-toonflow-asset", JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", `引用资产 ID: ${asset.id}，名称：${asset.name || ""}，图片：${src}`);
}

function normalizeImageAssetType(type?: string): "role" | "scene" | "tool" | null {
  if (type === "role" || type === "character") return "role";
  if (type === "scene") return "scene";
  if (type === "tool" || type === "prop") return "tool";
  return null;
}

function canSwitchAssetImage(asset: Asset | DeriveAsset) {
  return Boolean(asset.id && normalizeImageAssetType(asset.type) && asset.state !== "生成中");
}

function canRegenerateAssetImage(asset: Asset | DeriveAsset) {
  return Boolean(asset.id && normalizeImageAssetType(asset.type) && asset.state !== "生成中");
}

const promptEditHasReference = computed(() => Boolean(promptEditAsset.value && (pickSrc(promptEditAsset.value) || promptEditAsset.value.imageId)));

function compactLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

const promptSkillOptions = computed(() => {
  const type = normalizeImageAssetType(promptEditAsset.value?.type);
  const options = imageGenerationSkills.value
    .filter((skill) => !type || (skill.targetTypes || []).includes(type))
    .map((skill) => ({
      label: [skill.name, skill.aspectRatio ? `(${skill.aspectRatio})` : "", skill.description ? `- ${compactLabel(skill.description, 24)}` : ""]
        .filter(Boolean)
        .join(" "),
      value: skill.id,
    }));
  return [{ label: "默认：视觉手册标准生图", value: "" }, ...options];
});

async function fetchImageGenerationSkills() {
  promptSkillLoading.value = true;
  try {
    const { data } = await axios.post("/setting/imageGenerationSkill/list");
    imageGenerationSkills.value = Array.isArray(data) ? data : [];
  } catch {
    imageGenerationSkills.value = [];
  } finally {
    promptSkillLoading.value = false;
  }
}

function openPromptEditor(asset: Asset | DeriveAsset) {
  if (!props.projectId) {
    window.$message.warning("当前项目不存在，无法重新生成资产");
    return;
  }
  if (!normalizeImageAssetType(asset.type)) {
    window.$message.warning("当前资产类型不支持重新生成");
    return;
  }
  promptEditAsset.value = asset;
  promptEditText.value = asset.prompt || "";
  promptEditModel.value = props.imageModel || "";
  promptEditResolution.value = props.imageQuality || "1K";
  promptEditSkillId.value = "";
  promptSubmittingMode.value = "";
  showPromptEditor.value = true;
  void fetchImageGenerationSkills();
}

async function submitPromptRegeneration(mode: "fresh" | "edit") {
  const asset = promptEditAsset.value;
  const type = normalizeImageAssetType(asset?.type);
  const prompt = promptEditText.value.trim();
  if (!asset || !type || !props.projectId) return;
  if (!prompt) {
    window.$message.warning("请先填写提示词");
    return;
  }
  if (!promptEditModel.value) {
    window.$message.warning("请选择出图模型");
    return;
  }
  if (!promptEditResolution.value) {
    window.$message.warning("请选择图片大小");
    return;
  }
  if (mode === "edit" && !promptEditHasReference.value) {
    window.$message.warning("当前资产没有可参考图片，不能修改原图");
    return;
  }

  promptSubmittingMode.value = mode;
  try {
    await axios.post("/assetsGenerate/generateAssets", {
      projectId: Number(props.projectId),
      id: asset.id,
      type,
      name: asset.name || `资产 #${asset.id}`,
      describe: "describe" in asset ? asset.describe ?? "" : "",
      prompt,
      model: promptEditModel.value,
      resolution: promptEditResolution.value,
      skillId: promptEditSkillId.value || null,
      generationMode: mode === "fresh" ? "fresh_design" : "partial_edit",
      referencePolicy: mode === "fresh" ? "none" : "current_asset",
      promptPolicy: mode === "fresh" ? "asset_description_plus_request" : "asset_prompt_plus_request",
      userRequirement: prompt,
    });
    window.$message.success(mode === "fresh" ? "已提交全新资产图生成" : "已提交参考原图修改");
    showPromptEditor.value = false;
    emit("assetImageChanged", asset);
    emit("refreshAssets");
  } catch (err: any) {
    window.$message.error(err?.message || "资产图生成提交失败");
  } finally {
    promptSubmittingMode.value = "";
  }
}

async function openImageChoice(asset: Asset | DeriveAsset) {
  if (!props.projectId) {
    window.$message.warning("当前项目不存在，无法切换图片");
    return;
  }
  if (!normalizeImageAssetType(asset.type)) {
    window.$message.warning("当前资产类型不支持切换图片");
    return;
  }

  imageChoiceAsset.value = asset;
  showImageChoice.value = true;
  imageChoiceLoading.value = true;
  selectedChoiceImageId.value = asset.imageId ? Number(asset.imageId) : null;
  imageChoiceImages.value = [];

  try {
    const { data } = await axios.post("/assets/getImage", { assetsId: asset.id });
    const images = (data?.tempAssets || [])
      .map((item: { id: number | string; filePath?: string; src?: string; state?: string; selected?: boolean }) => ({
        id: Number(item.id),
        src: item.filePath || item.src || "",
        state: item.state || "未生成",
        selected: Boolean(item.selected),
      }))
      .sort((a: ChoiceImage, b: ChoiceImage) => Number(b.selected) - Number(a.selected) || b.id - a.id);
    imageChoiceImages.value = images;
    const selected = images.find((image: ChoiceImage) => image.selected);
    selectedChoiceImageId.value = selected?.id ?? selectedChoiceImageId.value;
  } catch (err: any) {
    window.$message.error(err?.message || "图片列表加载失败");
    showImageChoice.value = false;
  } finally {
    imageChoiceLoading.value = false;
  }
}

async function confirmImageChoice() {
  const asset = imageChoiceAsset.value;
  const imageId = selectedChoiceImageId.value;
  const type = normalizeImageAssetType(asset?.type);
  if (!asset || !imageId || !type || !props.projectId) return;

  imageChoiceSaving.value = true;
  try {
    await axios.post("/assets/saveAssets", {
      id: asset.id,
      base64: "",
      type,
      prompt: asset.prompt ?? "",
      projectId: Number(props.projectId),
      imageId,
    });
    window.$message.success("已切换资产图片");
    showImageChoice.value = false;
    emit("assetImageChanged", asset);
  } catch (err: any) {
    window.$message.error(err?.message || "资产图片切换失败");
  } finally {
    imageChoiceSaving.value = false;
  }
}

// Resize logic
const resizeHandle = ref<HTMLElement | null>(null);
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 400;

if (typeof window !== "undefined") {
  const { pressed } = useMousePressed({ target: resizeHandle });
  const { y } = useMouse();
  const startY = ref(0);
  const startHeight = ref(200);

  watch(pressed, (isPressed) => {
    if (isPressed) {
      startY.value = y.value;
      startHeight.value = panelHeight.value;
    }
  });

  watchEffect(() => {
    if (pressed.value) {
      const delta = startY.value - y.value;
      panelHeight.value = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight.value + delta));
    }
  });
}
</script>

<style lang="scss" scoped>
.filter-menu {
  padding: 4px 0;
  min-width: 100px;

  .menu-item {
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      background-color: var(--td-bg-color-container-hover);
    }

    &.active {
      color: var(--td-brand-color);
      background-color: var(--td-brand-color-light);
    }
  }
}

.file-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--td-bg-color-container);
  position: relative;
  flex-shrink: 0;
  border-top: 1px solid var(--td-border-level-1-color);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.16);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--td-bg-color-secondarycontainer);
}

.header-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  transition: all 0.2s;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  &.active {
    background-color: var(--td-brand-color-light);
    color: var(--td-brand-color);
    font-weight: 500;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

// Grid view
.file-grid {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 140px));
  align-content: start;
  justify-content: start;
  gap: 12px;

  &.compact {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }
}

.file-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
  min-width: 0;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  &.selected {
    border-color: var(--td-brand-color);
    background-color: var(--td-brand-color-light);
  }

  &.draggable {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &.compact {
    padding: 4px;
  }

  .card-thumb {
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    background-color: var(--td-bg-color-secondarycontainer);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    &.small {
      aspect-ratio: auto;
      height: 48px;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumb-placeholder {
      color: var(--td-text-color-disabled);
    }

    .card-type {
      position: absolute;
      bottom: 4px;
      left: 4px;
      font-size: 9px;
      padding: 1px 4px;
      background-color: rgba(0, 0, 0, 0.6);
      color: white;
      border-radius: 3px;
    }

    .image-switch-button {
      position: absolute;
      right: 5px;
      bottom: 5px;
      width: 24px;
      height: 24px;
      border: 0;
      padding: 0;
      color: #fff;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.58);
      border-radius: 5px;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        display: block;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.76);
      }
    }

    .image-edit-button {
      position: absolute;
      right: 5px;
      top: 5px;
      width: 24px;
      height: 24px;
      border: 0;
      padding: 0;
      color: #fff;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.58);
      border-radius: 5px;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        display: block;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.76);
      }
    }
  }

  .card-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .info-name {
      font-size: 11px;
      color: var(--td-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .info-meta {
      font-size: 10px;
      color: var(--td-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;
}

.thumb-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  &.generating { color: var(--td-warning-color); }
  &.error { color: var(--td-error-color); }
  &.pending { color: var(--td-text-color-disabled); }
}

// List view
.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  .item-thumb {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background-color: var(--td-bg-color-secondarycontainer);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumb-state {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;

      &.generating { color: var(--td-warning-color); }
      &.error { color: var(--td-error-color); }
      &.pending { color: var(--td-text-color-disabled); }
    }
  }

  .item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .info-top {
      display: flex;
      align-items: center;
      gap: 8px;

      .info-index {
        font-size: 12px;
        font-weight: 600;
        color: var(--td-text-color-primary);
      }
    }

    .info-prompt {
      font-size: 11px;
      color: var(--td-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .info-duration {
      font-size: 10px;
      color: var(--td-text-color-disabled);
    }
  }
}

.resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  cursor: row-resize;
  z-index: 10;

  &.top {
    top: -2px;
  }

  &:hover {
    background-color: var(--td-brand-color);
  }
}

.asset-preview-dialog {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 72vh;
  min-height: 240px;
  overflow: auto;

  img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }
}

.asset-choice-dialog {
  min-height: 260px;
}

.asset-prompt-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prompt-dialog-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 12px;
}

.prompt-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--td-text-color-secondary);
}

.asset-choice-loading {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-choice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  max-height: 62vh;
  overflow-y: auto;
  padding: 4px;
}

.asset-choice-card {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 2px solid var(--td-border-level-2-color);
  border-radius: 8px;
  background: var(--td-bg-color-secondarycontainer);
  cursor: pointer;

  &:hover {
    border-color: var(--td-brand-color);
  }

  &.selected {
    border-color: var(--td-brand-color);
    box-shadow: 0 0 0 2px var(--td-brand-color-light);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .choice-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--td-text-color-secondary);
    font-size: 12px;
  }

  .choice-badge {
    position: absolute;
    top: 6px;
    left: 6px;
  }

  .choice-check {
    position: absolute;
    right: 6px;
    top: 6px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--td-brand-color);
    background: rgba(255, 255, 255, 0.92);
    border-radius: 999px;
  }
}
</style>
