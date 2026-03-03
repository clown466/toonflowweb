<template>
  <div class="myTask">
    <t-dialog :visible.sync="visible" header="我的任务" :footer="false" width="80%" top="10vh" :onClose="() => (visible = false)">
      <div class="taskList">
        <div class="search f">
          <div>
            <t-select label="任务大类：" v-model="taskClass" :options="taskCategories" @change="onChange" />
          </div>
          <div style="margin-left: 20px">
            <t-select label="状态：" v-model="state" @change="onChange">
              <t-option key="全部" label="全部" value="" />
              <t-option key="进行中" label="进行中" value="进行中" />
              <t-option key="已完成" label="已完成" value="已完成" />
            </t-select>
          </div>
        </div>
        <div class="content">
          <t-table :data="taskItem" :columns="columns" row-key="id" :loading="pageValue.loading" :hover="true" :stripe="true">
            <template #state="{ row }">
              <t-tooltip v-if="row.state === '生成失败'" :content="row.reason || '暂无失败原因'" placement="top">
                <span
                  :style="{
                    color: '#ff4d4f',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }">
                  {{ row.state }}
                </span>
              </t-tooltip>
              <span
                v-else
                :style="{
                  color: row.state === '进行中' ? '#1890ff' : '#52c41a',
                  fontWeight: 'bold',
                }">
                {{ row.state }}
              </span>
            </template>
          </t-table>
          <div class="pagination" style="margin-top: 10px">
            <t-pagination
              v-model:current="pageValue.page"
              v-model:pageSize="pageValue.limit"
              show-sizer
              :total="pageValue.total"
              @page-size-change="onShowSizeChange"
              @current-change="changeFn" />
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import store from "@/stores";
import axios from "@/utils/axios";
import { message } from "ant-design-vue";
import dayjs from "dayjs";
import type { PrimaryTableCol } from "tdesign-vue-next";
const { projectId } = storeToRefs(store());

const visible = defineModel<boolean>({
  default: false,
});
watch(visible, (val) => {
  if (val) {
    getTaskCategories();
    getTaskList();
  }
});
function onChange() {
  pageValue.value.page = 1;
  getTaskList();
}
interface taskData {
  id: number;
  taskClass: string;
  relatedObjects: string;
  model: string;
  projectName: string;
  episode: string;
  state: string;
  startTime: number;
  reason?: string;
}

const columns: PrimaryTableCol<any>[] = [
  { colKey: "taskClass", title: "任务大类", width: 120, ellipsis: true },
  { colKey: "relatedObjects", title: "关联对象", width: 120, ellipsis: true },
  { colKey: "model", title: "模型", width: 280, ellipsis: true },
  { colKey: "describe", title: "描述", ellipsis: true },
  { colKey: "state", title: "状态", width: 100, cell: "state" },
  { colKey: "startTime", title: "时间", width: 200, cell: "startTime" },
];

const pageValue = ref({
  page: 1,
  limit: 10,
  total: 11,
  loading: false,
});
const taskCategories = ref<{ label: string; value: string }[]>([]);
const taskClass = ref<string>("");
const state = ref<string>("");
function onShowSizeChange(pageSize: number) {
  pageValue.value.limit = pageSize;
  getTaskList();
}
function changeFn(current: number) {
  pageValue.value.page = current;
  getTaskList();
}
const taskItem = ref<taskData[]>([]);

onMounted(() => {
  getTaskCategories();
  getTaskList();
});
//获取大类目录
function getTaskCategories() {
  axios
    .post("/task/getTaskCategories", {
      projectId: projectId.value,
    })
    .then(({ data }) => {
      taskCategories.value = data.map((item: any) => ({
        label: item.taskClass,
        value: item.taskClass,
      }));
      taskCategories.value.unshift({ label: "全部", value: "" });
    })
    .catch(() => {
      message.error("获取任务大类失败");
    });
}
//获取任务列表
function getTaskList() {
  pageValue.value.loading = true;
  axios
    .post("/task/getMyTaskApi", {
      page: pageValue.value.page,
      limit: pageValue.value.limit,
      taskClass: taskClass.value,
      state: state.value,
      projectId: projectId.value,
    })
    .then(({ data }) => {
      taskItem.value = data.data;
      pageValue.value.total = data.total;
    })
    .catch(() => {
      message.error("获取任务列表失败");
    })
    .finally(() => {
      pageValue.value.loading = false;
    });
}
</script>

<style lang="scss" scoped>
.myTask {
  .taskList {
    width: 100%;
    margin: 0 auto;
    background: transparent;
    .search {
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      .ant-input-group {
        margin-right: 1rem;
      }
    }
    .header {
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      .title {
        font-size: 2rem;
        font-weight: 600;
        color: #1a202c;
        margin-bottom: 0.5rem;
      }
    }
  }
}
</style>
