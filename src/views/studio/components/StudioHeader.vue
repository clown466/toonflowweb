<template>
  <div class="studio-header">
    <div class="header-left">
      <div class="project-info">
        <i-carousel-video class="project-icon" size="20" />
        <span class="project-name">{{ title }}</span>
      </div>
      <t-divider layout="vertical" />
      <div class="episode-selector">
        <t-select
          :value="currentEpisode?.id"
          :placeholder="'选择章节工作区'"
          size="small"
          auto-width
          :options="episodeOptions"
          @change="onEpisodeChange"
        />
      </div>
    </div>

    <div class="header-right">
      <t-tooltip content="刷新">
        <t-button variant="text" shape="square" size="small" @click="$emit('refresh')">
          <template #icon><i-refresh size="16" /></template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="设置">
        <t-button variant="text" shape="square" size="small" @click="openSettings">
          <template #icon><i-setting-config size="16" /></template>
        </t-button>
      </t-tooltip>
      <!-- 状态标签改为中性工作台标识，避免误导 -->
      <t-tag variant="light" size="small" theme="primary">
        <i-dashboard-one theme="outline" size="14" />
        工作台
      </t-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectValue } from "tdesign-vue-next";
import settingStore from "@/stores/setting";

interface Episode {
  id: number;
  name: string;
}

const props = defineProps<{
  title: string;
  currentEpisode?: Episode;
  episodes: Episode[];
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "episodeChange", id: number): void;
}>();

const setting = settingStore();

const episodeOptions = computed(() =>
  props.episodes.map(e => ({
    label: e.name,
    value: e.id,
  }))
);

function onEpisodeChange(value: SelectValue) {
  emit("episodeChange", value as number);
}

function openSettings() {
  setting.showSetting = true;
}
</script>

<style lang="scss" scoped>
.studio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background-color: var(--td-bg-color-container);
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-right {
  flex-shrink: 0;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  .project-icon {
    color: var(--td-brand-color);
  }

  .project-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.episode-selector {
  min-width: 0;
}

@media (max-width: 720px) {
  .studio-header {
    height: 44px;
    padding: 0 10px;
    gap: 8px;
  }

  .header-left {
    gap: 8px;
  }

  .header-right {
    gap: 4px;

    :deep(.t-tag) {
      display: none;
    }
  }

  .project-info {
    gap: 6px;

    .project-name {
      max-width: 72px;
    }
  }

  .episode-selector {
    flex: 1;

    :deep(.t-select) {
      width: 100%;
      min-width: 0;
    }
  }
}

</style>
