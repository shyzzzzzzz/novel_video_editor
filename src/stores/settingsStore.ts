import { create } from 'zustand';

export type AIProvider = 'openai' | 'runway' | 'minimax' | 'deepseek' | 'mock';

export type ApiCategory = 'text' | 'image' | 'video';

export interface ApiConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  sysprompt?: string;
  model?: string; // 可选的模型配置，留空则使用默认值
  skills?: Skill[]; // 各任务的 sysprompt 配置
}

export interface Skill {
  id: string;       // 唯一标识，如 'review', 'outline', 'script', 'storyboard'
  name: string;    // 显示名称
  description?: string; // 描述
  sysprompt: string; // 系统提示词
}

interface SettingsState {
  apis: Record<ApiCategory, ApiConfig>;
  setApi: (cat: ApiCategory, config: Partial<ApiConfig>) => void;
  load: () => void;
  save: () => void;
}

const STORAGE_KEY = 'vibestudio_settings';

// 各 provider 的默认模型
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  deepseek: 'deepseek-chat',
  minimax: 'MiniMax-M2.7',
  runway: 'runway-gen3',
  mock: 'mock',
};

// 默认的 skill 配置
export const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'review',
    name: '小说审阅',
    description: '审阅小说章节，给出修改建议',
    sysprompt: `你是一位专业的小说审阅编辑，擅长从叙事节奏、人物塑造、情节逻辑、语言表达等多个维度对小说进行点评。
请以 JSON 数组格式返回审阅意见，每个意见包含以下字段：
- type: "suggestion"（建议）、"warning"（问题）、"praise"（优点）
- content: 具体的审阅内容（中文，简洁明了）
- line: 相关的行号（如有），可省略

只返回 JSON 数组，不要包含其他文字。`,
  },
  {
    id: 'outline',
    name: '大纲生成',
    description: '从小说章节提取故事大纲',
    sysprompt: `你是一位专业的小说大纲师。请根据小说内容生成简洁的大纲，包括：
1. 本章核心情节（2-3句话）
2. 主要场景清单
3. 关键人物

请以清晰的格式返回，作为剧本改编的参考。`,
  },
  {
    id: 'script',
    name: '剧本生成',
    description: '将小说改编为剧本格式',
    sysprompt: `你是一位专业编剧。请将小说章节直接改编为剧本格式。
要求：
1. 保留原文的所有对话和叙述
2. 用剧本格式呈现：场景、人物、动作、对话
3. 不要创作或修改原文内容，只做格式转换
4. 标注每个场景的场景名称和地点

请直接输出剧本，不要有其他解释。`,
  },
  {
    id: 'storyboard',
    name: '分镜生成',
    description: '从剧本拆解详细的分镜描述',
    sysprompt: `你是一位专业分镜师。请将以下剧本拆解为详细的分镜描述。

【分镜格式要求】
请为每个镜头输出以下信息：
- shot_no: 镜头编号（格式：场景序号-镜号，如 1-1, 1-2, 2-1）
- scene_name: 场景名称
- scene_time: 场景时间（白天/夜晚/黄昏/清晨）
- framing: 景别（大特写/特写/中近景/中景/中远景/远景/大远景）
- composition: 画面构图（三分法/对称/框架/对角线）
- character_action: 角色动作、表情、站位描述
- movement: 运镜方式（固定/推/拉/摇/倾/移/跟/升降）
- lighting: 光影设计（顺光/侧光/逆光/顶光/伦勃朗光）
- atmosphere: 情绪氛围关键词
- color_tone: 色调倾向（暖色调/冷色调/低饱和/高饱和）
- transition: 转场方式（切/淡入淡出/叠化）
- duration: 建议时长（秒）
- description: 画面描述

【输出格式】
只返回JSON数组，不要其他文字。
[
  {
    "shot_no": "1-1",
    "scene_name": "场景名称",
    "scene_time": "白天",
    "framing": "中景",
    "composition": "三分法",
    "character_action": "角色动作描述",
    "movement": "固定",
    "lighting": "侧光",
    "atmosphere": "紧张",
    "color_tone": "冷色调",
    "transition": "切",
    "duration": 5,
    "description": "详细画面描述"
  }
]`,
  },
  {
    id: 'image',
    name: '生图抽卡',
    description: '生成角色或场景的图片',
    sysprompt: `你是一位专业的AI图像生成师。请根据以下描述生成高质量的角色或场景图片。

【生成要求】
1. 角色图片：注重人物外貌特征、服饰、表情、姿态
2. 场景图片：注重环境氛围、光影效果、构图
3. 风格统一，保持描述的一致性
4. 图片比例建议16:9或4:3

请直接根据描述生成图片。`,
  },
  {
    id: 'image_desc',
    name: '生图描述生成',
    description: '根据角色信息生成适合AI生图的描述',
    sysprompt: `你是一位专业的AI图像提示词工程师。请根据以下角色信息，生成一段详细、生动的图像描述，用于AI绘图。

【输出要求】
1. 描述应包含：人物外貌特征、服饰装备、表情神态、姿态动作、场景环境、光影氛围
2. 使用英文描述（AI绘图模型通常使用英文）
3. 描述要具体、清晰，避免歧义
4. 长度适中（50-150词）
5. 突出角色的独特特征和气质

请直接输出描述文本，不要有其他解释。`,
  },
];

const DEFAULT_APIS: Record<ApiCategory, ApiConfig> = {
  text: { provider: 'mock', apiKey: '', baseUrl: 'http://localhost:18080', model: '', skills: [] },
  image: { provider: 'mock', apiKey: '', baseUrl: 'http://localhost:18080', model: '' },
  video: { provider: 'mock', apiKey: '', baseUrl: 'http://localhost:18080', model: '' },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apis: { ...DEFAULT_APIS },

  setApi: (cat, config) => {
    set((state) => ({
      apis: {
        ...state.apis,
        [cat]: { ...state.apis[cat], ...config },
      },
    }));
    get().save();
  },

  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          apis: {
            text: {
              ...DEFAULT_APIS.text,
              ...(data.text || {}),
              // 优先使用已保存的 skills，没有时才用默认值
              skills: data.text?.skills?.length ? data.text.skills : DEFAULT_SKILLS,
            },
            image: { ...DEFAULT_APIS.image, ...(data.image || {}) },
            video: { ...DEFAULT_APIS.video, ...(data.video || {}) },
          },
        });
      }
    } catch {
      // ignore
    }
  },

  save: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get().apis));
  },
}));

// 获取指定 skill 的 sysprompt
// image_desc 技能固定从 text 类别的 skills 中获取（因为生图描述需要文本模型）
export function getSkillSysprompt(category: ApiCategory, skillId: string): string | undefined {
  // image_desc 技能从 text 类别获取
  const effectiveCategory = skillId === 'image_desc' ? 'text' : category;
  const config = useSettingsStore.getState().apis[effectiveCategory];
  const skill = config.skills?.find((s) => s.id === skillId);
  return skill?.sysprompt;
}
