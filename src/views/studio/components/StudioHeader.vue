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
          :placeholder="'选择剧集'"
          size="small"
          auto-width
          :options="episodeOptions"
          @change="onEpisodeChange"
        />
      </div>
    </div>

    <div class="header-center">
      <!-- 工具模式切换：当前为演示状态，点击提示即将支持 -->
      <t-button-group>
        <t-button
          v-for="tool in tools"
          :key="tool.key"
          :theme="activeTool === tool.key ? 'primary' : 'default'"
          variant="text"
          size="small"
          @click="onToolClick(tool.key)"
        >
          <template #icon>
            <component :is="tool.icon" size="16" />
          </template>
          {{ tool.label }}
        </t-button>
      </t-button-group>
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

interface Tool {
  key: string;
  label: string;
  icon: string;
}

const props = defineProps<{
  title: string;
  currentEpisode?: Episode;
  episodes: Episode[];
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "episodeChange", id: number): void;
  (e: "toolChange", key: string): void;
}>();

const activeTool = ref("edit");
const setting = settingStore();

const episodeOptions = computed(() =>
  props.episodes.map(e => ({
    label: e.name,
    value: e.id,
  }))
);

const tools: Tool[] = [
  { key: "edit", label: "编辑", icon: "i-edit" },
  { key: "preview", label: "预览", icon: "i-play" },
  { key: "publish", label: "发布", icon: "i-share" },
];

function onEpisodeChange(value: SelectValue) {
  emit("episodeChange", value as number);
}

function onToolClick(key: string) {
  activeTool.value = key;
  emit("toolChange", key);
  // 暂时只有编辑模式可用，其他提示即将支持
  if (key !== "edit") {
    window.$message.info(`${tools.find(t => t.key === key)?.label}模式即将支持`);
  }
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

.project-info {
  display: flex;
  align-items: center;
  gap: 8px;

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

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}
</style>
