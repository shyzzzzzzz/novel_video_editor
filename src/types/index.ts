// ==================== 工作区层级 ====================

export interface Workspace {
  id: string;
  name: string;
  projects: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  series: Series[];
  globalRoles: Role[];
  globalScenes: SceneAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id: string;
  name: string;
  seasons: Season[];
}

export interface Season {
  id: string;
  name: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  name: string;
  status: EpisodeStatus;
  scripts: Script[];
  storyboards: Storyboard[];
  audioTracks: AudioTrack[];
  createdAt: string;
  updatedAt: string;
}

export type EpisodeStatus = 'draft' | 'in_progress' | 'review' | 'completed';

// ==================== 剧本 ====================

export interface Script {
  id: string;
  title: string;
  content: string;
  version: number;
  history: ScriptVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ScriptVersion {
  id: string;
  content: string;
  timestamp: string;
  note?: string;
}

// ==================== 角色 ====================

export interface Role {
  id: string;
  name: string;
  card: RoleCard;
  template: RoleTemplate;
  variants: RoleVariant[];
  versions: RoleVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleCard {
  image: string; // Base64 或文件路径
  description: string;
}

export interface RoleTemplate {
  personality: string;
  background: string;
  appearance: string;
}

export interface RoleVariant {
  id: string;
  name: string;
  card: RoleCard;
}

export interface RoleVersion {
  id: string;
  card: RoleCard;
  template: RoleTemplate;
  timestamp: string;
}

// ==================== 场景 ====================

export interface SceneAsset {
  id: string;
  name: string;
  type: SceneType;
  thumbnail: string;
  source: SceneSource;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type SceneType = 'interior' | 'exterior' | 'other';
export type SceneSource = 'asset_library' | 'ai_generated';

// ==================== 分镜 ====================

export interface Storyboard {
  id: string;
  episodeId: string;
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

export interface ShotCharacterRef {
  characterId: string;       // 指向 Character
  imageUrl: string;          // 该镜头中此角色使用的具体图片
  position?: 'left' | 'center' | 'right' | 'background';
}

export interface Shot {
  id: string;
  sequence: number;
  description: string;
  cameraAngle: CameraAngle;
  duration: number; // 秒
  imageUrl?: string;
  // 视频管理
  videoUrl?: string;          // 服务器相对路径（如 videos/xxx/shot_1.mp4）
  videoFileName?: string;     // 原始上传文件名
  thumbnailUrl?: string;      // 提取的缩略图服务器路径
  // 帧连续性
  firstFrameUrl?: string;     // 首帧参考图（可手动设置或从上一镜头尾帧填充）
  lastFrameUrl?: string;      // 尾帧参考图（上传视频后提取填充）
  characterRefs?: ShotCharacterRef[];  // 该镜头涉及的角色及图片
}

export type CameraAngle = 'wide' | 'medium' | 'close_up' | 'over_shoulder' | 'pov' | 'bird_eye' | 'low_angle';

// ==================== 音频 ====================

export interface AudioTrack {
  id: string;
  episodeId: string;
  type: AudioType;
  name: string;
  fileUrl: string;
  duration: number;
  startTime: number; // 在时间线上的起始时间
  volume: number;
  muted: boolean;
}

export type AudioType = 'dialogue' | 'bgm' | 'sfx' | 'foley';

// ==================== Vibe ====================

export interface VibeInput {
  prompt: string;
  references: VibeReference[];
  template?: string;
  mode: GenerationMode;
}

export interface VibeReference {
  type: 'image' | 'audio' | 'video';
  data: string; // 文件路径或 Base64
  description?: string;
}

export type GenerationMode = 'auto' | 'collaborative';

// ==================== 版本标记 ====================

export interface DraftVersion {
  id: string;
  episodeId: string;
  label: string; // e.g., "Draft v1", "v2", "Final"
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

// ==================== 小说创作侧 ====================

export interface Novel {
  id: string;
  title: string;
  description?: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  order: number;
  status: ChapterStatus;
  metadata: ChapterMetadata;
  createdAt: string;
  updatedAt: string;
}

export type ChapterStatus = 'draft' | 'writing' | 'completed' | 'synced';

export interface ChapterMetadata {
  wordCount: number;
  sceneCount: number;
  characters: string[];
  items: string[];
  locations: string[];
  plotPoints: string[];
  hooks: string[];
  tone: string;
  lastSyncedAt?: string;
}

export interface StoryNode {
  id: string;
  chapterId: string;
  type: 'hook' | 'suspense' | 'foreshadow' | 'plot_point';
  content: string;
  isResolved: boolean;
  relatedCharacterIds: string[];
  relatedItemIds: string[];
  createdAt: string;
}

export interface KnowledgeSyncResult {
  syncedAt: string;
  newCharacters: string[];
  newItems: string[];
  newLocations: string[];
  newPlotPoints: string[];
  updatedCharacters: string[];
  updatedItems: string[];
  scenesExtracted: ExtractedScene[];
}

export interface ExtractedScene {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  dialogueSummary: string;
  emotion: string;
  characters: string[];
  location?: string;
}

// ==================== 知识库 ====================

export interface Character {
  id: string;
  name: string;
  card: CharacterCard;
  personality: string;
  background: string;
  arc: EmotionalArc;
  relationships: Relationship[];
  appearances: ChapterAppearance[];
  versions: CharacterSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterCard {
  images: string[];           // 支持多张图片
  defaultImageIndex: number;   // 默认使用哪张
  description: string;
  keyExpressions: string[];
}

/**
 * 获取 CharacterCard 的默认图片
 * 兼容旧数据格式（image: string）的辅助函数
 */
export function getCharacterDefaultImage(card: CharacterCard): string | undefined {
  if (card.images && card.images.length > 0) {
    const idx = card.defaultImageIndex ?? 0;
    return card.images[idx] ?? card.images[0];
  }
  return undefined;
}

export interface Relationship {
  targetId: string;
  type: 'ally' | 'enemy' | 'family' | 'romantic' | 'neutral';
  description: string;
  sinceChapterId?: string;
}

export interface EmotionalArc {
  chapters: Record<string, EmotionTag>;
}

export type EmotionTag =
  | 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness'
  | 'disgust' | 'anger' | 'anticipation' | 'neutral';

export interface ChapterAppearance {
  chapterId: string;
  chapterTitle: string;
  order: number;
  description?: string;
}

export interface CharacterSnapshot {
  id: string;
  timestamp: string;
  character: Character;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  symbolism: string;
  flow: ItemFlow[];
  appearances: ChapterAppearance[];
  versions: ItemSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemFlow {
  chapterId: string;
  chapterTitle: string;
  holderId?: string;
  holderName?: string;
  event: string;
}

export interface ItemSnapshot {
  id: string;
  timestamp: string;
  item: Item;
}

export interface Location {
  id: string;
  name: string;
  type: 'interior' | 'exterior' | 'other';
  atmosphere: string;
  description: string;
  appearances: ChapterAppearance[];
  createdAt: string;
  updatedAt: string;
}

export interface PlotLine {
  id: string;
  type: PlotLineType;
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'abandoned';
  chapters: string[];
  relatedCharacterIds: string[];
  relatedItemIds: string[];
  foreshadow?: string;
  suspense?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlotLineType = 'main' | 'sub' | 'foreshadow' | 'suspense';

export interface KnowledgeSnapshot {
  id: string;
  timestamp: string;
  note?: string;
  characters: Character[];
  items: Item[];
  locations: Location[];
  plotLines: PlotLine[];
}

export interface SearchResult {
  type: 'character' | 'item' | 'location' | 'plotline' | 'chapter';
  id: string;
  title: string;
  excerpt?: string;
  chapterId?: string;
  score: number;
}

// ==================== 时间线/剪辑 ====================

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio';
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  transitionIn?: Transition;
  transitionOut?: Transition;
  effects: ClipEffect[];
  volume?: number;
  speed?: number;
  sourceType?: 'shot' | 'audio';
  sourceId?: string;
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
}

export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide';

export interface ClipEffect {
  id: string;
  type: EffectType;
  parameters: Record<string, number>;
}

export type EffectType = 'brightness' | 'contrast' | 'saturation' | 'speed' | 'reverse';

// ==================== 剧集制作 ====================

export interface ProductionEpisode {
  id: string;
  name: string;
  novelChapterIds: string[];
  status: ProductionStatus;
  scenes: ProductionScene[];
  outline?: string;      // LLM 生成的大纲
  script?: string;        // LLM 生成的剧本
  storyboard?: string;    // LLM 生成分镜（可能是JSON字符串或原文）
  createdAt: string;
  updatedAt: string;
}

export type ProductionStatus = 'outline' | 'scripting' | 'storyboard' | 'footage' | 'rough_cut' | 'final';

export interface SceneCharacterRef {
  characterId: string;
  defaultImageUrl?: string;   // 默认图片
}

export interface ProductionScene {
  id: string;
  episodeId: string;
  title: string;
  description: string;
  extractedFromChapterId?: string;
  shotIds: string[];
  status: SceneStatus;
  emotion?: string;
  location?: string;
  characters: string[];       // 旧字段，保留兼容
  characterRefs: SceneCharacterRef[];  // 新增：角色关联
  order: number;
}

export type SceneStatus = 'pending' | 'storyboarded' | 'footage_uploaded' | 'edited';

// ==================== 审阅 ====================

export interface Annotation {
  id: string;
  episodeId: string;
  targetId: string;
  targetType: 'shot' | 'scene' | 'audio' | 'timeline';
  content: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

// ==================== 渲染任务 ====================

export interface RenderTask {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  parameters: Record<string, unknown>;
  status: RenderTaskStatus;
  progress: number;
  createdAt: string;
  error?: string;
  resultUrl?: string;
  completedAt?: string;
}

export type RenderTaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ==================== 音频关键帧 ====================

export interface AudioVolumeKeyframe {
  time: number;
  volume: number;
}
