<template>
  <div v-if="isInitializing" class="loading-container">
    <div class="spinner"></div>
    <p>{{ t('log.info.initializing') }}</p>
  </div>
  <div v-else-if="!services" class="loading-container error">
    <p>{{ t('toast.error.appInitFailed') }}</p>
  </div>
  <template v-if="isReady">
    <MainLayoutUI>
      <!-- Title Slot -->
      <template #title>
        {{ $t('promptOptimizer.title') }}
      </template>

      <!-- Actions Slot -->
      <template #actions>
        <ThemeToggleUI />
        <ActionButtonUI
          icon="📝"
          :text="$t('nav.templates')"
          @click="openTemplateManager"
        />
        <ActionButtonUI
          icon="📜"
          :text="$t('nav.history')"
          @click="historyManager.showHistory = true"
        />
        <ActionButtonUI
          icon="⚙️"
          :text="$t('nav.modelManager')"
          @click="modelManager.showConfig = true"
        />
       
        <!-- 自动更新组件 - 仅在Electron环境中显示 -->
        <UpdaterIcon />
        
        <LanguageSwitchUI />
      </template>

      <!-- Main Content -->
      <ContentCardUI class="flex-1 min-w-0 flex flex-col">
        <div class="flex-none">
          <InputPanelUI
            v-model="optimizer.prompt"
            v-model:selectedModel="modelManager.selectedOptimizeModel"
            :label="promptInputLabel"
            :placeholder="promptInputPlaceholder"
            :model-label="$t('promptOptimizer.optimizeModel')"
            :template-label="$t('promptOptimizer.templateLabel')"
            :button-text="$t('promptOptimizer.optimize')"
            :loading-text="$t('common.loading')"
            :loading="optimizer.isOptimizing"
            :disabled="optimizer.isOptimizing"
            @submit="handleOptimizePrompt"
            @configModel="modelManager.showConfig = true"
          >
            <template #optimization-mode-selector>
              <OptimizationModeSelectorUI
                v-model="selectedOptimizationMode"
                @change="handleOptimizationModeChange"
              />
            </template>
            <template #model-select>
              <ModelSelectUI
                ref="optimizeModelSelect"
                :modelValue="modelManager.selectedOptimizeModel"
                @update:modelValue="modelManager.selectedOptimizeModel = $event"
                :disabled="optimizer.isOptimizing"
                @config="modelManager.showConfig = true"
              />
            </template>
            <template #template-select>
              <template v-if="services && services.templateManager">
                <TemplateSelectUI
                  ref="templateSelectRef"
                  v-model="currentSelectedTemplate"
                  :type="templateSelectType"
                  :optimization-mode="selectedOptimizationMode"
                  @manage="openTemplateManager"
                />
              </template>
              <div v-else class="p-2 text-sm theme-placeholder">
                {{ t('template.loading') || '加载中...' }}
              </div>
            </template>
          </InputPanelUI>
        </div>
        <div class="flex-1 min-h-0">
          <template v-if="services && services.templateManager">
            <PromptPanelUI
              ref="promptPanelRef"
              v-model:optimized-prompt="optimizer.optimizedPrompt"
              :reasoning="optimizer.optimizedReasoning"
              :original-prompt="optimizer.prompt"
              :is-optimizing="optimizer.isOptimizing"
              :is-iterating="optimizer.isIterating"
              v-model:selected-iterate-template="optimizer.selectedIterateTemplate"
              :versions="optimizer.currentVersions"
              :current-version-id="optimizer.currentVersionId"
              :optimization-mode="selectedOptimizationMode"
              :services="services"
              @iterate="handleIteratePrompt"
              @openTemplateManager="openTemplateManager"
              @switchVersion="handleSwitchVersion"
            />
          </template>
          <div v-else class="p-4 text-center theme-placeholder">
            {{ t('prompt.loading') || '加载中...' }}
          </div>
        </div>
      </ContentCardUI>

      <TestPanelUI
        ref="testPanelRef"
        class="flex-1 min-w-0 flex flex-col"
        :prompt-service="promptService"
        :original-prompt="optimizer.prompt"
        :optimized-prompt="optimizer.optimizedPrompt"
        :optimization-mode="selectedOptimizationMode"
        v-model="modelManager.selectedTestModel"
        @showConfig="modelManager.showConfig = true"
      />
    </MainLayoutUI>

    <!-- Modals and Drawers that are conditionally rendered -->
    <ModelManagerUI v-if="isReady" v-model:show="modelManager.showConfig" />
    <TemplateManagerUI
      v-if="isReady"
      v-model:show="templateManagerState.showTemplates"
      :templateType="templateManagerState.currentType"
      @close="() => templateManagerState.handleTemplateManagerClose(() => templateSelectRef?.refresh?.())"
      @languageChanged="handleTemplateLanguageChanged"
    />
    <HistoryDrawerUI
      v-if="isReady"
      v-model:show="historyManager.showHistory"
      :history="promptHistory.history"
      @reuse="handleHistoryReuse"
      @clear="promptHistory.handleClearHistory"
      @deleteChain="promptHistory.handleDeleteChain"
    />
    <DataManagerUI v-if="isReady" v-model:show="showDataManager" @imported="handleDataImported" />

    <!-- ToastUI已在MainLayoutUI中包含，无需重复渲染 -->
  </template>
