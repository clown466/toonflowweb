<template>
  <div class="agent-panel" :style="{ width: panelWidth + 'px' }">
    <div ref="resizeHandleRef" class="resize-handle left"></div>

    <div class="panel-header">
      <div class="header-title">
        <span class="title-text">{{ panelTitle }}</span>
      </div>
      <div class="header-actions">
        <t-tooltip :content="connected ? '已连接' : '未连接'" placement="bottom">
          <span class="connection-dot" :class="connected ? 'online' : 'offline'"></span>
        </t-tooltip>
        <t-tooltip content="更多" placement="bottom">
          <t-button variant="text" shape="square" size="small" @click="showMoreMenu = true">
            <template #icon><i-more size="16" /></template>
          </t-button>
        </t-tooltip>
      </div>
    </div>

    <div class="mode-switch">
      <button
        class="mode-btn"
        :class="{ active: mode === 'workspace' }"
        @click="$emit('update:mode', 'workspace')"
      >
        <i-dashboard-one size="14" />
        <span>项目总控</span>
      </button>
      <button
        class="mode-btn"
        :class="{ active: mode === 'production' }"
        @click="$emit('update:mode', 'production')"
      >
        <i-play size="14" />
        <span>生产助手</span>
      </button>
    </div>

    <div class="panel-content">
      <div class="context-bar" v-if="hasStudioContext">
        <t-tag v-if="currentEpisode" size="small" variant="light" theme="primary">{{ currentEpisode.name || `第${currentEpisode.id}集` }}</t-tag>
        <t-tag v-if="selectedStoryboardId" size="small" variant="light" theme="success">分镜 #{{ selectedStoryboardId }}</t-tag>
        <t-tag v-if="selectedStoryboardIds?.length" size="small" variant="light">已选 {{ selectedStoryboardIds.length }}</t-tag>
        <t-tag v-if="selectedAsset" size="small" variant="light" theme="warning">{{ selectedAsset.name || `资产 #${selectedAssetId}` }}</t-tag>
      </div>

      <div class="status-strip">
        <t-tag size="small" :theme="connected ? 'success' : 'danger'" variant="light">
          {{ connected ? '已连接' : '未连接' }}
        </t-tag>
        <span class="strip-text truncate">{{ mode === 'workspace' ? (projectName || '未命名项目') : productionStatusText }}</span>
        <span v-if="mode === 'workspace'" class="strip-meta">资产 {{ workspaceStats.total }}</span>
        <span v-else class="strip-meta">分镜 {{ storyboardStats.completed }}/{{ storyboardStats.total }}</span>
      </div>

      <div v-if="isBusy" class="progress-strip" :class="progressLevelClass">
        <div class="progress-strip-head">
          <span>{{ progressTitle }}</span>
          <span class="elapsed-time">{{ elapsedLabel }}</span>
        </div>
        <div class="progress-desc">{{ progressDescription }}</div>
        <div class="progress-track">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div v-if="progressHint" class="progress-hint">{{ progressHint }}</div>
      </div>

      <div ref="messagesSectionRef" class="messages-section" v-loading="loadingHistory" @load.capture="scrollMessagesToBottom">
        <t-chat-list :clear-history="false">
          <t-chat-message
            v-for="message in messages"
            :key="message.id"
            :message="message"
            :name="(message as any).name"
            :placement="message.role === 'user' ? 'right' : 'left'"
            :variant="message.role === 'user' ? 'base' : 'outline'"
            :handleActions="message.role === 'user' ? {} : handleActions"
            :status="message.status"
            allowContentSegmentCustom
          />
        </t-chat-list>
      </div>
    </div>

    <div class="panel-footer">
      <!-- 建议按钮区 -->
      <div v-if="currentSuggestions.length > 0" class="suggestions-row">
        <t-button
          v-for="item in currentSuggestions"
          :key="item.text"
          variant="outline"
          size="small"
          class="suggestion-btn"
          @click="applySuggestion(item.prompt)"
        >{{ item.text }}</t-button>
      </div>

      <!-- 输入工具栏 -->
      <div class="input-toolbar">
        <!-- + 按钮：引用当前/附件提示 -->
        <t-popup trigger="click" placement="top">
          <t-button variant="text" shape="square" size="small" class="tool-btn">
            <template #icon><i-add size="14" /></template>
          </t-button>
          <template #content>
            <div class="popup-menu">
              <div class="menu-item" @click="insertCurrentSelection">
                <i-focus-one size="14" />
                <span>引用当前选中</span>
              </div>
              <div class="menu-item disabled">
                <i-folder-add size="14" />
                <span>上传附件（即将支持）</span>
              </div>
            </div>
          </template>
        </t-popup>

        <t-divider layout="vertical" />

        <t-select
          v-model="selectedStoryboardSkillId"
          class="storyboard-skill-select"
          size="small"
          clearable
          :loading="storyboardSkillLoading"
          :popup-props="{ overlayClassName: 'storyboard-skill-popup' }"
          placeholder="分镜方法"
          @popup-visible-change="handleStoryboardSkillPopup"
        >
          <t-option key="default" value="" label="默认分镜方法">
            <div class="storyboard-skill-option">
              <span class="skill-name">默认分镜方法</span>
              <span class="skill-desc">使用系统默认分镜生成逻辑</span>
            </div>
          </t-option>
          <t-option
            v-for="skill in storyboardSkills"
            :key="skill.id"
            :value="skill.id"
            :label="storyboardSkillDisplayName(skill)"
          >
            <div class="storyboard-skill-option">
              <span class="skill-name">{{ storyboardSkillDisplayName(skill) }}</span>
              <span class="skill-desc">{{ storyboardSkillDisplayDescription(skill) }}</span>
            </div>
          </t-option>
        </t-select>

        <t-divider layout="vertical" />

        <t-select
          v-model="selectedImageSkillId"
          class="image-skill-select"
          size="small"
          clearable
          :loading="imageSkillLoading"
          :popup-props="{ overlayClassName: 'image-skill-popup' }"
          placeholder="生图预设"
          @popup-visible-change="handleImageSkillPopup"
        >
          <t-option key="default" value="" label="默认生图预设">
            <div class="image-skill-option">
              <span class="skill-name">默认生图预设</span>
              <span class="skill-desc">使用系统默认资产生图逻辑</span>
            </div>
          </t-option>
          <t-option
            v-for="skill in imageGenerationSkills"
            :key="skill.id"
            :value="skill.id"
            :label="imageSkillDisplayName(skill)"
          >
            <div class="image-skill-option">
              <span class="skill-name">{{ imageSkillDisplayName(skill) }}</span>
              <span class="skill-desc">{{ imageSkillDisplayDescription(skill) }}</span>
            </div>
          </t-option>
        </t-select>

        <t-divider layout="vertical" />

        <!-- 预设按钮 -->
        <t-popup trigger="click" placement="top">
          <t-button variant="text" size="small" class="tool-btn">
            <span class="btn-prefix">/</span>
            <span>预设</span>
          </t-button>
          <template #content>
            <div class="popup-menu skills-menu">
              <div class="menu-title">{{ mode === 'workspace' ? '项目预设' : '生产预设' }}</div>
              <div class="search-row">
                <t-input v-model="skillSearch" size="small" clearable placeholder="搜索预设" />
              </div>
              <div
                v-for="skill in filteredSkills"
                :key="skill.name"
                class="menu-item skill-item"
                @click="applySuggestion(resolveSkillPrompt(skill))"
              >
                <div class="skill-info">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span class="skill-desc">{{ skill.desc }}</span>
                </div>
              </div>
            </div>
          </template>
        </t-popup>

        <!-- 模型按钮 -->
        <t-popup trigger="click" placement="top">
          <t-button variant="text" size="small" class="tool-btn">
            <template #icon><i-robot size="14" /></template>
            <span>模型</span>
          </t-button>
          <template #content>
            <div class="popup-menu model-menu">
              <div class="model-info">
                <div class="info-row">
                  <span class="info-label">当前 Agent</span>
                  <span class="info-value">{{ panelTitle }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Agent 模型</span>
                  <span class="info-value">{{ currentModel || '默认' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">项目出图</span>
                  <span class="info-value" :title="currentProjectImageModel">{{ currentProjectImageModel || '未选择' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">视频模型</span>
                  <span class="info-value">{{ videoModel || '项目配置' }}</span>
                </div>
              </div>
              <div class="model-select-row">
                <t-loading :loading="imageModelSaving" size="small">
                  <modelSelect
                    v-model="localProjectImageModel"
                    type="image"
                    size="small"
                    placeholder="选择本项目出图模型"
                    :disabled="imageModelSaving"
                    @change="handleProjectImageModelChange"
                  />
                </t-loading>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item" @click="openSettings">
                <i-setting-config size="14" />
                <span>打开设置</span>
              </div>
            </div>
          </template>
        </t-popup>

        <!-- 元素按钮 -->
        <t-popup trigger="click" placement="top">
          <t-button variant="text" size="small" class="tool-btn">
            <template #icon><i-pic size="14" /></template>
            <span>元素</span>
          </t-button>
          <template #content>
            <div class="popup-menu elements-menu">
              <div class="elements-tabs">
                <div
                  v-for="tab in elementTabs"
                  :key="tab.key"
                  class="tab-item"
                  :class="{ active: activeElementTab === tab.key }"
                  @click="activeElementTab = tab.key"
                >{{ tab.label }}</div>
              </div>
              <div class="search-row">
                <t-input v-model="elementSearch" size="small" clearable placeholder="搜索元素" />
              </div>
              <div class="elements-list">
                <template v-if="activeElementTab === 'storyboard'">
                  <div
                    v-for="item in filteredElementStoryboards"
                    :key="item.id"
                    class="element-item"
                    @click="selectStoryboardElement(item)"
                  >
                    <span class="element-id">#{{ item.id }}</span>
                    <span class="element-name truncate">{{ item.prompt || `分镜#${item.id}` }}</span>
                    <t-tag size="small" :theme="item.state === '已完成' ? 'success' : 'default'" variant="light">{{ item.state || '未生成' }}</t-tag>
                  </div>
                </template>
                <template v-if="activeElementTab === 'assets'">
                  <div
                    v-for="asset in filteredElementAssets"
                    :key="asset.id"
                    class="element-item"
                    @click="selectAssetElement(asset)"
                  >
                    <span class="element-type">{{ asset.type || '其他' }}</span>
                    <span class="element-name truncate">{{ asset.name }}</span>
                  </div>
                </template>
                <template v-if="activeElementTab === 'episodes'">
                  <div class="element-item disabled">
                    <span>章节工作区列表（即将支持）</span>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </t-popup>
      </div>

      <div class="input-box">
        <t-textarea
          v-model="inputValue"
          :placeholder="inputPlaceholder"
          :disabled="status === 'pending' || status === 'streaming' || !connected"
          :autosize="{ minRows: 1, maxRows: 3 }"
          @keydown="onTextareaKeydown"
        />
        <div class="input-actions">
          <div class="action-left">
            <t-tooltip content="设置" placement="top">
              <t-button variant="text" shape="square" size="small" @click="showSettingPopup = true">
                <template #icon><i-setting-config size="16" /></template>
              </t-button>
            </t-tooltip>

            <t-popup v-if="showThink" trigger="click" placement="top">
              <t-button size="small" variant="text" class="think-btn" :class="`level-${thinkLevel}`">
                <template #icon><i-tips size="14" /></template>
                <span>{{ thinkLevelLabel }}</span>
              </t-button>
              <template #content>
                <div class="think-menu">
                  <div
                    v-for="opt in thinkLevelOptions"
                    :key="opt.value"
                    class="menu-item"
                    :class="{ active: thinkLevel === opt.value }"
                    @click="handleUpdateThinkConfig(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                  </div>
                  <div class="think-hint">深度会更慢但判断更稳；卡住时可点停止或切回轻量。</div>
                </div>
              </template>
            </t-popup>
          </div>

          <div class="action-right">
            <t-button
              v-if="status === 'pending' || status === 'streaming'"
              theme="danger"
              variant="outline"
              size="small"
              @click="handleStop"
            >
              <template #icon><i-pause size="14" /></template>
              停止
            </t-button>
            <t-button
              v-else
              theme="primary"
              size="small"
              :disabled="!inputValue.trim() || !connected"
              @click="handleSend"
            >
              <template #icon><i-send size="14" /></template>
              发送
            </t-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 更多菜单 -->
    <t-dialog v-model:visible="showMoreMenu" header="设置" width="320px" :footer="false">
      <div class="more-menu-content">
        <div class="menu-group">
          <div class="group-title">连接</div>
          <div class="menu-item" @click="handleReconnect(); showMoreMenu = false">
            <i-api size="16" />
            <span>重新连接</span>
          </div>
        </div>
        <div class="menu-group">
          <div class="group-title">记忆</div>
          <div class="menu-item" @click="handleClearMemory('message'); showMoreMenu = false">
            <i-delete size="16" />
            <span>清除消息记忆</span>
          </div>
          <div class="menu-item" @click="handleClearMemory('summary'); showMoreMenu = false">
            <i-close size="16" />
            <span>清除摘要记忆</span>
          </div>
          <div class="menu-item danger" @click="handleClearMemory('all'); showMoreMenu = false">
            <i-delete-one size="16" />
            <span>清除全部记忆</span>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 快速设置弹窗 -->
    <t-dialog v-model:visible="showSettingPopup" header="快速设置" width="280px" :footer="false">
      <div class="quick-settings">
        <div class="setting-item">
          <span>思考深度</span>
          <t-radio-group v-model="localThinkLevel" size="small" @change="handleRadioThinkChange">
            <t-radio-button :value="0">关闭</t-radio-button>
            <t-radio-button :value="1">轻</t-radio-button>
            <t-radio-button :value="2">深</t-radio-button>
            <t-radio-button :value="3">极</t-radio-button>
          </t-radio-group>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="openSettings">
          <i-setting-config size="16" />
          <span>打开完整设置</span>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { useMousePressed, useMouse } from "@vueuse/core";
import type { ChatMessagesData } from "@tdesign-vue-next/chat";
import settingStore from "@/stores/setting";
import projectStore from "@/stores/project";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";

interface FlowData {
  storyboard: Array<{
    id?: number;
    state: string;
    src?: string | null;
    prompt?: string;
  }>;
  assets: Array<{
    id: number;
    name: string;
    type?: string;
    derive?: any[];
  }>;
}

const props = defineProps<{
  mode: "workspace" | "production";
  connected: boolean;
  messages: ChatMessagesData[];
  status: string;
  loadingHistory: boolean;
  thinkLevel: number;
  flowData: FlowData;
  projectName?: string;
  episodesCount?: number;
  currentModel?: string;
  imageModel?: string;
  videoModel?: string;
  selectedStoryboardId?: number | null;
  selectedStoryboardIds?: number[];
  selectedAssetId?: number | null;
  selectedAsset?: any | null;
  selectedElements?: any;
  currentEpisode?: { id: number; name?: string } | null;
}>();

const emit = defineEmits<{
  (e: "update:mode", mode: "workspace" | "production"): void;
  (e: "send", text: string): void;
  (e: "stop"): void;
  (e: "clearMemory", type: "message" | "summary" | "all"): void;
  (e: "reconnect"): void;
  (e: "updateThinkConfig", value: number): void;
  (e: "openSettings"): void;
  (e: "selectStoryboard", id: number): void;
  (e: "selectAsset", id: number): void;
}>();

const projectState = projectStore();
const { project, allProject } = storeToRefs(projectState);

// 输入状态
const inputValue = ref("");
const showMoreMenu = ref(false);
const showSettingPopup = ref(false);
const showThink = ref(true);
const panelWidth = defineModel<number>("panelWidth", { default: 410 });
const activeElementTab = ref("storyboard");
const skillSearch = ref("");
const elementSearch = ref("");
const busyStartedAt = ref<number | null>(null);
const now = ref(Date.now());
const imageModelSaving = ref(false);
let progressTimer: ReturnType<typeof setInterval> | null = null;
const currentProjectImageModel = computed(() => project.value?.imageModel || props.imageModel || "");
const localProjectImageModel = ref(currentProjectImageModel.value);

interface StoryboardSkillMeta {
  id: string;
  name: string;
  description?: string;
  path?: string;
  source?: "builtin" | "user";
}

interface ImageGenerationSkillMeta {
  id: string;
  name: string;
  description?: string;
  targetTypes?: string[];
  aspectRatio?: string;
}

const storyboardSkills = ref<StoryboardSkillMeta[]>([]);
const selectedStoryboardSkillId = ref("");
const storyboardSkillLoading = ref(false);
const storyboardSkillLoaded = ref(false);
const imageGenerationSkills = ref<ImageGenerationSkillMeta[]>([]);
const selectedImageSkillId = ref("");
const imageSkillLoading = ref(false);
const imageSkillLoaded = ref(false);

const selectedStoryboardSkill = computed(() =>
  storyboardSkills.value.find((skill) => skill.id === selectedStoryboardSkillId.value),
);
const selectedImageSkill = computed(() =>
  imageGenerationSkills.value.find((skill) => skill.id === selectedImageSkillId.value),
);

function compactText(value: string, maxLength = 18) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function cleanStoryboardSkillDescription(skill: StoryboardSkillMeta) {
  return (skill.description || "")
    .replace(/\s+/g, " ")
    .replace(/^视频制作执行层Agent技能\s*[—-]\s*/, "")
    .trim();
}

function storyboardSkillStyleName(skill: StoryboardSkillMeta) {
  const desc = cleanStoryboardSkillDescription(skill);
  const promptMatch = desc.match(/^导演分镜提示词技法\s*·\s*(.+)$/);
  if (promptMatch) return compactText(promptMatch[1], 14);

  const tableStyleMatch = desc.match(/^分镜表(.+?)约束/);
  if (tableStyleMatch) return compactText(tableStyleMatch[1], 12);

  const narrativeMatch = desc.match(/^分镜表叙事手法\s*·\s*(.+?)\s*[—-]/);
  if (narrativeMatch) return compactText(narrativeMatch[1], 12);

  return "";
}

function storyboardSkillDisplayName(skill: StoryboardSkillMeta) {
  const desc = cleanStoryboardSkillDescription(skill);
  const styleName = storyboardSkillStyleName(skill);

  if (skill.id.includes("storyboard_generation_method")) return "Flova 结构化分镜";
  if (skill.id.includes("storyboard_table_techniques")) return "通用分镜表技法";
  if (skill.id.includes("storyboard_prompt_techniques")) return "通用提示词技法";
  if (/构建分镜表/.test(desc)) return "构建分镜表";
  if (/分镜面板写入/.test(desc)) return "分镜面板写入";
  if (/分镜图生成/.test(desc)) return "分镜图生成";
  if (/^导演分镜提示词技法/.test(desc) && styleName) return `${styleName} · 提示词技法`;
  if (/^分镜表.+?约束/.test(desc) && styleName) return `${styleName} · 表格约束`;
  if (/^分镜表叙事手法/.test(desc) && styleName) return `${styleName} · 叙事分镜`;

  return compactText((skill.name || skill.id).replace(/\.md$/i, "").replace(/_/g, " "), 18);
}

function storyboardSkillDisplayDescription(skill: StoryboardSkillMeta) {
  const desc = cleanStoryboardSkillDescription(skill);

  if (skill.source === "user") return compactText(desc || "用户自定义分镜生成规则", 26);
  if (skill.id.includes("storyboard_generation_method")) return "从章节事件生成分镜表和生产镜头";
  if (skill.id.includes("storyboard_table_techniques")) return "分镜字段、拆镜粒度与表格规则";
  if (skill.id.includes("storyboard_prompt_techniques")) return "提示词结构、参考图标注与画质规则";
  if (/构建分镜表/.test(desc)) return "把小说章节拆成结构化分镜表";
  if (/分镜面板写入/.test(desc)) return "把分镜表写入分镜面板";
  if (/分镜图生成/.test(desc)) return "按分镜面板生成分镜图";
  if (/^导演分镜提示词技法/.test(desc)) return "生成分镜图提示词的风格规则";
  if (/^分镜表.+?约束/.test(desc)) return "约束光影、动作、运镜与转场";
  if (/^分镜表叙事手法/.test(desc)) return "约束景别、节奏、镜头与转场";

  return compactText(desc || "分镜生成规则", 26);
}

function imageSkillTypeLabel(type: string) {
  if (type === "role") return "角色";
  if (type === "scene") return "场景";
  if (type === "tool") return "道具";
  return type;
}

function imageSkillDisplayName(skill: ImageGenerationSkillMeta) {
  const suffix = skill.aspectRatio ? ` (${skill.aspectRatio})` : "";
  return compactText(`${skill.name || skill.id}${suffix}`, 18);
}

function imageSkillDisplayDescription(skill: ImageGenerationSkillMeta) {
  const typeText = Array.isArray(skill.targetTypes) && skill.targetTypes.length
    ? skill.targetTypes.map(imageSkillTypeLabel).join("/")
    : "资产";
  return compactText(`${typeText} · ${skill.description || "资产生图推理规则"}`, 30);
}

watch(currentProjectImageModel, (value) => {
  localProjectImageModel.value = value;
});

const localThinkLevel = computed({
  get: () => props.thinkLevel,
  set: (v) => emit("updateThinkConfig", v),
});

// 设置 store
const setting = settingStore();

// 面板标题
const panelTitle = computed(() => props.mode === "workspace" ? "项目总控" : "生产助手");

// 输入框占位符
const inputPlaceholder = computed(() => {
  if (!props.connected) return "未连接，请检查设置...";
  return props.mode === "workspace" ? "直接说目标：提资产、做分镜、生成视频，总控会自动判断调用..." : "输入指令生成分镜或处理资产...";
});

// 调整大小逻辑
const MIN_WIDTH = 390;
const MAX_WIDTH = 620;
const resizeHandleRef = ref<HTMLElement | null>(null);
const messagesSectionRef = ref<HTMLElement | null>(null);
let autoScrollFrame: number | null = null;
let autoScrollTimers: ReturnType<typeof setTimeout>[] = [];

function clearAutoScrollQueue() {
  if (autoScrollFrame !== null) {
    cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = null;
  }
  autoScrollTimers.forEach((timer) => clearTimeout(timer));
  autoScrollTimers = [];
}

function scrollMessagesToBottom() {
  clearAutoScrollQueue();

  const scrollNow = () => {
    const el = messagesSectionRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  scrollNow();
  void nextTick(() => {
    scrollNow();
    autoScrollFrame = requestAnimationFrame(() => {
      autoScrollFrame = null;
      scrollNow();
    });
    autoScrollTimers.push(setTimeout(scrollNow, 80), setTimeout(scrollNow, 240));
  });
}

function stringifyForScroll(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "object") return "";
  if (seen.has(value)) return "";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => stringifyForScroll(item, seen)).join("|");
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${key}:${stringifyForScroll((value as Record<string, unknown>)[key], seen)}`)
    .join("|");
}

const latestMessageSignature = computed(() =>
  props.messages
    .slice(-4)
    .map((message) => stringifyForScroll({
      id: message.id,
      status: message.status,
      content: (message as any).content,
    }))
    .join("||"),
);

const { pressed } = useMousePressed({ target: resizeHandleRef });
const { x } = useMouse();
const dragStartX = ref(0);
const dragStartWidth = ref(410);

watch(pressed, (isPressed) => {
  if (isPressed) {
    dragStartX.value = x.value;
    dragStartWidth.value = panelWidth.value;
  }
});

watchEffect(() => {
  if (pressed.value) {
    const delta = dragStartX.value - x.value;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.value + delta));
    panelWidth.value = newWidth;
  }
});

// 统计数据
const storyboardStats = computed(() => {
  const storyboard = props.flowData?.storyboard || [];
  const total = storyboard.length;
  const completed = storyboard.filter(s => s.state === "已完成").length;
  const generating = storyboard.filter(s => s.state === "生成中").length;
  return { total, completed, generating };
});

const assetsStats = computed(() => {
  const assets = props.flowData?.assets || [];
  const total = assets.length;
  return { total };
});

const workspaceStats = computed(() => {
  const assets = props.flowData?.assets || [];
  const characters = assets.filter(a => a.type === "role" || a.type === "character").length;
  const scenes = assets.filter(a => a.type === "scene").length;
  const propCount = assets.filter(a => a.type === "tool" || a.type === "prop").length;
  const total = assets.length;
  return { characters, scenes, props: propCount, total };
});

const workspaceReady = computed(() => {
  return (props.episodesCount || 0) > 0 && workspaceStats.value.total > 0;
});

const productionStatusText = computed(() => {
  if (storyboardStats.value.total > 0) {
    const generatingText = storyboardStats.value.generating > 0 ? ` · ${storyboardStats.value.generating} 生成中` : "";
    return `分镜 ${storyboardStats.value.completed}/${storyboardStats.value.total}${generatingText}`;
  }
  return assetsStats.value.total > 0 ? `媒体资产 ${assetsStats.value.total} 个` : "生产助手";
});

const hasStudioContext = computed(() => Boolean(
  props.currentEpisode || props.selectedStoryboardId || props.selectedAsset || props.selectedStoryboardIds?.length,
));

const contextSummary = computed(() => {
  const parts: string[] = [];
  if (props.currentEpisode) parts.push(props.currentEpisode.name || `第${props.currentEpisode.id}集`);
  if (props.selectedStoryboardId) parts.push(`分镜#${props.selectedStoryboardId}`);
  if (props.selectedAsset) parts.push(`资产:${props.selectedAsset.name || props.selectedAssetId}`);
  return parts.length ? parts.join(' · ') : '就绪';
});

const isBusy = computed(() => props.status === "pending" || props.status === "streaming");
const elapsedSeconds = computed(() => {
  if (!busyStartedAt.value) return 0;
  return Math.max(0, Math.floor((now.value - busyStartedAt.value) / 1000));
});
const elapsedLabel = computed(() => {
  const total = elapsedSeconds.value;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}分${seconds.toString().padStart(2, "0")}秒` : `${seconds}秒`;
});
const progressPercent = computed(() => {
  if (!isBusy.value) return 0;
  const seconds = elapsedSeconds.value;
  if (props.status === "pending") return Math.min(28, 8 + seconds * 2);
  return Math.min(92, 32 + seconds * 1.2);
});
const progressTitle = computed(() => props.status === "pending" ? "排队/准备中" : "生成中");
const progressDescription = computed(() => {
  if (props.status === "pending") return "已收到任务，正在等待模型或工具开始响应";
  if (props.mode === "workspace") return "项目总控正在分析项目、调用工具或等待模型输出";
  return "生产助手正在处理分镜、资产或生成任务";
});
const progressHint = computed(() => {
  const seconds = elapsedSeconds.value;
  if (seconds < 20) return "正常任务通常需要几十秒，请稍等";
  if (seconds < 60) return "仍在处理中；如果模型无输出，可点底部「停止」后重试";
  if (seconds < 180) return "已超过 1 分钟，可能在等待模型/API/图片生成接口";
  return "已等待较久，建议点「停止」再重试，或切换模型后重新发送";
});
const progressLevelClass = computed(() => {
  const seconds = elapsedSeconds.value;
  if (seconds >= 180) return "progress-danger";
  if (seconds >= 60) return "progress-warning";
  return "";
});

watch(isBusy, (busy) => {
  if (busy) {
    if (!busyStartedAt.value) busyStartedAt.value = Date.now();
    now.value = Date.now();
    if (!progressTimer) {
      progressTimer = setInterval(() => {
        now.value = Date.now();
      }, 1000);
    }
  } else {
    busyStartedAt.value = null;
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }
}, { immediate: true });

onMounted(() => {
  scrollMessagesToBottom();
  void fetchStoryboardSkills();
});

onActivated(() => {
  scrollMessagesToBottom();
});

watch(
  () => [props.loadingHistory, props.mode, props.messages.length] as const,
  () => nextTick(() => scrollMessagesToBottom()),
  { immediate: true },
);

watch(
  () => latestMessageSignature.value,
  () => scrollMessagesToBottom(),
);

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  clearAutoScrollQueue();
});

// 技能列表
const workspaceSkills = [
  { name: "检查项目状态", desc: "分析小说、资产、分镜、视频进度", prompt: "请检查当前项目的整体状态，并判断下一步应该走小说事件、资产、分镜表、分镜图还是视频生产。" },
  { name: "提取角色场景", desc: "从小说提取资产清单", prompt: "请从当前项目的小说章节中提取角色、场景和道具，并写入资产库；先查重，避免重复创建。" },
  { name: "生成分镜表", desc: "按小说章节拆分镜", prompt: "请基于当前小说章节和资产库生成分镜表，直接进入分镜流程。" },
  { name: "进入生产准备", desc: "由总控判断资产/分镜是否就绪", prompt: "请检查当前项目是否具备生产条件；如果可以，协助规划分镜、导演方案和资产生成步骤。" },
];

const productionSkills = [
  { name: "生成分镜", desc: "批量生成分镜图片", prompt: "请为当前章节工作区的所有分镜生成图片。" },
  { name: "重试失败镜头", desc: "重新生成失败项", prompt: "请重新生成所有生成失败的分镜。" },
  { name: "整理生产资产", desc: "检查和优化资产", prompt: "请检查当前生产资产，优化提示词。" },
];

const currentSkills = computed(() => props.mode === "workspace" ? workspaceSkills : productionSkills);
const filteredSkills = computed(() => {
  const q = skillSearch.value.trim().toLowerCase();
  if (!q) return currentSkills.value;
  return currentSkills.value.filter(skill =>
    skill.name.toLowerCase().includes(q) || skill.desc.toLowerCase().includes(q),
  );
});

function resolveSkillPrompt(skill: { prompt: string }) {
  const lines = [skill.prompt];
  if (props.currentEpisode) lines.push(`当前章节工作区：${props.currentEpisode.name || props.currentEpisode.id} (#${props.currentEpisode.id})`);
  if (props.selectedStoryboardId) lines.push(`当前分镜：#${props.selectedStoryboardId}`);
  if (props.selectedStoryboardIds?.length) lines.push(`当前多选分镜：${props.selectedStoryboardIds.map(id => `#${id}`).join('、')}`);
  if (props.selectedAsset) lines.push(`当前资产：${props.selectedAsset.name || props.selectedAsset.id} (#${props.selectedAsset.id})`);
  return lines.join("\n");
}

// 元素标签
const elementTabs = [
  { key: "storyboard", label: "分镜" },
  { key: "assets", label: "资产" },
  { key: "episodes", label: "章节" },
];

const filteredElementStoryboards = computed(() => {
  const list = props.flowData?.storyboard || [];
  const q = elementSearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(item => String(item.id || '').includes(q) || item.prompt?.toLowerCase().includes(q));
});

const filteredElementAssets = computed(() => {
  const list = props.flowData?.assets || [];
  const q = elementSearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(asset =>
    String(asset.id).includes(q) || asset.name?.toLowerCase().includes(q) || asset.type?.toLowerCase().includes(q),
  );
});

// 建议列表
const workspaceSuggestions = [
  { text: "检查项目", prompt: "请检查当前项目状态，并告诉我下一步该做小说事件、资产、分镜还是视频。" },
  { text: "提资产", prompt: "请从小说章节中提取角色、场景和道具，并写入资产库。" },
  { text: "做分镜表", prompt: "请基于当前小说章节和资产库生成分镜表。" },
  { text: "准备生产", prompt: "请判断项目是否具备生产条件，并规划分镜、导演方案和资产生成步骤。" },
];

const productionSuggestions = [
  { text: "生成分镜", prompt: "请为当前章节工作区生成所有分镜图片。" },
  { text: "重试失败", prompt: "请重新生成所有失败的分镜。" },
  { text: "整理资产", prompt: "请检查和优化当前生产资产。" },
];

const currentSuggestions = computed(() => props.mode === "workspace" ? workspaceSuggestions : productionSuggestions);

// 思考级别选项
const thinkLevelOptions = [
  { label: "关闭", value: 0 },
  { label: "轻量", value: 1 },
  { label: "深度", value: 2 },
  { label: "极致", value: 3 },
];

const thinkLevelLabel = computed(() => {
  return thinkLevelOptions.find(o => o.value === props.thinkLevel)?.label || "轻量";
});

// 消息操作
const handleActions = {
  suggestion: (data?: any) => {
    const prompt = data?.content?.prompt || data?.prompt;
    if (prompt) {
      inputValue.value = prompt;
    }
  },
};

// 方法
function handleSend() {
  const text = inputValue.value.trim();
  if (!text || !props.connected) return;
  emit("send", withSelectedSkillInstructions(text));
  inputValue.value = "";
}

function withSelectedSkillInstructions(text: string) {
  return withImageSkillInstruction(withStoryboardSkillInstruction(text));
}

function isStoryboardGenerationMessage(text: string) {
  return /分镜|镜头|镜号|storyboard|shot/i.test(text);
}

function withStoryboardSkillInstruction(text: string) {
  if (!selectedStoryboardSkillId.value || !isStoryboardGenerationMessage(text)) return text;
  const skill = selectedStoryboardSkill.value;
  const skillText = skill?.name ? `${skill.name}（${selectedStoryboardSkillId.value}）` : selectedStoryboardSkillId.value;
  return `${text}\n\n使用分镜 Skill：${skillText}`;
}

function isAssetImageGenerationMessage(text: string) {
  const isStoryboardOnly = /(分镜图|首帧|导演板|故事板|镜头图|storyboard|shot image)/i.test(text)
    && !/(资产|角色|人物|场景资产|道具|素材|参考图|四视图|俯视图|多角度|全景参考|asset|character|scene asset|prop|reference)/i.test(text);
  if (isStoryboardOnly) return false;
  return /(资产|角色|人物|场景|道具|素材|参考图|生图|出图|生成.*图|图片|图像|四视图|俯视|多角度|全景|透视|image|asset|character|scene|prop|reference)/i.test(text);
}

function withImageSkillInstruction(text: string) {
  if (!selectedImageSkillId.value || !isAssetImageGenerationMessage(text)) return text;
  const skill = selectedImageSkill.value;
  const skillText = skill?.name ? `${skill.name}（skillId: ${selectedImageSkillId.value}）` : `skillId: ${selectedImageSkillId.value}`;
  return `${text}\n\n使用资产生图预设：${skillText}`;
}

async function fetchStoryboardSkills(force = false) {
  if (storyboardSkillLoading.value || (storyboardSkillLoaded.value && !force)) return;
  storyboardSkillLoading.value = true;
  try {
    const { data } = await axios.post("/setting/storyboardGenerationSkill/list");
    storyboardSkills.value = Array.isArray(data) ? data : [];
    storyboardSkillLoaded.value = true;
  } catch {
    storyboardSkills.value = [];
  } finally {
    storyboardSkillLoading.value = false;
  }
}

function handleStoryboardSkillPopup(visible: boolean) {
  if (visible) void fetchStoryboardSkills(true);
}

async function fetchImageGenerationSkills(force = false) {
  if (imageSkillLoading.value || (imageSkillLoaded.value && !force)) return;
  imageSkillLoading.value = true;
  try {
    const { data } = await axios.post("/setting/imageGenerationSkill/list");
    imageGenerationSkills.value = Array.isArray(data) ? data : [];
    imageSkillLoaded.value = true;
  } catch {
    imageGenerationSkills.value = [];
  } finally {
    imageSkillLoading.value = false;
  }
}

function handleImageSkillPopup(visible: boolean) {
  if (visible) void fetchImageGenerationSkills(true);
}

function onTextareaKeydown(_value: unknown, context?: { e: KeyboardEvent }) {
  const e = context?.e;
  if (e?.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    handleSend();
  }
}

function handleRadioThinkChange(value: unknown) {
  handleUpdateThinkConfig(Number(value) || 0);
}

function handleStop() {
  emit("stop");
}

function handleReconnect() {
  emit("reconnect");
}

function handleClearMemory(type: "message" | "summary" | "all") {
  emit("clearMemory", type);
}

function handleUpdateThinkConfig(value: number) {
  emit("updateThinkConfig", value);
}

function applySuggestion(prompt: string) {
  inputValue.value = prompt;
  // 可选：自动发送
  // handleSend();
}

function insertCurrentSelection() {
  const parts: string[] = [];
  if (props.currentEpisode) {
    parts.push(`当前章节工作区：${props.currentEpisode.name || `工作区${props.currentEpisode.id}`} (#${props.currentEpisode.id})`);
  }
  if (props.selectedStoryboardId) {
    const storyboard = props.flowData?.storyboard?.find(item => item.id === props.selectedStoryboardId);
    parts.push(`当前选中分镜：#${props.selectedStoryboardId}${storyboard?.prompt ? `，提示词：${storyboard.prompt}` : ''}`);
  }
  if (props.selectedStoryboardIds?.length) {
    parts.push(`当前多选分镜：${props.selectedStoryboardIds.map(id => `#${id}`).join('、')}`);
  }
  if (props.selectedAsset) {
    const parent = props.selectedAsset.parentAsset;
    parts.push(`当前选中资产：${props.selectedAsset.name || props.selectedAssetId} (#${props.selectedAsset.id})${parent ? `，父资产：${parent.name} (#${parent.id})` : ''}`);
  }
  if (parts.length === 0) {
    window.$message.info("请先选择分镜、资产或章节工作区");
    return;
  }
  inputValue.value = inputValue.value + (inputValue.value ? "\n" : "") + parts.join("\n");
}

function appendToInput(text: string, separator = " ") {
  inputValue.value = inputValue.value + (inputValue.value ? separator : "") + text;
}

function selectStoryboardElement(item: { id?: number; prompt?: string }) {
  if (!item.id) return;
  emit("selectStoryboard", item.id);
  appendToInput(`引用分镜：#${item.id} ${item.prompt || ''}`.trim());
}

function selectAssetElement(asset: { id: number; name?: string }) {
  emit("selectAsset", asset.id);
  appendToInput(`引用资产：#${asset.id} ${asset.name || ''}`.trim());
}

async function handleProjectImageModelChange(value: string) {
  if (!value || value === currentProjectImageModel.value) return;
  const currentProject = project.value;
  if (!currentProject?.id) {
    localProjectImageModel.value = currentProjectImageModel.value;
    window.$message.warning("当前没有可更新的项目");
    return;
  }

  imageModelSaving.value = true;
  try {
    await axios.post("/project/updateImageModel", {
      id: Number(currentProject.id),
      imageModel: value,
    });
    project.value = {
      ...currentProject,
      imageModel: value,
    };
    allProject.value = allProject.value.map((item) =>
      String(item.id) === String(currentProject.id) ? { ...item, imageModel: value } : item,
    );
    window.$message.success("已切换本项目出图模型");
  } catch (err: any) {
    localProjectImageModel.value = currentProjectImageModel.value;
    window.$message.error(err?.message || "出图模型切换失败");
  } finally {
    imageModelSaving.value = false;
  }
}

function openSettings() {
  setting.showSetting = true;
  showSettingPopup.value = false;
  showMoreMenu.value = false;
  emit("openSettings");
}
</script>

<style lang="scss" scoped>
.agent-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  flex-shrink: 0;
  background-color: var(--td-bg-color-container);
  border-left: 1px solid var(--td-border-level-1-color);
}

.resize-handle {
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;

  &:hover {
    background-color: var(--td-brand-color);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;

  .header-title {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;

    .title-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--td-text-color-primary);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 8px;

  &.online {
    background-color: var(--td-success-color);
    animation: pulse 2s infinite;
  }

  &.offline {
    background-color: var(--td-error-color);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.mode-switch {
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
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

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.context-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
  font-size: 12px;
}

.strip-text {
  flex: 1;
  min-width: 0;
  color: var(--td-text-color-primary);
}

.strip-meta {
  flex-shrink: 0;
  color: var(--td-text-color-secondary);
  font-size: 11px;
}

.progress-strip {
  padding: 8px 16px 10px;
  border-bottom: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-brand-color-light);
  flex-shrink: 0;
  animation: shimmer 2s infinite;

  &.progress-warning {
    background-color: var(--td-warning-color-light);
  }

  &.progress-danger {
    background-color: var(--td-error-color-light);
  }
}

.progress-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
}

.elapsed-time {
  font-size: 11px;
  font-weight: 500;
  color: var(--td-brand-color);
  flex-shrink: 0;
}

.progress-warning .elapsed-time {
  color: var(--td-warning-color);
}

.progress-danger .elapsed-time {
  color: var(--td-error-color);
}

.progress-desc {
  line-height: 1.35;
}

.progress-track {
  height: 4px;
  margin-top: 8px;
  border-radius: 999px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.08);
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--td-brand-color), var(--td-success-color));
  transition: width 0.4s ease;
}

.progress-warning .progress-bar {
  background: linear-gradient(90deg, var(--td-warning-color), var(--td-brand-color));
}

.progress-danger .progress-bar {
  background: linear-gradient(90deg, var(--td-error-color), var(--td-warning-color));
}

.progress-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--td-text-color-secondary);
}

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.messages-section {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 18px;
  min-height: 0;

  :deep(.t-chat__list) {
    padding: 0;
  }

  :deep(.t-chat__content) {
    max-width: 100%;
    line-height: 1.65;
  }

  :deep(.t-chat__text) {
    font-size: 14px;
    line-height: 1.65;
  }
}

.panel-footer {
  padding: 8px 14px 10px;
  border-top: 1px solid var(--td-border-level-1-color);
  background-color: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
}

.suggestions-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-bottom: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.suggestion-btn {
  font-size: 11px;
  flex-shrink: 0;
}

.input-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--td-text-color-secondary);

    .btn-prefix {
      color: var(--td-brand-color);
      font-weight: 600;
    }

    &:hover {
      color: var(--td-text-color-primary);
    }
  }
}

