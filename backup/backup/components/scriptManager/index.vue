<template>
  <div class="scriptManager">
    <!-- 头部区域 -->
    <div class="smHead">
      <div class="headContent">
        <div class="titleSection">
          <div class="iconWrapper">
            <i-file-text :size="28" class="titleIcon" />
          </div>
          <div>
            <h2 class="smTitle">剧本管理</h2>
            <p class="smSub">创作和管理您的精彩剧本</p>
          </div>
        </div>
        <div class="statsSection">
          <div class="statItem">
            <div class="statValue">{{ scripts.length }}</div>
            <div class="statLabel">总剧本数</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="actionBar">
      <div class="searchWrapper">
        <t-input 
          placeholder="搜索剧本名称..." 
          v-model="searchQuery" 
          @change="onChange"
          size="large"
          class="searchInput"
        >
          <template #suffixIcon>
            <i-search :size="18" class="searchIcon" />
          </template>
        </t-input>
      </div>
      <t-button 
        theme="primary" 
        @click="handleAddScript"
        size="large"
        class="addButton"
      >
        <template #icon><i-plus :size="18" /></template>
        新建剧本
      </t-button>
    </div>

    <!-- 内容区域 -->
    <div class="contentArea">
      <!-- 空状态 -->
      <div v-if="scripts.length === 0" class="emptyState">
        <div class="emptyIcon">
          <i-file-text :size="64" />
        </div>
        <h3 class="emptyTitle">还没有剧本</h3>
        <p class="emptyDesc">点击"新建剧本"按钮创建您的第一个剧本</p>
        <t-button theme="primary" @click="handleAddScript" class="emptyAction">
          <template #icon><i-plus :size="16" /></template>
          创建剧本
        </t-button>
      </div>

      <div v-else class="scriptsList">
        <div 
          class="scriptCard" 
          v-for="(item, index) in scripts" 
          :key="item.id"
          @click="handleScriptClick(item)"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <div class="cardHeader">
            <div class="cardIcon">
              <t-image :src="image" fit="cover" class="scriptImage" />
            </div>
            <div class="cardBadge">剧本</div>
          </div>

          <div class="cardBody">
            <h3 class="cardTitle" :title="item.name">{{ item.name }}</h3>
            <p class="cardContent" :title="item.content">
              {{ item.content || '暂无内容描述' }}
            </p>
          </div>

          <div class="cardFooter jb ac">
            <div class="footerItem">
              <i-time :size="14" class="footerIcon" />
              <span class="footerText">{{ dayjs(item.createTime).format("YYYY-MM-DD") }}</span>
            </div>
            <div class="deleteBtn" @click.stop="handleDeleteScript(item.id)" title="删除剧本">
              <i-delete :size="18" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Details v-model="detailsShow" :item="selectedScript" @searchScripts="searchScripts" />
    <AddScript v-model="addScriptShow" @searchScripts="searchScripts" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import dayjs from "dayjs";
import { DialogPlugin, MessagePlugin } from "tdesign-vue-next";
import store from "@/stores";
import image from "@/assets/providers/script.png";
import Details from "./components/details.vue";
import AddScript from "./components/addScript.vue";
import axios from "@/utils/axios";

interface Script {
  id: number;
  name: string;
  content: string;
  createTime?: number;
}

const selectedScript = ref<Script>({
  id: 0,
  name: "",
  content: "",
});

const scripts = ref<Script[]>([]);
const searchQuery = ref("");
const detailsShow = ref(false);
const addScriptShow = ref(false);

const { projectId } = storeToRefs(store());

// 新增剧本
function handleAddScript() {
  addScriptShow.value = true;
}

// 搜索输入变化
function onChange() {
  searchScripts();
}

// 点击剧本卡片
function handleScriptClick(item: Script) {
  selectedScript.value = { ...item };
  detailsShow.value = true;
}
// 搜索剧本
async function searchScripts() {
  try {
    const res = await axios.post("/script/getScrptApi", { 
      projectId: projectId.value, 
      name: searchQuery.value 
    });
    scripts.value = res.data;
  } catch (error) {
    console.error("搜索剧本失败:", error);
    MessagePlugin.error("搜索剧本失败");
  }
}

// 删除剧本
async function handleDeleteScript(scriptId: number) {
  const dialog = DialogPlugin.confirm({
    header: "确认删除",
    body: "确定要删除这个剧本吗？此操作无法撤销。",
    confirmBtn: "删除",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/script/delScript", { id: scriptId });
        MessagePlugin.success("删除成功");
        searchScripts();
        dialog.destroy();
      } catch (error) {
        console.error("删除剧本失败:", error);
        MessagePlugin.error("删除失败");
        dialog.destroy();
      }
    },
    onClose: () => {
      dialog.destroy();
    },
  });
}

