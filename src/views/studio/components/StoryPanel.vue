<template>
  <div class="story-panel" :style="{ width: panelWidth + 'px' }">
    <div class="panel-header">
      <div class="header-title">
        <i-camera-five size="16" />
        <span>{{ $t("studio.storyboard.title") }}</span>
        <t-tag size="small" variant="light">{{ storyboard.length }}</t-tag>
      </div>
      <div class="header-actions">
        <t-button variant="text" shape="square" size="small" @click="selectAll">
          <template #icon><i-check-small size="16" /></template>
        </t-button>
        <t-button variant="text" shape="square" size="small" @click="collapsed = !collapsed">
          <template #icon><i-component v-if="!collapsed" size="16" /><i-list v-else size="16" /></template>
        </t-button>
      </div>
    </div>

    <div class="panel-body" v-if="!collapsed">
      <div v-if="loading" class="loading-state">
        <t-loading size="small" />
        <span>{{ $t("studio.storyboard.loading") }}</span>
      </div>

      <div v-else-if="storyboard.length === 0" class="empty-state">
        <t-empty :title="$t('studio.storyboard.empty')" :description="$t('studio.storyboard.emptyDesc')" />
      </div>

      <div v-else class="story-list" @scroll="onScroll">
        <div
          v-for="(item, index) in storyboard"
          :key="item.id || index"
          class="story-item"
          :class="{
            active: selectedId === item.id,
            failed: item.state === '生成失败',
            selected: item.id && selectedIds.includes(item.id)
          }"
          @click="onSelect(item)"
        >
          <div class="item-index">{{ String(index + 1).padStart(2, '0') }}</div>

          <div class="item-thumb">
            <img v-if="item.src && item.state === '已完成'" :src="item.src" :alt="item.prompt" />
            <div v-else-if="item.state === '生成中'" class="thumb-generating">
              <t-loading size="small" />
            </div>
            <div v-else-if="item.state === '生成失败'" class="thumb-error" @click="(e) => onFailedClick(e, item)">
              <i-refresh size="16" />
              <span class="retry-text">重试</span>
            </div>
            <div v-else class="thumb-empty">
              <i-image-error size="20" />
            </div>
          </div>

          <div class="item-info">
            <div class="info-status">
              <t-tag
                size="small"
                :theme="stateTheme(item.state)"
                variant="light"
                shape="round"
              >
                {{ stateLabel(item.state) }}
              </t-tag>
              <span class="info-duration" v-if="item.duration">{{ item.duration }}s</span>
            </div>
            <div class="info-prompt" :title="item.prompt">{{ item.prompt || $t('studio.storyboard.noPrompt') }}</div>
          </div>

          <div class="item-status-dot" :class="stateDotClass(item.state)" />
        </div>
      </div>
    </div>

    <div class="panel-footer" v-if="!collapsed">
      <div class="footer-stats" v-if="selectedIds.length > 0">
        <span>已选 {{ selectedIds.length }} 项</span>
        <t-link theme="primary" size="small" @click="selectedIds = []">清除</t-link>
      </div>
      <div class="footer-actions">
        <t-button block theme="primary" size="small" @click="onGenerateDirectorBoard">
          <template #icon><i-play size="14" /></template>
          {{ selectedIds.length > 0 ? `生成章节导演板(${selectedIds.length})` : "生成章节导演板" }}
        </t-button>
        <t-button block variant="outline" size="small" @click="onGenerateAll">
          <template #icon><i-pic size="14" /></template>
          {{ selectedIds.length > 0 ? `生成首帧图(${selectedIds.length})` : "生成首帧图" }}
        </t-button>
        <t-button block variant="outline" theme="danger" size="small" :disabled="failedItems.length === 0" @click="onRetryFailed">
          <template #icon><i-refresh size="14" /></template>
          重试失败{{ failedItems.length ? `(${failedItems.length})` : "" }}
        </t-button>
      </div>
    </div>

    <!-- Resize handle -->
    <div ref="resizeHandle" class="resize-handle right" />
  </div>
</template>

<script setup lang="ts">
import { useMouse, useMousePressed } from "@vueuse/core";

interface StoryboardItem {
  id?: number;
  src?: string | null;
  prompt?: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  duration?: number;
  videoDesc?: string;
}

const props = defineProps<{
  storyboard: StoryboardItem[];
  loading?: boolean;
}>();

const selectedId = defineModel<number | null>("selectedId");
const selectedIds = defineModel<number[]>("selectedIds", { default: [] });

const emit = defineEmits<{
  (e: "select", item: StoryboardItem): void;
  (e: "preview", items: StoryboardItem[]): void;
  (e: "selectAll", ids: number[]): void;
  (e: "generateAll", items: StoryboardItem[]): void;
  (e: "generateDirectorBoard", items: StoryboardItem[]): void;
  (e: "retry", item: StoryboardItem): void;
  (e: "retryFailed", ids: number[]): void;
}>();

const collapsed = ref(false);
const panelWidth = defineModel<number>("panelWidth", { default: 320 });

const failedItems = computed(() => props.storyboard.filter(s => s.id && s.state === "生成失败"));

