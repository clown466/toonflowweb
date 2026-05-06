<template>
  <div class="storyboardGenerationSkill">
    <aside class="skillList">
      <div class="toolbar">
        <t-input v-model="keyword" clearable placeholder="搜索分镜 Skill" />
        <t-button theme="primary" @click="createSkill">
          <template #icon><t-icon name="add" /></template>
          新建
        </t-button>
      </div>

      <div class="listBody">
        <div
          v-for="skill in filteredSkills"
          :key="skill.id"
          class="skillItem"
          :class="{ active: skill.id === activeId }"
          @click="loadSkill(skill.id)">
          <div class="itemTitle">{{ skill.name }}</div>
          <div class="itemMeta">
            <t-tag v-if="skill.source === 'user'" size="small" theme="success" variant="light-outline">自定义</t-tag>
            <t-tag v-else size="small" variant="outline">内置</t-tag>
            <t-tag v-if="skill.defaultShotsPerBeat" size="small" variant="outline">
              {{ skill.defaultShotsPerBeat }} 镜/节拍
            </t-tag>
          </div>
          <div v-if="skill.description" class="itemDesc">{{ skill.description }}</div>
        </div>
        <t-empty v-if="!filteredSkills.length" description="暂无分镜 Skill" />
      </div>
    </aside>

    <section class="editorPanel">
      <div class="editorHeader">
        <div class="titleBlock">
          <span class="eyebrow">分镜 Skill</span>
          <t-input v-model="draft.name" class="titleInput" placeholder="例如：四宫格多角度分镜" />
          <t-input v-model="draft.description" class="descInput" placeholder="一句话说明这个 Skill 适合什么分镜场景" />
        </div>
        <div class="actions">
          <t-button theme="danger" variant="outline" :disabled="!activeId || activeSource !== 'user'" @click="removeSkill">
            <template #icon><t-icon name="delete" /></template>
            删除
          </t-button>
          <t-button theme="primary" :loading="saving" @click="saveSkill">
            <template #icon><t-icon name="save" /></template>
            更新
          </t-button>
        </div>
      </div>

      <div class="metaBar">
        <div class="fileControl">
          <span class="label">文件名</span>
          <t-input v-model="saveId" :disabled="Boolean(activeId)" placeholder="custom_storyboard_skill" />
          <span class="suffix">.md</span>
        </div>
        <div class="metaControl">
          <span class="label">标签</span>
          <t-input v-model="draft.tagsText" placeholder="自定义,分镜,四宫格" />
        </div>
        <div class="shotControl">
          <span class="label">默认镜头</span>
          <t-input-number v-model="draft.defaultShotsPerBeat" :min="1" :max="12" :step="1" :decimal-places="0" />
          <span class="suffix">/节拍</span>
        </div>
      </div>

      <div class="modeBar">
        <t-radio-group v-model="viewMode" variant="default-filled" size="small">
          <t-radio-button value="preview">
            <template #default>
              <span class="modeItem"><t-icon name="browse" /> 预览</span>
            </template>
          </t-radio-button>
          <t-radio-button value="markdown">
            <template #default>
              <span class="modeItem"><t-icon name="code" /> Markdown</span>
            </template>
          </t-radio-button>
        </t-radio-group>
      </div>

      <div v-if="viewMode === 'preview'" class="designerBody">
        <article v-for="section in sectionDefs" :key="section.key" class="sectionCard">
          <div class="sectionHead">
            <div>
              <h3>{{ section.title }}</h3>
              <p>{{ section.hint }}</p>
            </div>
            <t-tooltip content="复制变量到文本中，生成时会自动替换">
              <t-icon name="help-circle" />
            </t-tooltip>
          </div>
          <t-textarea
            v-model="draft.sections[section.key]"
            :placeholder="section.placeholder"
            :autosize="{ minRows: section.rows, maxRows: section.rows + 4 }" />
        </article>
      </div>

      <div v-else class="markdownBody">
        <MdEditor
          v-model="content"
          :theme="editorTheme"
          :toolbars="mdToolbars"
          :footers="[]"
          preview-theme="github"
          code-theme="atom"
          style="height: 100%" />
      </div>

      <div class="variableBar">
        <span class="variableLabel">可用变量</span>
        <t-tag v-for="item in variables" :key="item" size="small" variant="light-outline">{{ item }}</t-tag>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
import axios from "@/utils/axios";

const { themeSetting } = storeToRefs(settingStore());

type SectionKey = "workflow" | "sourceAnalysis" | "storyboardDesign" | "outputRules" | "qualityRules";

interface StoryboardSkillMeta {
  id: string;
  name: string;
  description: string;
  target?: string[];
  tags: string[];
  output?: string;
  defaultShotsPerBeat?: number;
  source?: "builtin" | "user";
  editable?: boolean;
  fileName: string;
}

