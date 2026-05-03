<template>
  <div class="preview-panel">
    <div class="panel-header">
      <div class="header-title">
        <i-preview-open size="16" />
        <span>{{ $t("studio.preview.title") }}</span>
      </div>
      <div class="header-actions">
        <t-button-group>
          <t-button variant="text" size="small" :theme="viewMode === 'image' ? 'primary' : 'default'" @click="viewMode = 'image'">
            <template #icon><i-image size="14" /></template>
          </t-button>
          <t-tooltip :content="videoModeAvailable ? '视频预览' : '视频模式即将支持'">
            <t-button variant="text" size="small" :disabled="!videoModeAvailable" :theme="viewMode === 'video' ? 'primary' : 'default'" @click="viewMode = 'video'">
              <template #icon><i-video size="14" /></template>
            </t-button>
          </t-tooltip>
        </t-button-group>
        <t-divider layout="vertical" />
        <t-button
          variant="text"
          shape="square"
          size="small"
          :disabled="!canGenerate"
          :loading="loading"
          @click="onGenerate"
        >
          <template #icon><i-play size="16" /></template>
        </t-button>
      </div>
    </div>

    <div class="panel-body">
      <div v-if="!storyboard && !loading" class="empty-state">
        <t-empty :title="$t('studio.preview.empty')" :description="$t('studio.preview.emptyDesc')">
          <template #action>
            <t-button theme="primary" @click="onCreateFirst">
              {{ $t("studio.preview.createFirst") }}
            </t-button>
          </template>
        </t-empty>
      </div>

      <div v-else-if="loading" class="loading-state">
        <t-loading size="medium" :text="$t('studio.preview.generating')" />
      </div>

      <div v-else class="preview-content">
        <div class="preview-main" :class="{ 'has-assets': relatedAssets.length > 0 }">
          <div class="preview-image-wrapper">
            <img
              v-if="storyboard?.src && storyboard.state === '已完成'"
              :src="storyboard.src"
              :alt="storyboard.prompt"
              class="preview-image"
              @click="showImagePreview = true"
            />
            <div v-else-if="storyboard?.state === '生成中'" class="preview-placeholder generating">
              <t-loading size="large" :text="$t('studio.state.generating')" />
            </div>
            <div v-else-if="storyboard?.state === '生成失败'" class="preview-placeholder error" @click="onRetry">
              <i-refresh size="32" />
              <span>{{ $t("studio.preview.retry") }}</span>
            </div>
            <div v-else class="preview-placeholder empty">
              <i-image-error size="48" />
              <span>{{ $t("studio.preview.notGenerated") }}</span>
            </div>
          </div>

          <div class="preview-overlay" v-if="storyboard?.src">
            <div class="overlay-actions">
              <t-button variant="text" shape="square" @click="showImagePreview = true">
                <template #icon><i-preview-open size="18" /></template>
              </t-button>
              <t-button variant="text" shape="square" @click="onEdit">
                <template #icon><i-edit size="18" /></template>
              </t-button>
              <t-button variant="text" shape="square" @click="onDownload">
                <template #icon><i-download size="18" /></template>
              </t-button>
            </div>
          </div>
        </div>

        <!-- Related Assets -->
        <div v-if="relatedAssets.length > 0" class="related-assets">
          <div class="assets-title">{{ $t("studio.preview.relatedAssets") }}</div>
          <div class="assets-list">
            <div
              v-for="asset in relatedAssets"
              :key="asset.id"
              class="asset-item"
              :class="{ selected: selectedAsset?.id === asset.id }"
              @click="selectedAsset = asset"
            >
              <img v-if="asset.src" :src="asset.src" />
              <div v-else class="asset-placeholder">
                <i-user size="16" />
              </div>
              <span class="asset-name">{{ asset.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-footer" v-if="storyboard">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">{{ $t("studio.preview.duration") }}</span>
          <span class="info-value">{{ storyboard.duration || 0 }}s</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t("studio.preview.track") }}</span>
          <span class="info-value">{{ storyboard.trackId || "-" }}</span>
        </div>
        <div class="info-item wide">
          <span class="info-label">{{ $t("studio.preview.prompt") }}</span>
          <t-tooltip :content="storyboard.prompt" placement="top">
            <span class="info-value truncate">{{ storyboard.prompt || $t("studio.preview.noPrompt") }}</span>
          </t-tooltip>
        </div>
      </div>
    </div>

    <!-- Image Preview Dialog -->
    <t-image-viewer
      v-model:visible="showImagePreview"
      :images="previewImages"
      :default-index="0"
    />
  </div>
