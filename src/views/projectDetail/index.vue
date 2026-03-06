<template>
  <div class="projectDetail">
    <!-- header -->
    <div class="detailHeader">
      <div class="headerBar">
        <div class="headerLeft">
          <t-breadcrumb>
            <t-breadcrumbItem @click="onBack" style="cursor: pointer">
              <i-ad-product theme="outline" size="16" style="margin-right: 4px" />
              我的项目
            </t-breadcrumbItem>
            <t-breadcrumbItem v-if="project?.name">
              {{ project.name }}
            </t-breadcrumbItem>
            <t-breadcrumbItem v-if="currentSubViewLabel">
              {{ currentSubViewLabel }}
            </t-breadcrumbItem>
            <template v-slot:separator>
              <i-right theme="outline" size="14" />
            </template>
          </t-breadcrumb>
        </div>
      </div>
      <!-- sub nav -->
      <div class="jb ac">
        <div class="nav">
          <button
            v-for="item in subNavItems"
            :key="item.id"
            class="navBtn"
            :class="{ navActive: item.id === currentSubView }"
            @click="setCurrent(item.id)">
            <component :is="item.icon" :size="18" />
            <span class="navLabel">{{ item.label }}</span>
          </button>
        </div>
        <div class="f">
          <div style="cursor: pointer; color: var(--td-brand-color)" @click="assetsFn">
            <t-icon name="system-3-filled" size="15" />
            <span style="margin-left: 5px">项目资产</span>
          </div>
          <div class="ac" style="margin-left: 20px; cursor: pointer; color: var(--td-brand-color)" @click="taskFn">
            <t-icon name="tips-double-filled" size="15" />
            <span style="margin-left: 5px">任务中心</span>
          </div>
        </div>
      </div>
    </div>
    <!-- main -->
    <div class="main">
      <overview v-if="currentSubView === 'overview'" />
      <originalNovalText v-if="currentSubView === 'originalNovalText'" />
      <!-- <outlineManager v-if="currentSubView === 'outline'" /> -->
      <!-- <assetsManager v-if="currentSubView === 'assets'" /> -->
      <scriptManager v-if="currentSubView === 'script'" />
    </div>
    <myTask v-model="visible" />
    <projectAssets v-model="projectAssetsShow" />
  </div>
</template>

<script setup lang="ts">
import store from "@/stores";
import overview from "./components/overview/index.vue";
import originalNovalText from "./components/originalNovalText/index.vue";
// import outlineManager from "./components/outlineManager/index.vue";
// import assetsManager from "./components/assetsManager/index.vue";
import scriptManager from "./components/scriptManager/index.vue";
import myTask from "./components/myTask/index.vue";
import projectAssets from "./components/projectAssets/indev.vue";

const { project } = storeToRefs(store());

const route = useRoute();
const projectId = Number(route.query.id as string);

onMounted(async () => {
  await store().setProjectById(projectId);
});

const router = useRouter();

type SubView = "overview" | "originalNovalText" | "outline" | "assets" | "script";

const subNavItems = [
  { id: "overview" as SubView, label: "项目概览", icon: "i-more-app" },
  { id: "originalNovalText" as SubView, label: "小说原文", icon: "i-file-text" },
  { id: "outline" as SubView, label: "大纲管理", icon: "i-mindmap-list" },
  { id: "script" as SubView, label: "剧本管理", icon: "i-ad-product" },
  { id: "assets" as SubView, label: "资产管理", icon: "i-data-file" },
];

const currentSubView = ref<SubView>("overview");

// 计算当前视图的标签文本
const currentSubViewLabel = computed(() => {
  const item = subNavItems.find((item) => item.id === currentSubView.value);
  return item ? item.label : "";
});

function setCurrent(key: SubView) {
  currentSubView.value = key;
}

function onBack() {
  router.push("/project");
}
const visible = ref<boolean>(false);
function taskFn() {
  visible.value = true;
}
const projectAssetsShow = ref<boolean>(false);
function assetsFn() {
  projectAssetsShow.value = true;
}
</script>

<style lang="scss" scoped>
.projectDetail {
  min-width: 800px;
  display: flex;
  flex-direction: column;
  height: 100%;

  .detailHeader {
    height: 100px;
    background: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-border-level-1-color);
    padding: 8px 24px 8px 32px;

    .headerBar {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .headerLeft {
        display: flex;
        align-items: center;
        margin: 10px;
        gap: 16px;
        :deep(.t-breadcrumb) {
          font-size: 18px;
          font-weight: 900;
        }
      }
    }

    .nav {
      margin-top: 5px;
      display: flex;
      gap: 8px;
      overflow-x: auto;

      .navBtn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        font-size: 14px;
        border-radius: 8px;
        background: var(--td-bg-color-secondarycontainer);
        color: var(--td-text-color-primary);
        white-space: nowrap;
        border: none;
        outline: none;
        cursor: pointer;
        transition: all 0.18s;

        &.navActive {
          background: var(--td-brand-color);
          color: var(--td-text-color-anti);
        }

        &:not(.navActive):hover {
          background: var(--td-bg-color-secondarycontainer-hover);
        }

        .navLabel {
          font-weight: 500;
        }
      }
    }
  }

  .main {
    height: calc(100vh - 100px);
    overflow: auto;
    padding-left: 5%;
    padding-right: 5%;
    padding-bottom: 50px;
  }
}
</style>
