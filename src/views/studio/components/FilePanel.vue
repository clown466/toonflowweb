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
        <t-button variant="text" shape="square" size="small" @click="collapsed = !collapsed">
          <template #icon><i-up v-if="!collapsed" size="14" /><i-down v-else size="14" /></template>
        </t-button>
      </div>
    </div>

    <div v-show="!collapsed" class="panel-body">
      <!-- Assets Tab -->
      <div v-if="activeTab === 'assets'" class="file-grid">
        <div v-if="filteredAssets.length === 0" class="empty-state">
          <t-empty :title="$t('studio.files.noAssets')" :description="$t('studio.files.noAssetsDesc')" />
        </div>
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="file-card"
          :class="{ selected: selectedId === asset.id }"
          @click="onSelectAsset(asset)"
          @dblclick="onPreviewAsset(asset)"
        >
          <div class="card-thumb">
            <img v-if="asset.src" :src="asset.src" />
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
          </div>
          <div class="card-info">
            <div class="info-name" :title="asset.name">{{ asset.name }}</div>
            <div class="info-meta">
              <span v-if="asset.derive">{{ asset.derive.length }} {{ $t("studio.files.variants") }}</span>
              <span v-else>{{ $t("studio.files.single") }}</span>
            </div>
            <t-tag :theme="stateTheme(asset.state)" size="small" variant="light">
              {{ stateLabel(asset.state || '未生成') }}
            </t-tag>
          </div>
          <div v-if="asset.derive?.length" class="derive-list" @click.stop>
            <div
              v-for="derive in asset.derive"
              :key="derive.id"
              class="derive-item"
              :class="{ selected: selectedId === derive.id }"
              @click="onSelectDerive(derive)"
              @dblclick="onPreviewDerive(derive)"
            >
              <div class="derive-thumb">
                <img v-if="derive.src" :src="derive.src" />
                <div v-else-if="derive.state === '生成中'" class="thumb-state generating">
                  <t-loading size="small" />
                </div>
                <div v-else-if="derive.state === '生成失败'" class="thumb-state error">
                  <i-refresh size="14" />
                </div>
                <div v-else class="thumb-state pending">
                  <i-image-error size="14" />
                </div>
              </div>
              <div class="derive-info">
                <div class="derive-name" :title="derive.name">{{ derive.name || '衍生资产' }}</div>
                <t-tag :theme="stateTheme(derive.state)" size="small" variant="light">
                  {{ stateLabel(derive.state) }}
                </t-tag>
              </div>
              <t-button size="small" variant="outline" :disabled="derive.state === '生成中'" @click.stop="onRepaintDerive(derive)">
                重绘
              </t-button>
            </div>
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
    <div ref="resizeHandle" class="resize-handle top" v-show="!collapsed" />

    <!-- Asset Preview Dialog -->
    <t-image-viewer
      v-model:visible="showPreview"
      :images="previewAsset?.src ? [previewAsset.src] : []"
      :default-index="0"
    />
  </div>
</template>

<script setup lang="ts">
import { useMouse, useMousePressed } from "@vueuse/core";

interface DeriveAsset {
  id: number;
  assetsId?: number;
  name?: string;
  src?: string | null;
  type?: string;
  state?: string;
}

interface Asset {
  id: number;
  name: string;
  src?: string | null;
  type?: string;
  state?: string;
  derive?: DeriveAsset[];
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
}>();

const emit = defineEmits<{
  (e: "selectAsset", asset: Asset | DeriveAsset): void;
  (e: "selectStoryboard", id: number): void;
  (e: "previewAsset", asset: Asset | DeriveAsset): void;
  (e: "repaintAsset", asset: DeriveAsset): void;
}>();

const activeTab = ref("assets");
const searchQuery = ref("");
const collapsed = ref(false);
const selectedId = ref<number | null>(null);
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

function onSelectAsset(asset: Asset) {
  selectedId.value = asset.id;
  emit("selectAsset", asset);
}

function onSelectDerive(derive: DeriveAsset) {
  selectedId.value = derive.id;
  emit("selectAsset", derive);
}

const showPreview = ref(false);
const previewAsset = ref<Asset | DeriveAsset | null>(null);

function onPreviewAsset(asset: Asset) {
  previewAsset.value = asset;
  showPreview.value = true;
  emit('previewAsset', asset);
}

function onPreviewDerive(derive: DeriveAsset) {
  previewAsset.value = derive;
  showPreview.value = true;
  emit("previewAsset", derive);
}

function onRepaintDerive(derive: DeriveAsset) {
  emit("repaintAsset", derive);
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
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
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
    }
  }
}

.derive-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.derive-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 6px;
  background-color: var(--td-bg-color-secondarycontainer);
  cursor: pointer;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  &.selected {
    outline: 1px solid var(--td-brand-color);
  }
}

.derive-thumb {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--td-bg-color-container);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.derive-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.derive-name {
  font-size: 10px;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