interface SkillDraft {
  name: string;
  description: string;
  tagsText: string;
  defaultShotsPerBeat: number;
  sections: Record<SectionKey, string>;
}

const sectionDefs: Array<{
  key: SectionKey;
  title: string;
  hint: string;
  placeholder: string;
  rows: number;
}> = [
  {
    key: "workflow",
    title: "流程规划",
    hint: "告诉 AI 按什么顺序推进，步骤之间有什么依赖，以及应该怎样和用户交互。",
    placeholder: "例如：先读取章节事件和角色事实卡，再确认用户指定范围，最后生成分镜 JSON。",
    rows: 5,
  },
  {
    key: "sourceAnalysis",
    title: "素材分析",
    hint: "告诉 AI 看完章节后要先分析什么，比如人物状态、场景、道具、时间点和冲突。",
    placeholder: "例如：识别本章发生时间、地点、出场角色、角色状态变化和关键道具。",
    rows: 6,
  },
  {
    key: "storyboardDesign",
    title: "分镜表设计",
    hint: "告诉 AI 怎么拆分镜，包含景别、动作、台词、情绪、光影和资产绑定规则。",
    placeholder: "例如：每个独立画面一条分镜；对话按台词节奏拆；同场景保持角色朝向连续。",
    rows: 7,
  },
  {
    key: "outputRules",
    title: "输出格式",
    hint: "告诉 AI 最终必须输出什么结构，避免输出解释、闲聊或 Markdown。",
    placeholder: "例如：只输出 storyboard_json；shots 数组必须包含 description、scene、duration、camera、prompt 等字段。",
    rows: 5,
  },
  {
    key: "qualityRules",
    title: "质量约束",
    hint: "告诉 AI 哪些错误绝对不能发生，比如脱离原文、遗漏台词、乱用资产或破坏角色事实卡。",
    placeholder: "例如：不得新增源内容没有的情节；角色外观必须服从角色事实卡和已上传参考图。",
    rows: 6,
  },
];

const mdToolbars: ToolbarNames[] = [
  "bold",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "unorderedList",
  "orderedList",
  "quote",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];

const variables = [
  "{{project.name}}",
  "{{chapter.text}}",
  "{{chapter.event}}",
  "{{assets.roles}}",
  "{{assets.scenes}}",
  "{{assets.tools}}",
  "{{characterFacts}}",
  "{{visualManual}}",
  "{{userRequirement}}",
];

const skills = ref<StoryboardSkillMeta[]>([]);
const activeId = ref("");
const activeSource = ref<"builtin" | "user" | "">("");
const saveId = ref("");
const keyword = ref("");
const content = ref("");
const saving = ref(false);
const viewMode = ref<"preview" | "markdown">("preview");
const draft = ref<SkillDraft>(createEmptyDraft());

const editorTheme = computed(() => (themeSetting.value.mode === "dark" ? "dark" : "light"));

const filteredSkills = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return skills.value;
  return skills.value.filter((skill) =>
    [skill.id, skill.name, skill.description, skill.output, skill.tags.join(","), skill.source]
      .join(" ")
      .toLowerCase()
      .includes(kw),
  );
});

watch(viewMode, (mode, previousMode) => {
  if (mode === previousMode) return;
  if (mode === "markdown") {
    content.value = buildContentFromDraft(saveId.value);
  } else {
    hydrateDraftFromContent(content.value, saveId.value);
  }
});

function createEmptyDraft(): SkillDraft {
  return {
    name: "自定义分镜 Skill",
    description: "根据章节事件、资产和视觉手册生成结构化分镜",
    tagsText: "自定义,分镜",
    defaultShotsPerBeat: 3,
    sections: {
      workflow: [
        "1. 读取项目名称、章节正文、章节事件、资产库、角色事实卡、视觉手册和用户额外要求。",
        "2. 先判断用户指定的章节范围、镜头数量或特殊形式，不得自行扩大范围。",
        "3. 再按事件顺序拆分节拍，并为每个节拍设计可生产的分镜。",
      ].join("\n"),
      sourceAnalysis: [
        "- 识别本章发生的时间点、地点、出场角色、角色状态变化和关键道具。",
        "- 若角色事实卡或已上传参考图与章节文字冲突，以角色事实卡和参考图为准。",
        "- 只使用源内容中存在的剧情，不补写新情节。",
      ].join("\n"),
      storyboardDesign: [
        "- 一个独立画面对应一条分镜，按叙事顺序推进。",
        "- 每条分镜写清画面描述、场景、景别、运镜、角色动作、情绪、光影、台词、音效和关联资产。",
        "- 对话镜头按台词节奏拆分，动作和朝向需要前后连续。",
        "- 场景和角色必须优先绑定资产库中的真实资产 ID，不编造不存在的资产。",
      ].join("\n"),
      outputRules: [
        "- 只输出 storyboard_json，不要输出 Markdown 说明、解释或寒暄。",
        "- JSON 顶层必须包含 shots 数组。",
        "- 每个 shot 至少包含 description、scene、duration、camera、action、emotion、lighting、lines、sound、associateAssetsNames、associateAssetsIds、prompt。",
      ].join("\n"),
      qualityRules: [
        "- 分镜不得脱离章节原文和事件分析。",
        "- 不遗漏关键事件和角色台词。",
        "- 角色外观、物种、服装、道具必须服从角色事实卡、视觉手册和已上传参考图。",
        "- 每条提示词必须能直接服务分镜图或视频生成。",
      ].join("\n"),
    },
  };
}