</template>

<script setup lang="ts">
import { ref, watch, provide, computed, shallowRef, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  // UI Components
  MainLayoutUI, ThemeToggleUI, ActionButtonUI, ModelManagerUI, TemplateManagerUI, HistoryDrawerUI,
  LanguageSwitchUI, DataManagerUI, InputPanelUI, PromptPanelUI, OptimizationModeSelectorUI,
  ModelSelectUI, TemplateSelectUI, ContentCardUI, ToastUI, TestPanelUI, UpdaterIcon,

  // Composables
  usePromptOptimizer,
  useToast,
  useHistoryManager,
  useModelManager,
  useTemplateManager,
  useAppInitializer,
  usePromptHistory,
  useModelSelectors,

  // i18n functions
  initializeI18nWithStorage,
  setI18nServices,

  // Types from UI package
  type OptimizationMode,
  // 从UI包导入DataManager类型
  DataManager,
} from '@prompt-optimizer/ui'
import type { IPromptService } from '@prompt-optimizer/core'
// 导入AppServices类型
import type { AppServices } from '../node_modules/@prompt-optimizer/ui/src/types/services'

// 1. 基础 composables
const { t } = useI18n()
const toast = useToast()

// 2. 初始化应用服务
const { services, isInitializing, error } = useAppInitializer()

// 3. Initialize i18n with storage when services are ready
watch(services, async (newServices) => {
  if (newServices) {
    // 首先设置服务引用
    setI18nServices(newServices)
    // 然后初始化语言设置
    await initializeI18nWithStorage()
    console.log('[Web] i18n initialized')
  }
}, { immediate: true })

// 4. 向子组件提供服务
provide('services', services)
provide('toast', toast)

// 5. 控制主UI渲染的标志
const isReady = computed(() => services.value !== null && !isInitializing.value)

// 6. 创建所有必要的引用
const promptService = shallowRef<IPromptService | null>(null)
const selectedOptimizationMode = ref<OptimizationMode>('system')
const showDataManager = ref(false)
const optimizeModelSelect = ref(null)
const testPanelRef = ref(null)
const templateSelectRef = ref<{ refresh?: () => void } | null>(null)
const promptPanelRef = ref<{ refreshIterateTemplateSelect?: () => void } | null>(null)

const templateSelectType = computed<'optimize' | 'userOptimize' | 'iterate'>(() => {
  return selectedOptimizationMode.value === 'system' ? 'optimize' : 'userOptimize';
});

// 6. 在顶层调用所有 Composables
// 测试面板的模型选择器引用
const testModelSelect = computed(() => (testPanelRef.value as any)?.modelSelectRef || null)

// 使用类型断言解决类型不匹配问题
// 模型选择器
const modelSelectors = useModelSelectors(services as any)

// 模型管理器
const modelManager = useModelManager(
  services as any,
  {
    optimizeModelSelect: modelSelectors.optimizeModelSelect,
    testModelSelect
  }
)

// 提示词优化器
const optimizer = usePromptOptimizer(
  services as any,
  selectedOptimizationMode,
  toRef(modelManager, 'selectedOptimizeModel'),
  toRef(modelManager, 'selectedTestModel')
)

// 提示词历史
const promptHistory = usePromptHistory(
  services as any,
  toRef(optimizer, 'prompt') as any,
  toRef(optimizer, 'optimizedPrompt') as any,
  toRef(optimizer, 'currentChainId') as any,
  toRef(optimizer, 'currentVersions') as any,
  toRef(optimizer, 'currentVersionId') as any
)

// 历史管理器
const historyManager = useHistoryManager(
  services as any,
  optimizer.prompt as any,
  optimizer.optimizedPrompt as any,
  optimizer.currentChainId as any,
  optimizer.currentVersions as any,
  optimizer.currentVersionId as any,
  promptHistory.handleSelectHistory,
  promptHistory.handleClearHistory,
  promptHistory.handleDeleteChain as any
)

// 模板管理器
const templateManagerState = useTemplateManager(
  services as any,
  {
    selectedOptimizeTemplate: toRef(optimizer, 'selectedOptimizeTemplate'),
    selectedUserOptimizeTemplate: toRef(optimizer, 'selectedUserOptimizeTemplate'),
    selectedIterateTemplate: toRef(optimizer, 'selectedIterateTemplate')
  }
)

