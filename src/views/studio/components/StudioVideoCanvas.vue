<template>
  <div class="studio-video-canvas">
    <div class="canvas-toolbar">
      <div class="canvas-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="canvas-tab"
          :class="{ active: activeTab === tab.key }"
          @click="changeTab(tab.key)"
        >
          <component :is="tab.icon" size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
      <div class="canvas-actions">
        <t-button variant="text" size="small" @click="refreshMaterial">
          <template #icon><i-refresh size="15" /></template>
          刷新素材
        </t-button>
      </div>
    </div>

    <div class="canvas-content">
      <div v-if="!episodesId" class="canvas-empty">
        <t-empty title="暂无生产容器" description="请先让项目总控生成分镜或选择一个生产剧集" />
      </div>

      <template v-else>
        <PreviewWorkbench v-if="activeTab === 'preview'" />
        <GenerateWorkbench v-if="activeTab === 'generate'" v-model="extractLines" @importVideo="handleBatchDownload" />
        <EditVideoWorkbench
          v-if="activeTab === 'editVideo'"
          ref="editVideoRef"
          :initial-tracks="mockTracks"
          :initial-video-items="initialVideoItems"
          :initial-media-items="mockMediaItems"
          :initial-audio-items="mockAudioItems"
          :initial-image-items="mockImageItems"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
        />
      </template>
    </div>

    <div v-if="importLoading" class="canvas-loading-mask">
      <t-loading size="large" text="正在导入素材" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import PreviewWorkbench from "@/views/production/components/workbench/preview.vue";
import GenerateWorkbench from "@/views/production/components/workbench/generate/index.vue";
import EditVideoWorkbench from "@/views/production/components/workbench/editVideo/index.vue";
import { generateId, type Track } from "vue-clip-track";
import type { MediaItem, AudioItem } from "@/views/production/components/workbench/editVideo/utils/mediaData";

type CanvasTab = "preview" | "generate" | "editVideo";
type MediaType = "image" | "video" | "audio" | "unknown";
type ImportVideoItem = {
  trackId: number;
  videoId: number;
  src: string;
  duration: number;
};

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number | undefined>>("episodesId");

const tabs: Array<{ key: CanvasTab; label: string; icon: string }> = [
  { key: "preview", label: "快速预览", icon: "i-blackboard" },
  { key: "generate", label: "视频生成", icon: "i-playback-progress" },
  { key: "editVideo", label: "视频剪辑", icon: "i-editing" },
];

const activeTab = ref<CanvasTab>("preview");
const canvasWidth = ref(1920);
const canvasHeight = ref(1080);
const initialVideoItems = ref<MediaItem[]>([]);
const mockMediaItems = ref<MediaItem[]>([]);
const mockAudioItems = ref<AudioItem[]>([]);
const mockImageItems = ref<MediaItem[]>([]);
const extractLines = ref(false);
const importLoading = ref(false);
const editVideoRef = ref<InstanceType<typeof EditVideoWorkbench>>();

function createDemoTracks(): Track[] {
  const createTrack = (type: Track["type"], name: string, order: number, isMain = false): Track => ({
    id: generateId("track-"),
    type,
    name,
    visible: true,
    locked: false,
    clips: [],
    order,
    ...(isMain && { isMain }),
  });
  return [
    createTrack("video", "主轨道", 0, true),
    createTrack("audio", "音频", 2),
    createTrack("subtitle", "字幕", 3),
    createTrack("filter", "滤镜", 4),
  ];
}

const mockTracks = createDemoTracks();

function applyProjectCanvasSize() {
  const size = project.value?.videoRatio;
  if (size === "1:1") {
    canvasWidth.value = 1080;
    canvasHeight.value = 1080;
    return;
  }
  if (size === "9:16") {
    canvasWidth.value = 1080;
    canvasHeight.value = 1920;
    return;
  }
  canvasWidth.value = 1920;
  canvasHeight.value = 1080;
}

function getMediaType(src?: string): MediaType {
  if (!src) return "unknown";
  const ext = src.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "unknown";
}

async function refreshMaterial() {
  if (!project.value?.id || !episodesId?.value) return;
  try {
    const { data } = await axios.post("/assets/getMaterialData", {
      projectId: project.value.id,
      scriptId: episodesId.value,
    });
    const materialList = data?.data ?? [];
    const storyboardVideos = data?.video ?? [];
    const videoList = materialList.filter((item: any) => getMediaType(item.filePath) === "video");
    const audioList = materialList.filter((item: any) => getMediaType(item.filePath) === "audio");
    const imageList = materialList.filter((item: any) => getMediaType(item.filePath) === "image");

    initialVideoItems.value = storyboardVideos.flatMap((item: any, index: number) => {
      if (!Array.isArray(item.video)) return [];
      return item.video.map((subItem: any, subIndex: number) => ({
        id: `video-${subItem.id}`,
        type: "video",
        name: `#分镜视频 ${index + 1}-${subIndex + 1}`,
        duration: subItem.duration || 0,
        icon: "V",
        color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        url: subItem.filePath,
        selected: item.videoId === subItem.id,
      }));
    });
    mockMediaItems.value = videoList.map((item: any) => ({
      id: `video-${item.id}`,
      type: "video",
      name: item.name,
      duration: item.duration || 0,
      icon: "V",
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      url: item.filePath,
      loading: true,
    }));
    mockAudioItems.value = audioList.map((item: any) => ({
      id: `audio-${item.id}`,
      type: "audio",
      name: item.name,
      duration: item.duration || 0,
      url: item.filePath,
      loading: true,
    }));
    mockImageItems.value = imageList.map((item: any) => ({
      id: `image-${item.id}`,
      type: "image",
      name: item.name,
      duration: item.duration || 5,
      icon: "I",
      color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      url: item.filePath,
      loading: true,
    }));
  } catch (err: any) {
    window.$message.error(err?.message || "素材刷新失败");
  }
}

function changeTab(tab: CanvasTab) {
  activeTab.value = tab;
  if (tab === "editVideo") void refreshMaterial();
}

function handleBatchDownload(_value: ImportVideoItem[]) {
  void refreshMaterial();
}

onMounted(() => {
  applyProjectCanvasSize();
  void refreshMaterial();
});

watch(
  () => [project.value?.videoRatio, project.value?.id, episodesId?.value] as const,
  () => {
    applyProjectCanvasSize();
    void refreshMaterial();
  },
);
</script>

<style lang="scss" scoped>
.studio-video-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
  overflow: hidden;
  background-color: var(--td-bg-color-container);
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
}

.canvas-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.canvas-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background-color: var(--td-bg-color-container-hover);
  }

  &.active {
    color: var(--td-brand-color);
    background-color: var(--td-brand-color-light);
    border-color: var(--td-brand-color);
  }
}

.canvas-content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  :deep(.previewContainer),
  :deep(.index),
  :deep(.editVideo) {
    width: 100%;
    height: 100%;
  }

  :deep(.previewContainer) {
    background-color: var(--td-bg-color-container);
  }
}

.canvas-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-loading-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
}
</style>
