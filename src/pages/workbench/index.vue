<template>
  <div class="main" :style="{ height: isElectron ? 'calc(100vh - 32px)' : '100vh' }">
    <div class="menu fc jb">
      <div class="logoBox c">
        <div class="logo"></div>
      </div>
      <div class="itemBox fc ac">
        <t-tooltip
          :content="menu.labelKey ? $t(menu.labelKey) : ''"
          placement="right"
          destroyOnClose
          :showArrow="false"
          v-for="(menu, index) in menuList"
          :key="index">
          <div class="item fc c" v-if="menu.type === 'btn'" :class="{ active: activeMenu == menu.path }" @click="handleClick(menu)">
            <component :is="menu.icon" class="icon" />
          </div>
          <div class="divider" v-if="menu.type === 'divider'"></div>
        </t-tooltip>
      </div>
      <div class="footItem fc ac">
        <t-tooltip :content="$t('workbench.menu.settings')" placement="right" destroyOnClose :showArrow="false">
          <div class="item c" @click="showSetting = true">
            <t-badge :count="needUpdate ? 1 : 0" dot>
              <i-setting-one class="icon" />
            </t-badge>
          </div>
        </t-tooltip>
      </div>
    </div>
    <div class="view" :class="{ 'edge-to-edge-view': isEdgeToEdgeView }">
      <div class="topMenu f ac jb" v-if="project?.id">
        <div class="title">
          <h2>{{ project?.name || $t("workbench.selectProject") }}</h2>
        </div>
        <div class="rightBtnList f ac">
          <t-tooltip
            :content="menu.labelKey ? $t(menu.labelKey) : ''"
            placement="bottom"
            destroyOnClose
            :showArrow="false"
            v-for="(menu, index) in rightBtnList"
            :key="index">
            <div
              class="item fc c"
              v-if="menu.type === 'btn' && (project.projectType === 'novel' || !menu.nodelOnly)"
              :class="{ active: activeMenu == menu.path }"
              @click="handleClick(menu)">
              <component :is="menu.icon" class="icon" />
            </div>
            <div class="divider" v-if="menu.type === 'divider'"></div>
          </t-tooltip>
        </div>
      </div>
      <div class="viewBox">
        <router-view v-slot="{ Component }">
          <KeepAlive :max="10">
            <component :is="Component" :key="routeCacheKey" />
          </KeepAlive>
        </router-view>
      </div>
    </div>
  </div>
  <hello />
  <setting v-if="showSetting" />
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import hello from "@/components/hello.vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import settingStore from "@/stores/setting";
import { NotifyPlugin } from "tdesign-vue-next";
const { showSetting, isElectron, needUpdate } = storeToRefs(settingStore());
const setting = defineAsyncComponent(() => import("@/components/setting/index.vue"));
const menuList = ref([
  { type: "btn", path: "/project", labelKey: "workbench.menu.myProject", icon: "i-folder-close" },
  { type: "btn", path: "/task", labelKey: "workbench.menu.taskCenter", icon: "i-view-list" },
  { type: "btn", path: "/imageHistory", labelKey: "workbench.menu.imageHistory", icon: "i-pic" },
  // { type: "divider" },
]);

const rightBtnList = ref([
  { type: "btn", path: "/novel", labelKey: "workbench.menu.novel", icon: "i-notebook", nodelOnly: true },
  { type: "btn", path: "/cornerScape", labelKey: "workbench.menu.cornerScape", icon: "i-peoples-two" },
  { type: "btn", path: "/studio", labelKey: "workbench.menu.studio", icon: "i-movie", nodelOnly: true },
  { type: "btn", path: "/production", labelKey: "workbench.menu.production", icon: "i-playback-progress", nodelOnly: true },
  { type: "divider" },
  { type: "btn", path: "/assets", labelKey: "workbench.menu.assetCenter", icon: "i-receive" },
]);

const router = useRouter();
const route = useRoute();
const activeMenu = ref(route.path);
const isEdgeToEdgeView = computed(() => route.path === "/studio");
const routeCacheKey = computed(() => {
  const baseKey = route.path;
  if (route.meta.projectScoped) {
    return `${baseKey}:${project.value?.id ?? "none"}`;
  }
  return baseKey;
});

watch(
  () => route.path,
  (newPath) => {
    activeMenu.value = newPath;
  },
);

function handleClick(menu: any) {
  if (menu.needProject && !project.value) return;
  router.push(menu.path);
  activeMenu.value = menu.path;
}

async function checkVersion() {
  const { data } = await axios.post("/setting/about/checkUpdate", {
    source: "toonflow",
  });
  if (data.needUpdate) {
    needUpdate.value = true;
    const { activeMenu: settingActiveMenu } = storeToRefs(settingStore());
    const notifyInstance = NotifyPlugin.success({
      title: $t("version.newVersion") as string,
      content: () =>
        h(
          "div",
          { style: "text-align: right; padding-top: 4px;" },
          h(
            "span",
            {
              style: "color: #ed7b2f; font-size: 12px; cursor: pointer;",
              onClick: () => {
                settingActiveMenu.value = "about";
                showSetting.value = true;
                NotifyPlugin.close(notifyInstance);
              },
            },
            $t("skillScan.openSettings"),
          ),
        ),
      closeBtn: true,
      placement: "bottom-right",
    });
  } else {
    needUpdate.value = false;
  }
}

