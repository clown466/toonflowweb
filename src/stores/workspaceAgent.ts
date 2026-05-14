import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";
import type { ChatMessagesData } from "@tdesign-vue-next/chat";

function makeWorkspaceAgentStore(projectId: string) {
  return defineStore(`workspaceAgent-${projectId}`, () => {
    const defMsg: ChatMessagesData[] = [
      {
        id: "welcome",
        role: "assistant",
        content: [
          { type: "text", status: "complete", data: $t("workbench.workspaceAgent.welcomeMsg") },
          {
            type: "suggestion",
            status: "complete",
            data: [
              { title: $t("workbench.workspaceAgent.start"), prompt: $t("workbench.workspaceAgent.start") },
            ],
          },
        ],
      },
    ];

    onMounted(() => {
      if (messages.value.length <= 0) messages.value = [...defMsg, ...messages.value];
    });

    const { connected, messages, chat, stopGenerate, socket, status, disconnect, connect } = useChat({
      url: `${settingStore().baseUrl}/socket/workspaceAgent`,
      auth: () => ({
        isolationKey: `${projectId}:workspaceAgent`,
        projectId: projectId,
      }),
      manageLifecycle: false,
      autoConnect: false,
      clientIdleTimeoutMs: 210000,
    });

    // 监听连接成功，获取历史记录
    watch(
      socket,
      (s) => {
        if (s) {
          s.on("connect", () => {
            getHistory();
          });
        }
      },
      { immediate: true },
    );

    const thinkLevel = ref(0);

    function updateThinkConfig(value: number) {
      thinkLevel.value = value;
      if (socket.value) {
        socket.value.emit("updateThinkConfig", { think: value > 0, thinlLevel: value });
      }
    }

    const loadingHistory = ref(false);
    async function getHistory() {
      loadingHistory.value = true;
      try {
        // Note: backend API may need to support "workspaceAgent" agentType
        const { data } = await axios.post(`/agents/getMemory`, {
          projectId: projectId,
          agentType: "workspaceAgent",
        });
        messages.value = [...defMsg, ...data];
      } catch (err) {
        console.error("[workspaceAgent] getHistory error:", err);
        // If API fails (e.g., agentType not supported), just keep default welcome
        messages.value = [...defMsg];
      } finally {
        loadingHistory.value = false;
      }
    }

    async function clearMemory(type: "message" | "summary" | "all") {
      try {
        // Note: backend API may need to support "workspaceAgent" agentType
        await axios.post(`/agents/clearMemory`, {
          projectId: projectId,
          agentType: "workspaceAgent",
          type,
        });
        window.$message.success($t("workbench.workspaceAgent.msg.memoryCleared", { type }));
        getHistory();
      } catch (err: any) {
        console.error("[workspaceAgent] clearMemory error:", err);
        window.$message.error(err?.message ?? $t("workbench.workspaceAgent.msg.error"));
      }
    }

    function reconnect() {
      disconnect();
      setTimeout(() => {
        connect();
      }, 100);
    }

    const imageModels = ref<any[]>([]);
    const currentImageModel = ref<string | null>(null);
    const currentImageQuality = ref<string | null>(null);

    async function getImageModels() {
      return new Promise((resolve, reject) => {
        if (!socket.value) {
          reject(new Error("Socket not connected"));
          return;
        }
        socket.value.emit("getImageModels", (response: any) => {
          if (response.success) {
            imageModels.value = response.options || [];
            currentImageModel.value = response.current;
            currentImageQuality.value = response.currentQuality;
            resolve(response);
          } else {
            reject(new Error(response.message || "Failed to get image models"));
          }
        });
      });
    }

    async function setImageModel(model: string, quality?: string) {
      return new Promise((resolve, reject) => {
        if (!socket.value) {
          reject(new Error("Socket not connected"));
          return;
        }
        socket.value.emit("setImageModel", { model, quality }, (response: any) => {
          if (response.success) {
            currentImageModel.value = response.model;
            if (response.quality) currentImageQuality.value = response.quality;
            window.$message.success($t("workbench.workspaceAgent.msg.imageModelUpdated"));
            resolve(response);
          } else {
            window.$message.error(response.message || "Failed to set image model");
            reject(new Error(response.message || "Failed to set image model"));
          }
        });
      });
    }

    return {
      connected,
      messages,
      chat,
      stopGenerate,
      socket,
      status,
      connect,
      disconnect,
      reconnect,
      thinkLevel,
      updateThinkConfig,
      getHistory,
      clearMemory,
      loadingHistory,
      imageModels,
      currentImageModel,
      currentImageQuality,
      getImageModels,
      setImageModel,
    };
  });
}

const storeMap = new Map<string, ReturnType<typeof makeWorkspaceAgentStore>>();

function createWorkspaceAgentStore(projectId: string) {
  if (!storeMap.has(projectId)) {
    storeMap.set(projectId, makeWorkspaceAgentStore(projectId));
  }
  return storeMap.get(projectId)!;
}

export default function useWorkspaceAgentStore() {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  return createWorkspaceAgentStore(id)();
}
