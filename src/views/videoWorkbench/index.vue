<template>
  <div class="video-workbench-page">
    <div class="video-workbench-header">
      <div class="header-title">
        <i-playback-progress size="18" />
        <span>{{ $t("workbench.menu.production") }}</span>
      </div>
      <div class="header-actions">
        <t-select
          :value="episodesId"
          :options="episodeOptions"
          size="small"
          auto-width
          filterable
          :placeholder="$t('workbench.production.selectPlaceholder')"
          @change="handleEpisodeChange"
        />
        <t-button size="small" variant="outline" :loading="loading" @click="refreshWorkbench">
          <template #icon><i-refresh size="14" /></template>
          {{ $t("workbench.production.getFlowData") }}
        </t-button>
      </div>
    </div>

    <StudioVideoCanvas class="video-workbench-canvas" />
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import productionAgentStore from "@/stores/productionAgent";
import StudioVideoCanvas from "@/views/studio/components/StudioVideoCanvas.vue";

const { project } = storeToRefs(projectStore());
const prodStore = productionAgentStore();
const { episodesId } = storeToRefs(prodStore);
provide("episodesId", episodesId);

const loading = ref(false);
const episodeOptions = ref<Array<{ label: string; value: number }>>([]);

async function loadEpisodes() {
  if (!project.value?.id) {
    episodeOptions.value = [];
    return;
  }
  const { data } = await axios.post("/script/getScrptApi", {
    projectId: project.value.id,
    name: "",
    includeFlovaProductionContainer: true,
  });
  episodeOptions.value = (data || []).map((episode: any) => ({
    label: episode.name,
    value: episode.id,
  }));
  if (!episodesId.value && episodeOptions.value.length > 0) {
    episodesId.value = episodeOptions.value[0].value;
  }
}

function handleEpisodeChange(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const nextId = Number(rawValue);
  if (!Number.isFinite(nextId) || nextId === episodesId.value) return;
  episodesId.value = nextId;
  prodStore.updateContext?.();
  void prodStore.getFlowData();
}

async function refreshWorkbench() {
  loading.value = true;
  try {
    await loadEpisodes();
    if (episodesId.value) await prodStore.getFlowData();
  } catch (err: any) {
    window.$message.error(err?.message || "视频工作台刷新失败");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void refreshWorkbench();
});

watch(
  () => project.value?.id,
  () => {
    episodesId.value = undefined;
    void refreshWorkbench();
  },
);
</script>

<style lang="scss" scoped>
.video-workbench-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background-color: var(--td-bg-color-page);
}

.video-workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-container);
  flex-shrink: 0;
}

.header-title,
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  min-width: 0;
  color: var(--td-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.header-actions {
  flex-shrink: 0;
}

.video-workbench-canvas {
  flex: 1;
  min-height: 0;
}

@media (max-width: 720px) {
  .video-workbench-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