type TagTheme = "default" | "primary" | "danger" | "warning" | "success";

const stateMap: Record<string, { theme: TagTheme; label: string }> = {
  "未生成": { theme: "default", label: $t("studio.state.pending") },
  "生成中": { theme: "warning", label: $t("studio.state.generating") },
  "已完成": { theme: "success", label: $t("studio.state.completed") },
  "生成失败": { theme: "danger", label: $t("studio.state.failed") },
};

function stateTheme(state: string): TagTheme {
  return stateMap[state]?.theme || "default";
}

function stateLabel(state: string): string {
  return stateMap[state]?.label || state;
}

function stateDotClass(state: string): string {
  switch (state) {
    case "已完成": return "dot-success";
    case "生成中": return "dot-warning";
    case "生成失败": return "dot-error";
    default: return "dot-default";
  }
}

function onSelect(item: StoryboardItem) {
  selectedId.value = item.id || null;
  emit("select", item);
}

function onFailedClick(e: Event, item: StoryboardItem) {
  e.stopPropagation();
  emit("retry", item);
}

const isAllSelected = computed(() => {
  const ids = props.storyboard.map(s => s.id).filter((id): id is number => !!id);
  return ids.length > 0 && ids.every(id => selectedIds.value.includes(id));
});

function selectAll() {
  const ids = props.storyboard.map(s => s.id).filter((id): id is number => !!id);
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = ids;
  }
  emit("selectAll", selectedIds.value);
  window.$message.success(isAllSelected.value ? "已取消全选" : `已选中 ${ids.length} 项`);
}

function onGenerateAll() {
  const selectedIdSet = new Set(selectedIds.value);
  const candidates = selectedIds.value.length > 0
    ? props.storyboard.filter(s => s.id && selectedIdSet.has(s.id) && s.state !== "生成中")
    : props.storyboard.filter(s => s.id && s.state !== "已完成" && s.state !== "生成中");

  if (candidates.length === 0) {
    window.$message.info(selectedIds.value.length > 0 ? "选中的分镜都在生成中" : "没有需要生成的分镜");
    return;
  }
  emit("generateAll", candidates);
}

function onGenerateDirectorBoard() {
  const selectedIdSet = new Set(selectedIds.value);
  const candidates = selectedIds.value.length > 0
    ? props.storyboard.filter(s => s.id && selectedIdSet.has(s.id))
    : props.storyboard.filter(s => s.id);

  if (candidates.length === 0) {
    window.$message.info("没有可用于生成章节导演板的分镜");
    return;
  }
  emit("generateDirectorBoard", candidates);
}

function onRetryFailed() {
  const ids = failedItems.value.map(s => s.id).filter((id): id is number => !!id);
  if (ids.length === 0) {
    window.$message.info("没有失败分镜可重试");
    return;
  }
  emit("retryFailed", ids);
}

function onScroll(e: Event) {
  // Infinite scroll placeholder - no action needed for now
  const target = e.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;
  if (scrollTop + clientHeight >= scrollHeight - 20) {
    // Load more if needed
  }
}

// Resize logic
const resizeHandle = ref<HTMLElement | null>(null);
const MIN_WIDTH = 260;
const MAX_WIDTH = 480;

if (typeof window !== "undefined") {
  const { pressed } = useMousePressed({ target: resizeHandle });
  const { x } = useMouse();
  const startX = ref(0);
  const startWidth = ref(320);

  watch(pressed, (isPressed) => {
    if (isPressed) {
      startX.value = x.value;
      startWidth.value = panelWidth.value;
    }
  });

  watchEffect(() => {
    if (pressed.value) {
      const delta = x.value - startX.value;
      panelWidth.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.value + delta));
    }
  });
}
</script>

<style lang="scss" scoped>
.story-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--td-bg-color-container);
  height: 100%;
  position: relative;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--td-border-level-1-color);

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: var(--td-text-color-secondary);
}

.story-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.story-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  margin-bottom: 4px;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  &.active {
    background-color: var(--td-brand-color-light);
    border-color: var(--td-brand-color);
  }

  &.failed {
    border-left: 3px solid var(--td-error-color);
  }
}

.item-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--td-text-color-secondary);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.item-thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-generating,
  .thumb-error,
  .thumb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--td-text-color-disabled);
  }

  .thumb-error {
    color: var(--td-error-color);
    cursor: pointer;
    flex-direction: column;
    gap: 2px;

    &:hover {
      background-color: var(--td-error-color-light);
    }

    .retry-text {
      font-size: 9px;
    }
  }
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .info-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-duration {
    font-size: 11px;
    color: var(--td-text-color-secondary);
  }

  .info-prompt {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.item-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;

  &.dot-success { background-color: var(--td-success-color); }
  &.dot-warning { background-color: var(--td-warning-color); }
  &.dot-error { background-color: var(--td-error-color); }
  &.dot-default { background-color: var(--td-text-color-disabled); }
}

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--td-border-level-1-color);

  .footer-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .footer-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-bottom: 8px;
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;

  &.right {
    right: -2px;
  }

  &:hover {
    background-color: var(--td-brand-color);
  }
}
</style>