</template>

<script setup lang="ts">
interface StoryboardItem {
  id?: number;
  src?: string | null;
  prompt?: string;
  state: string;
  duration?: number;
  trackId?: number;
  videoDesc?: string;
  associateAssetsIds?: number[];
}

interface Asset {
  id: number;
  name: string;
  src?: string | null;
  type?: string;
}

const props = defineProps<{
  storyboard?: StoryboardItem;
  assets: any[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "generate"): void;
  (e: "retry"): void;
  (e: "edit"): void;
  (e: "createFirst"): void;
}>();

const viewMode = ref("image");
const videoModeAvailable = ref(false); // 视频模式暂未支持
const showImagePreview = ref(false);
const selectedAsset = ref<Asset | null>(null);
const previewImages = computed(() => (props.storyboard?.src ? [props.storyboard.src] : []));

const canGenerate = computed(() => {
  return props.storyboard && props.storyboard.state !== "生成中";
});

const relatedAssets = computed(() => {
  if (!props.storyboard?.associateAssetsIds?.length) return [];
  return props.assets.filter(a =>
    props.storyboard?.associateAssetsIds?.includes(a.id)
  ).slice(0, 4);
});

function onGenerate() {
  emit("generate");
}

function onRetry() {
  emit("retry");
}

function onEdit() {
  emit("edit");
}

function onDownload() {
  if (props.storyboard?.src) {
    window.open(props.storyboard.src, "_blank");
  }
}

function onCreateFirst() {
  emit("createFirst");
  window.$message.info("请在左侧分镜列表中创建第一个分镜，或让 Agent 帮你生成");
}
</script>

<style lang="scss" scoped>
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--td-bg-color-container);
  min-height: 0;
  overflow: hidden;
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
    align-items: center;
    gap: 8px;
  }
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.preview-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
  min-height: 200px;

  &.has-assets {
    padding-bottom: 8px;
  }
}

.preview-image-wrapper {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--td-bg-color-secondarycontainer);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

  .preview-image {
    max-width: 100%;
    max-height: 480px;
    object-fit: contain;
    cursor: zoom-in;
  }
}

.preview-placeholder {
  width: 320px;
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--td-text-color-secondary);
  border: 2px dashed var(--td-border-level-2-color);
  border-radius: 12px;

  &.generating {
    border-style: solid;
    border-color: var(--td-warning-color);
  }

  &.error {
    color: var(--td-error-color);
    cursor: pointer;

    &:hover {
      background-color: var(--td-error-color-light);
    }
  }

  &.empty {
    color: var(--td-text-color-disabled);
  }
}

.preview-overlay {
  position: absolute;
  top: 16px;
  right: 16px;

  .overlay-actions {
    display: flex;
    gap: 8px;
    opacity: 0.8;

    &:hover {
      opacity: 1;
    }
  }
}

.related-assets {
  padding: 8px 16px 16px;
  border-top: 1px solid var(--td-border-level-1-color);

  .assets-title {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-bottom: 8px;
  }

  .assets-list {
    display: flex;
    gap: 8px;
  }

  .asset-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;

    &:hover {
      background-color: var(--td-bg-color-container-hover);
    }

    &.selected {
      border-color: var(--td-brand-color);
      background-color: var(--td-brand-color-light);
    }

    img {
      width: 48px;
      height: 48px;
      border-radius: 6px;
      object-fit: cover;
    }

    .asset-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 6px;
      background-color: var(--td-bg-color-secondarycontainer);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--td-text-color-disabled);
    }

    .asset-name {
      font-size: 10px;
      color: var(--td-text-color-secondary);
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    &.wide {
      grid-column: span 3;
    }

    .info-label {
      font-size: 11px;
      color: var(--td-text-color-secondary);
    }

    .info-value {
      font-size: 12px;
      color: var(--td-text-color-primary);
      font-weight: 500;

      &.truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