onMounted(searchScripts);
</script>

<style lang="scss" scoped>
.scriptManager {
  padding: 24px 32px;
  background: var(--td-bg-color-page);
  .smHead {
    margin-bottom: 32px;
    
    .headContent {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      border-radius: 20px;
      
      .titleSection {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .iconWrapper {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          
          .titleIcon {
            color: white;
          }
        }
        
        .smTitle {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: -0.5px;
        }

        .smSub {
          font-size: 14px;
          margin: 0;
          opacity: 0.9;
        }
      }

      .statsSection {
        .statItem {
          text-align: center;
          
          .statValue {
            font-size: 32px;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 4px;
          }
          
          .statLabel {
            font-size: 12px;
            opacity: 0.9;
          }
        }
      }
    }
  }

  // 操作栏样式
  .actionBar {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
    align-items: center;

    .searchWrapper {
      flex: 1;
      max-width: 500px;
      .searchInput {
        :deep(.t-input) {
          border-radius: 12px;
          border: 2px solid transparent;
          background: var(--td-bg-color-container);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

          &:hover {
            border-color: var(--td-brand-color-hover);
            box-shadow: 0 4px 12px var(--td-brand-color-light-hover);
          }

          &:focus-within {
            border-color: var(--td-brand-color);
            box-shadow: 0 4px 16px var(--td-brand-color-focus);
          }
        }

        .searchIcon {
          color: var(--td-brand-color);
        }
      }
    }

    .addButton {
      border-radius: 12px;
      padding: 0 24px;
      height: 44px;
      font-weight: 600;
      box-shadow: 0 4px 12px var(--td-brand-color-focus);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px var(--td-brand-color-light-hover);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  // 内容区域
  .contentArea {
    // 空状态样式
    .emptyState {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      background: var(--td-bg-color-container);
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

      .emptyIcon {
        width: 120px;
        height: 120px;
        background: var(--td-brand-color-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;

        :deep(svg) {
          color: var(--td-brand-color);
        }
      }

      .emptyTitle {
        font-size: 24px;
        font-weight: 600;
        color: var(--td-text-color-primary);
        margin: 0 0 8px 0;
      }

      .emptyDesc {
        font-size: 14px;
        color: var(--td-text-color-secondary);
        margin: 0 0 24px 0;
      }

      .emptyAction {
        border-radius: 12px;
        padding: 0 24px;
      }
    }

    // 剧本列表样式
    .scriptsList {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      animation: fadeIn 0.5s ease;

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .scriptCard {
        position: relative;
        background: var(--td-bg-color-container);
        border-radius: 16px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        animation: slideIn 0.5s ease backwards;

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        &::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--td-brand-color) 0%, var(--td-brand-color-active) 100%);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        &:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px var(--td-brand-color-focus);

          &::before {
            transform: scaleX(1);
          }
        }

        // 删除按钮
        .deleteBtn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--td-bg-color-container);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--td-component-border);

          &:hover {
            background: var(--td-error-color);
            border-color: var(--td-error-color);
            transform: scale(1.1);

            :deep(svg) {
              color: var(--td-text-color-anti);
            }
          }

          :deep(svg) {
            color: var(--td-error-color);
            transition: color 0.2s ease;
          }
        }

        // 卡片头部
        .cardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;

          .cardIcon {
            width: 64px;
            height: 64px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

            .scriptImage {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          }

          .cardBadge {
            padding: 6px 12px;
            background: var(--td-brand-color-light);
            color: var(--td-brand-color);
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
          }
        }

        // 卡片内容
        .cardBody {
          margin-bottom: 16px;

          .cardTitle {
            font-size: 18px;
            font-weight: 600;
            color: var(--td-text-color-primary);
            margin: 0 0 8px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .cardContent {
            font-size: 14px;
            color: var(--td-text-color-secondary);
            line-height: 1.6;
            margin: 0;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
            min-height: 44px;
          }
        }

        // 卡片底部
        .cardFooter {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--td-bg-color-component);

          .footerItem {
            display: flex;
            align-items: center;
            gap: 6px;

            .footerIcon {
              color: var(--td-text-color-placeholder);
            }

            .footerText {
              font-size: 13px;
              color: var(--td-text-color-secondary);
            }
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .scriptManager {
    .contentArea .scriptsList {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
  }
}

@media (max-width: 768px) {
  .scriptManager {
    padding: 16px;

    .smHead .headContent {
      flex-direction: column;
      gap: 16px;
      text-align: center;

      .titleSection {
        flex-direction: column;
      }
    }

    .actionBar {
      flex-direction: column;

      .searchWrapper {
        max-width: 100%;
        width: 100%;
      }

      .addButton {
        width: 100%;
      }
    }

    .contentArea .scriptsList {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
}
</style>