function defaultContent(id: string) {
  draft.value = createEmptyDraft();
  return buildContentFromDraft(id);
}

function splitFrontMatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { attrs: {} as Record<string, string>, body: markdown };
  const attrs: Record<string, string> = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    attrs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { attrs, body: markdown.slice(match[0].length) };
}

function parseNumber(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function cleanSectionBody(value: string, hint: string) {
  return value
    .replace(new RegExp(`^>\\s*${escapeRegExp(hint)}\\s*\\n+`, "i"), "")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(body: string, title: string, hint: string) {
  const escaped = escapeRegExp(title);
  const pattern = new RegExp(`(?:^|\\n)##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
  const match = body.match(pattern);
  return match?.[1] ? cleanSectionBody(match[1], hint) : "";
}

function hydrateDraftFromContent(markdown: string, fallbackId: string) {
  const { attrs, body } = splitFrontMatter(markdown);
  const nextDraft = createEmptyDraft();
  nextDraft.name = attrs.name || nextDraft.name;
  nextDraft.description = attrs.description || nextDraft.description;
  nextDraft.tagsText = attrs.tags || nextDraft.tagsText;
  nextDraft.defaultShotsPerBeat = parseNumber(attrs.defaultShotsPerBeat);

  let hasStructuredSection = false;
  for (const section of sectionDefs) {
    const value = extractSection(body, section.title, section.hint);
    if (value) {
      nextDraft.sections[section.key] = value;
      hasStructuredSection = true;
    }
  }

  if (!hasStructuredSection) {
    const cleanedBody = body.trim();
    if (cleanedBody) nextDraft.sections.workflow = cleanedBody;
  }

  draft.value = nextDraft;
  saveId.value = fallbackId || attrs.id || saveId.value;
}

function oneLine(value: string) {
  return value.replace(/\r?\n/g, " ").trim();
}

function buildContentFromDraft(id: string) {
  const safeId = id.trim() || `custom_storyboard_skill_${Date.now()}`;
  const meta = [
    "---",
    `id: ${safeId}`,
    `name: ${oneLine(draft.value.name) || "自定义分镜 Skill"}`,
    `description: ${oneLine(draft.value.description) || "根据章节事件、资产和视觉手册生成结构化分镜"}`,
    "target: storyboard_generation",
    `tags: ${oneLine(draft.value.tagsText) || "自定义,分镜"}`,
    "output: storyboard_json",
    `defaultShotsPerBeat: ${draft.value.defaultShotsPerBeat || 3}`,
    "---",
  ].join("\n");

  const intro = "你是 Toonflow 的分镜 Skill，负责把章节内容、项目资产、角色事实卡和视觉手册转成可生产的结构化分镜 JSON。";
  const body = sectionDefs
    .map((section) => [`## ${section.title}`, "", `> ${section.hint}`, "", draft.value.sections[section.key].trim()].join("\n").trim())
    .join("\n\n");
  const context = [
    "## 可用上下文变量",
    "",
    "- 项目名称：{{project.name}}",
    "- 章节正文：{{chapter.text}}",
    "- 章节事件：{{chapter.event}}",
    "- 角色资产：{{assets.roles}}",
    "- 场景资产：{{assets.scenes}}",
    "- 道具资产：{{assets.tools}}",
    "- 角色事实卡：{{characterFacts}}",
    "- 视觉手册：{{visualManual}}",
    "- 用户额外要求：{{userRequirement}}",
  ].join("\n");

  return `${meta}\n${intro}\n\n${body}\n\n${context}\n`;
}

async function fetchSkills(selectFirst = false) {
  const { data } = await axios.post("/setting/storyboardGenerationSkill/list");
  skills.value = Array.isArray(data) ? data : [];
  if (selectFirst && !activeId.value && skills.value[0]) await loadSkill(skills.value[0].id);
}

async function loadSkill(id: string) {
  const { data } = await axios.post("/setting/storyboardGenerationSkill/get", { id });
  activeId.value = data.id;
  activeSource.value = data.source || "user";
  saveId.value = data.id;
  content.value = data.content || "";
  hydrateDraftFromContent(content.value, data.id);
  viewMode.value = "preview";
}

function createSkill() {
  const id = `custom_storyboard_skill_${Date.now()}`;
  activeId.value = "";
  activeSource.value = "user";
  saveId.value = id;
  content.value = defaultContent(id);
  viewMode.value = "preview";
}

async function saveSkill() {
  if (!saveId.value.trim()) {
    window.$message.warning("请输入文件名");
    return;
  }
  saving.value = true;
  try {
    const nextContent = viewMode.value === "preview" ? buildContentFromDraft(saveId.value) : content.value;
    const { data } = await axios.post("/setting/storyboardGenerationSkill/save", {
      id: saveId.value,
      content: nextContent,
    });
    activeId.value = data.id;
    activeSource.value = data.source || "user";
    saveId.value = data.id;
    content.value = data.content || nextContent;
    hydrateDraftFromContent(content.value, data.id);
    await fetchSkills();
    window.$message.success("保存成功");
  } catch (e: any) {
    window.$message.error(e.message ?? "保存失败");
  } finally {
    saving.value = false;
  }
}

function removeSkill() {
  if (!activeId.value || activeSource.value !== "user") return;
  const dialog = DialogPlugin.confirm({
    header: "删除分镜 Skill",
    body: `确认删除 ${activeId.value}.md？`,
    confirmBtn: "删除",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/setting/storyboardGenerationSkill/delete", { id: activeId.value });
        activeId.value = "";
        createSkill();
        await fetchSkills();
        window.$message.success("删除成功");
      } catch (e: any) {
        window.$message.error(e.message ?? "删除失败");
      } finally {
        dialog.destroy();
      }
    },
  });
}

onMounted(async () => {
  await fetchSkills(true);
  if (!activeId.value) createSkill();
});
</script>

<style lang="scss" scoped>
.storyboardGenerationSkill {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;

  .skillList,
  .editorPanel {
    border: 1px solid var(--td-component-stroke);
    border-radius: 8px;
    min-height: 0;
    overflow: hidden;
  }

  .skillList {
    display: flex;
    flex-direction: column;
    padding: 12px;

    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      margin-bottom: 10px;
    }

    .listBody {
      flex: 1;
      overflow: auto;
    }

    .skillItem {
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      margin-bottom: 8px;

      &:hover,
      &.active {
        border-color: var(--td-brand-color);
        background: var(--td-brand-color-light);
      }

      .itemTitle {
        font-size: 14px;
        font-weight: 700;
        word-break: break-word;
      }

      .itemMeta {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }

      .itemDesc {
        margin-top: 6px;
        color: var(--td-text-color-secondary);
        font-size: 12px;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
    }
  }

  .editorPanel {
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    background: var(--td-bg-color-container);

    .editorHeader {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--td-component-stroke);

      .titleBlock {
        display: grid;
        gap: 8px;
        min-width: 0;
        flex: 1;

        .eyebrow {
          color: var(--td-brand-color);
          font-size: 13px;
          font-weight: 700;
        }

        .titleInput {
          max-width: 460px;
        }

        .descInput {
          max-width: 720px;
        }
      }

      .actions {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        flex-shrink: 0;
      }
    }

    .metaBar {
      display: grid;
      grid-template-columns: minmax(260px, 360px) minmax(180px, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--td-component-stroke);

      .fileControl,
      .metaControl,
      .shotControl {
        display: grid;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .fileControl {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }

      .metaControl {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .shotControl {
        grid-template-columns: auto 100px auto;
      }

      .label,
      .suffix {
        color: var(--td-text-color-secondary);
        font-size: 13px;
        white-space: nowrap;
      }
    }

    .modeBar {
      padding: 12px 16px 4px;

      .modeItem {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }

    .designerBody {
      min-height: 0;
      overflow: auto;
      padding: 8px 16px 16px;

      .sectionCard {
        max-width: 780px;
        margin: 0 auto 18px;

        .sectionHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;

          h3 {
            margin: 0;
            color: #28d85f;
            font-size: 18px;
            line-height: 1.4;
          }

          p {
            margin: 4px 0 0;
            color: var(--td-text-color-secondary);
            font-size: 12px;
            line-height: 1.5;
          }
        }
      }
    }

    .markdownBody {
      min-height: 0;
      padding: 8px 16px 16px;
    }

    .variableBar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid var(--td-component-stroke);

      .variableLabel {
        font-size: 13px;
        color: var(--td-text-color-secondary);
      }
    }
  }
}

@media (max-width: 980px) {
  .storyboardGenerationSkill {
    grid-template-columns: 1fr;

    .skillList {
      min-height: 220px;
    }

    .editorPanel {
      .editorHeader,
      .metaBar {
        grid-template-columns: 1fr;
      }

      .editorHeader {
        flex-direction: column;
      }
    }
  }
}
</style>
