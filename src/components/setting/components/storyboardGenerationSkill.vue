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
            <t-tag v-if="skill.target" size="small" variant="light-outline">{{ targetLabel(skill.target) }}</t-tag>
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
        <div class="fileControl">
          <span class="label">文件名</span>
          <t-input v-model="saveId" :disabled="Boolean(activeId)" placeholder="custom_storyboard_skill" />
          <span class="suffix">.md</span>
        </div>
        <div class="actions">
          <t-button theme="danger" variant="outline" :disabled="!activeId" @click="removeSkill">
            <template #icon><t-icon name="delete" /></template>
            删除
          </t-button>
          <t-button theme="primary" :loading="saving" @click="saveSkill">
            <template #icon><t-icon name="save" /></template>
            保存
          </t-button>
        </div>
      </div>

      <div class="editorBody">
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
        <span class="variableLabel">变量</span>
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

interface StoryboardSkillMeta {
  id: string;
  name: string;
  description: string;
  target?: string;
  tags: string[];
  output?: string;
  defaultShotsPerBeat?: number;
  fileName: string;
}

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
const saveId = ref("");
const keyword = ref("");
const content = ref(defaultContent("custom_storyboard_skill"));
const saving = ref(false);

const editorTheme = computed(() => (themeSetting.value.mode === "dark" ? "dark" : "light"));

const filteredSkills = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return skills.value;
  return skills.value.filter((skill) =>
    [skill.id, skill.name, skill.description, skill.target, skill.output, skill.tags.join(",")]
      .join(" ")
      .toLowerCase()
      .includes(kw),
  );
});

function targetLabel(target: string) {
  if (target === "storyboard_generation") return "分镜生成";
  return target;
}

function defaultContent(id: string) {
  return `---
id: ${id}
name: 自定义分镜 Skill
description: 根据章节事件、资产和视觉手册生成结构化分镜
target: storyboard_generation
tags: 自定义,分镜
output: storyboard_json
defaultShotsPerBeat: 3
---
你是 Toonflow 的分镜 Skill，负责把章节内容和项目资产转成可生产的结构化分镜 JSON。

项目：
- 名称：{{project.name}}

章节正文：
{{chapter.text}}

章节事件：
{{chapter.event}}

可用资产：
- 角色：{{assets.roles}}
- 场景：{{assets.scenes}}
- 道具：{{assets.tools}}

角色事实：
{{characterFacts}}

视觉手册：
{{visualManual}}

用户额外要求：
{{userRequirement}}

输出要求：
- 只输出 storyboard_json，不要输出 Markdown 说明
- 每个节拍默认拆成 defaultShotsPerBeat 个镜头，可根据叙事需要微调
- 每个分镜包含画面、动作、镜头语言、时长、关联资产和生图提示
- 保持角色设定、场景连续性和项目视觉风格一致
`;
}

async function fetchSkills(selectFirst = false) {
  const { data } = await axios.post("/setting/storyboardGenerationSkill/list");
  skills.value = Array.isArray(data) ? data : [];
  if (selectFirst && !activeId.value && skills.value[0]) await loadSkill(skills.value[0].id);
}

async function loadSkill(id: string) {
  const { data } = await axios.post("/setting/storyboardGenerationSkill/get", { id });
  activeId.value = data.id;
  saveId.value = data.id;
  content.value = data.content || "";
}

function createSkill() {
  const id = `custom_storyboard_skill_${Date.now()}`;
  activeId.value = "";
  saveId.value = id;
  content.value = defaultContent(id);
}

async function saveSkill() {
  if (!saveId.value.trim()) {
    window.$message.warning("请输入文件名");
    return;
  }
  saving.value = true;
  try {
    const { data } = await axios.post("/setting/storyboardGenerationSkill/save", {
      id: saveId.value,
      content: content.value,
    });
    activeId.value = data.id;
    saveId.value = data.id;
    content.value = data.content || content.value;
    await fetchSkills();
    window.$message.success("保存成功");
  } catch (e: any) {
    window.$message.error(e.message ?? "保存失败");
  } finally {
    saving.value = false;
  }
}

function removeSkill() {
  if (!activeId.value) return;
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
  grid-template-columns: 300px minmax(0, 1fr);
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
    grid-template-rows: auto minmax(0, 1fr) auto;

    .editorHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--td-component-stroke);

      .fileControl {
        display: grid;
        grid-template-columns: auto 260px auto;
        align-items: center;
        gap: 8px;
        min-width: 0;

        .label,
        .suffix {
          color: var(--td-text-color-secondary);
          font-size: 13px;
        }
      }

      .actions {
        display: flex;
        gap: 8px;
      }
    }

    .editorBody {
      min-height: 0;
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
</style>