.storyboard-skill-select {
  width: 152px;
  flex: 0 0 152px;

  :deep(.t-input) {
    font-size: 12px;
  }
}

.image-skill-select {
  width: 146px;
  flex: 0 0 146px;

  :deep(.t-input) {
    font-size: 12px;
  }
}

:global(.storyboard-skill-popup),
:global(.image-skill-popup) {
  max-width: min(380px, calc(100vw - 24px));
}

:global(.storyboard-skill-popup .t-select-option),
:global(.image-skill-popup .t-select-option) {
  height: auto !important;
  min-height: 48px;
  align-items: flex-start;
  padding: 6px 12px;
  line-height: 1.35;
}

:global(.storyboard-skill-popup .t-select-option__content),
:global(.image-skill-popup .t-select-option__content) {
  width: 100%;
  overflow: hidden;
}

.storyboard-skill-option,
.image-skill-option,
:global(.storyboard-skill-option),
:global(.image-skill-option) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  max-width: 340px;
  padding: 2px 0;

  .skill-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--td-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .skill-desc {
    font-size: 11px;
    line-height: 1.35;
    color: var(--td-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.search-row {
  padding: 6px 10px;
}

.popup-menu {
  padding: 4px 0;
  min-width: 180px;
  max-width: 280px;
  max-height: 320px;
  overflow-y: auto;

  .menu-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--td-text-color-secondary);
    padding: 8px 12px 4px;
    text-transform: uppercase;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--td-bg-color-container-hover);
    }

    &.disabled {
      color: var(--td-text-color-disabled);
      cursor: not-allowed;

      &:hover {
        background: transparent;
      }
    }

    &.danger {
      color: var(--td-error-color);
    }
  }

  .menu-divider {
    height: 1px;
    background-color: var(--td-border-level-1-color);
    margin: 4px 0;
  }
}