let checkVersionTimer: ReturnType<typeof setInterval> | null = null;

function startVersionCheck() {
  checkVersion();
  checkVersionTimer = setInterval(
    () => {
      checkVersion();
    },
    2 * 60 * 1000,
  );
}

function stopVersionCheck() {
  if (checkVersionTimer) {
    clearInterval(checkVersionTimer);
    checkVersionTimer = null;
  }
}

watch(needUpdate, (val) => {
  if (val) stopVersionCheck();
});

onMounted(() => {
  startVersionCheck();
});

onUnmounted(() => {
  stopVersionCheck();
});
</script>

<style lang="scss" scoped>
.main {
  width: 100vw;
  padding: 16px;
  display: flex;
  overflow: hidden;
  min-height: 0;

  .menu {
    width: 64px;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    background-color: var(--page);
    border-radius: 16px;
    padding-top: 16px;
    padding-bottom: 16px;
    color: var(--td-text-color-primary);
    .logoBox {
      width: 100%;
      height: fit-content;
      .logo {
        width: 60%;
        aspect-ratio: 1/1;
        background-color: var(--td-text-color-primary);
        mask: url("@/assets/logo.svg") no-repeat center;
        mask-size: contain;
        -webkit-mask: url("@/assets/logo.svg") no-repeat center;
        -webkit-mask-size: contain;
      }
    }
    .itemBox {
      flex: 1;
      margin-top: 16px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      width: 100%;
      height: 100%;
    }
    .footItem {
      width: 100%;
      height: fit-content;
      .item {
        cursor: pointer;
        width: 50px;
        height: 50px;
        .icon {
          font-size: 24px;
        }
        &:hover {
          background-color: var(--td-bg-color-container-hover);
          border-radius: 16px;
        }
      }
      .active {
        background-color: #000 !important;
        border-radius: 16px;
      }
    }
  }
  .menu::-webkit-scrollbar {
    width: 4px;
  }
  .menu::-webkit-scrollbar-thumb {
    background-color: #d5d5d5;
    border-radius: 4px;
    &:hover {
      background-color: #bbb;
    }
  }
  .menu::-webkit-scrollbar-track {
    background-color: transparent;
  }
  .view {
    flex: 1;
    margin-left: 16px;
    background-color: var(--page);
    border-radius: 16px;
    width: 100%;
    min-width: 0;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding-left: 32px;
    padding-right: 32px;

    &.edge-to-edge-view {
      padding-left: 0;
      padding-right: 0;

      .topMenu {
        padding-left: 32px;
        padding-right: 32px;
      }
    }

    .topMenu {
      height: 6vh;
      .rightBtnList {
        .item {
          margin-bottom: 0px !important;
          margin-top: 0px !important;
          margin-right: 4px;
          margin-left: 4px;
        }
        .divider {
          width: 1px;
          height: 24px;
          background-color: var(--td-border-level-1-color);
          margin: 0 4px;
        }
      }
    }
    .viewBox {
      width: 100%;
      height: calc(100% - 6vh);
      min-height: 0;
    }
  }
}

.item {
  margin-bottom: 4px;
  margin-top: 4px;
  cursor: pointer;
  width: 50px;
  height: 50px;
  .icon {
    font-size: 24px;
  }
  .title {
    font-size: 10px;
    white-space: nowrap;
    color: var(--td-text-color-primary);
  }
  &:hover {
    background-color: var(--td-bg-color-container-hover);
    border-radius: 16px;
  }
}
.active {
  background-color: var(--td-brand-color) !important;
  color: var(--td-font-white-1);
  border-radius: 16px;
}
.divider {
  width: 50px;
  height: 1px;
  background-color: var(--td-border-level-1-color);
  margin: 8px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .main {
    padding: 6px;

    .menu {
      width: 48px;
      border-radius: 12px;
      padding-top: 8px;
      padding-bottom: 8px;

      .logoBox .logo {
        width: 28px;
      }

      .itemBox {
        margin-top: 10px;
        margin-bottom: 10px;
        padding-bottom: 10px;
      }

      .footItem .item {
        width: 40px;
        height: 40px;

        .icon {
          font-size: 22px;
        }
      }
    }

    .view {
      margin-left: 6px;
      border-radius: 12px;
      padding-left: 8px;
      padding-right: 8px;

      &.edge-to-edge-view {
        padding-left: 0;
        padding-right: 0;

        .topMenu {
          padding-left: 10px;
          padding-right: 10px;
        }
      }

      .topMenu {
        height: 48px;
        min-height: 48px;
        gap: 8px;

        .title {
          min-width: 0;

          h2 {
            margin: 0;
            font-size: 16px;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .rightBtnList {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 58%;
          overflow-x: auto;
          scrollbar-width: none;

          &::-webkit-scrollbar {
            display: none;
          }

          .item {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;

            .icon {
              font-size: 22px;
            }
          }
        }
      }

      .viewBox {
        height: calc(100% - 48px);
      }
    }
  }

  .item {
    width: 40px;
    height: 40px;

    .icon {
      font-size: 22px;
    }
  }

  .divider {
    width: 40px;
  }
}
</style>