// 7. 监听服务初始化
watch(services, (newServices) => {
  if (!newServices) return

  // 设置服务引用
  promptService.value = newServices.promptService

  console.log('All services and composables initialized.')
})

// 8. 处理数据导入成功后的刷新
const handleDataImported = () => {
  console.log('[App] 数据导入成功，即将刷新页面以应用所有更改...')

  // 显示成功提示，然后刷新页面
  toast.success(t('dataManager.import.successWithRefresh'))

  // 延迟一点时间让用户看到成功提示，然后刷新页面
  setTimeout(() => {
    window.location.reload()
  }, 1500)
}

// 8. 计算属性和方法
const currentSelectedTemplate = computed({
  get() {
    return selectedOptimizationMode.value === 'system'
      ? optimizer.selectedOptimizeTemplate
      : optimizer.selectedUserOptimizeTemplate
  },
  set(newValue) {
    if (!newValue) return
    if (selectedOptimizationMode.value === 'system') {
      optimizer.selectedOptimizeTemplate = newValue
    } else {
      optimizer.selectedUserOptimizeTemplate = newValue
    }
  }
})

// 处理优化提示词
const handleOptimizePrompt = () => {
  optimizer.handleOptimizePrompt()
}

// 处理迭代提示词
const handleIteratePrompt = (payload: any) => {
  optimizer.handleIteratePrompt(payload)
}

// 处理切换版本
const handleSwitchVersion = (versionId: any) => {
  optimizer.handleSwitchVersion(versionId)
}

// 打开GitHub仓库
const openGithubRepo = async () => {
  const url = 'https://github.com/linshenkx/prompt-optimizer'

  // 检查是否在Electron环境中
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    try {
      await (window as any).electronAPI.shell.openExternal(url)
    } catch (error) {
      console.error('Failed to open external URL in Electron:', error)
      // 如果Electron API失败，回退到window.open
      window.open(url, '_blank')
    }
  } else {
    // Web环境中使用window.open
    window.open(url, '_blank')
  }
}

// 打开模板管理器
const openTemplateManager = (templateType?: 'optimize' | 'userOptimize' | 'iterate') => {
  // 如果传入了模板类型，直接使用；否则根据当前优化模式判断（向后兼容）
  templateManagerState.currentType = templateType || (selectedOptimizationMode.value === 'system' ? 'optimize' : 'userOptimize')
  templateManagerState.showTemplates = true
}

// 处理优化模式变更
const handleOptimizationModeChange = (mode: OptimizationMode) => {
  selectedOptimizationMode.value = mode
}

// 处理模板语言变化
const handleTemplateLanguageChanged = (newLanguage: string) => {
  console.log('[App] 模板语言已切换:', newLanguage)

  // 刷新主界面的模板选择组件
  if (templateSelectRef.value?.refresh) {
    templateSelectRef.value.refresh()
  }

  // 刷新迭代页面的模板选择组件
  if (promptPanelRef.value?.refreshIterateTemplateSelect) {
    promptPanelRef.value.refreshIterateTemplateSelect()
  }
}

// 处理历史记录使用 - 智能模式切换
const handleHistoryReuse = async (context: { record: any, chainId: string, rootPrompt: string, chain: any }) => {
  const { chain } = context

  // 根据链条的根记录类型确定应该切换到的优化模式
  let targetMode: OptimizationMode
  if (chain.rootRecord.type === 'optimize') {
    targetMode = 'system'
  } else if (chain.rootRecord.type === 'userOptimize') {
    targetMode = 'user'
  } else {
    // 兜底：从根记录的 metadata 中获取优化模式
    targetMode = chain.rootRecord.metadata?.optimizationMode || 'system'
  }

  // 如果目标模式与当前模式不同，自动切换
  if (targetMode !== selectedOptimizationMode.value) {
    selectedOptimizationMode.value = targetMode
    toast.info(t('toast.info.optimizationModeAutoSwitched', {
      mode: targetMode === 'system' ? t('common.system') : t('common.user')
    }))
  }

  // 调用原有的历史记录处理逻辑
  await promptHistory.handleSelectHistory(context)
}

// 提示词输入标签
const promptInputLabel = computed(() => {
  return selectedOptimizationMode.value === 'system' ? t('promptOptimizer.originalPrompt') : t('promptOptimizer.userPromptInput')
})

// 提示词输入占位符
const promptInputPlaceholder = computed(() => {
  return selectedOptimizationMode.value === 'system' ? t('promptOptimizer.originalPromptPlaceholder') : t('promptOptimizer.userPromptPlaceholder')
})
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: var(--text-color);
  background-color: var(--background-color);
}

.loading-container.error {
  color: #f56c6c;
}

.spinner {
  border: 4px solid rgba(128, 128, 128, 0.2);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color);
  animation: spin 1s ease infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>