.skills-menu {
  min-width: 220px;

  .skill-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;

    .skill-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .skill-name {
        font-weight: 500;
        color: var(--td-text-color-primary);
      }

      .skill-desc {
        font-size: 11px;
        color: var(--td-text-color-secondary);
      }
    }
  }
}

.model-menu {
  min-width: 320px;
  max-width: 360px;

  .model-info {
    padding: 8px 12px;

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 4px 0;

      .info-label {
        color: var(--td-text-color-secondary);
      }

      .info-value {
        color: var(--td-text-color-primary);
        font-weight: 500;
        max-width: 190px;
        overflow: hidden;
        text-align: right;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .model-select-row {
    padding: 4px 12px 10px;
  }
}

.elements-menu {
  min-width: 260px;

  .elements-tabs {
    display: flex;
    padding: 4px 12px;
    gap: 4px;
    border-bottom: 1px solid var(--td-border-level-1-color);

    .tab-item {
      padding: 4px 8px;
      font-size: 12px;
      color: var(--td-text-color-secondary);
      cursor: pointer;
      border-radius: 4px;

      &:hover {
        background-color: var(--td-bg-color-container-hover);
      }

      &.active {
        color: var(--td-brand-color);
        background-color: var(--td-brand-color-light);
      }
    }
  }

  .elements-list {
    max-height: 200px;
    overflow-y: auto;
    padding: 4px 0;

    .element-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;

      &:hover {
        background-color: var(--td-bg-color-container-hover);
      }

      &.disabled {
        color: var(--td-text-color-disabled);
        cursor: not-allowed;
      }

      .element-id,
      .element-type {
        color: var(--td-text-color-secondary);
        font-size: 11px;
        flex-shrink: 0;
      }

      .element-name {
        flex: 1;
        min-width: 0;
        color: var(--td-text-color-primary);

        &.truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}

.input-box {
  background-color: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 10px;
  padding: 10px;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--td-brand-color);
  }

  :deep(.t-textarea__inner) {
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
    resize: none;
  }
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;

  .action-left {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .action-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.think-btn {
  &.level-0 { color: var(--td-text-color-secondary); }
  &.level-1 { color: var(--td-success-color); }
  &.level-2 { color: var(--td-warning-color); }
  &.level-3 { color: var(--td-error-color); }
}

.think-menu {
  padding: 4px 0;
  min-width: 150px;

  .think-hint {
    max-width: 180px;
    padding: 6px 12px 4px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--td-text-color-placeholder);
    border-top: 1px solid var(--td-border-level-1-color);
  }

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

.more-menu-content {
  padding: 8px 0;

  .menu-group {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .group-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--td-text-color-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0 16px;
      margin-bottom: 4px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 13px;

      &:hover {
        background-color: var(--td-bg-color-container-hover);
      }

      &.danger {
        color: var(--td-error-color);
      }
    }
  }
}

.quick-settings {
  padding: 12px;

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;

    span {
      font-size: 13px;
      color: var(--td-text-color-primary);
    }
  }
}
</style>
