/**
 * Manifest of example Legion Hutta notebooks shipped with the project.
 *
 * Each entry maps to a `.legion` file in this folder. The manifest is
 * consumed by the "Examples" browser in the UI so users can one-click
 * open a curated notebook covering the most popular HuggingFace model
 * families.
 *
 * Adding a new example:
 *   1. Drop the `.legion` file in this folder.
 *   2. Add a matching entry to `EXAMPLES` below.
 *   3. Run `npx tsc --noEmit` to verify the manifest still type-checks.
 *
 * The notebook JSON itself is loaded lazily (via fetch() at runtime)
 * — this manifest only carries the lightweight metadata needed for
 * the gallery UI.
 */

export type ExampleCategory =
  | "image-gen"
  | "llm"
  | "audio"
  | "vision"
  | "embeddings"
  | "code"
  | "fine-tuning"
  | "showcase";

export type ExampleDifficulty = "beginner" | "intermediate" | "advanced";

export interface ExampleNotebook {
  /** URL-style slug, unique across the manifest. */
  id: string;
  /** Human-readable title shown in the gallery card. */
  title: string;
  /** One-paragraph description (60–120 words). */
  description: string;
  category: ExampleCategory;
  tags: string[];
  /** File name relative to this folder, e.g. "stable-diffusion.legion". */
  fileName: string;
  /** Optional related HuggingFace model id. */
  modelId?: string;
  difficulty: ExampleDifficulty;
  /** Estimated time-to-run, in minutes, on a single A100 / RTX 4090. */
  estimatedMinutes: number;
  /** Total cell count (markdown + code). */
  cells: number;
}

export const EXAMPLES: ExampleNotebook[] = [
  {
    id: "stable-diffusion",
    title: "Stable Diffusion XL — Text-to-Image",
    description:
      "Generate 1024×1024 images from text prompts using SDXL 1.0 via the diffusers library. Covers prompt variations, negative prompts, deterministic seeds, the refiner pipeline, and saving outputs to disk.",
    category: "image-gen",
    tags: ["diffusers", "sdxl", "text-to-image", "stable-diffusion"],
    fileName: "stable-diffusion.legion",
    modelId: "stabilityai/stable-diffusion-xl-base-1.0",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    cells: 8,
  },
  {
    id: "flux-image-gen",
    title: "FLUX.1-dev — Text-to-Image",
    description:
      "Run Black Forest Labs' FLUX.1-dev 12B rectified-flow transformer for best-in-class prompt adherence and text rendering. Includes aspect-ratio variations, CPU-offload for 24 GB GPUs, and a guidance-scale sweep.",
    category: "image-gen",
    tags: ["diffusers", "flux", "text-to-image"],
    fileName: "flux-image-gen.legion",
    modelId: "black-forest-labs/FLUX.1-dev",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    cells: 7,
  },
  {
    id: "llama-chat",
    title: "Llama-3.1-8B-Instruct Chat",
    description:
      "A minimal chat loop with Meta Llama-3.1-8B-Instruct using the transformers library. Demonstrates the chat template, sampling parameters, multi-turn dialogue, and live token streaming via TextIteratorStreamer.",
    category: "llm",
    tags: ["transformers", "llama", "chat", "instruct"],
    fileName: "llama-chat.legion",
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    cells: 8,
  },
  {
    id: "mistral-chat",
    title: "Mistral-7B-Instruct Chat with System Prompt",
    description:
      "Drive Mistral-7B-Instruct-v0.3 with a strong system prompt for character / behavior control. Includes multi-turn dialogue, batched generation with left-padding, and VRAM cleanup.",
    category: "llm",
    tags: ["transformers", "mistral", "chat", "system-prompt"],
    fileName: "mistral-chat.legion",
    modelId: "mistralai/Mistral-7B-Instruct-v0.3",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    cells: 8,
  },
  {
    id: "whisper-transcription",
    title: "Whisper large-v3 — Audio Transcription",
    description:
      "Transcribe audio to text with OpenAI Whisper large-v3. Demonstrates chunk-level timestamps, long-form pipeline with word timestamps, SRT subtitle export, and the `translate` task for non-English audio.",
    category: "audio",
    tags: ["transformers", "whisper", "asr", "transcription"],
    fileName: "whisper-transcription.legion",
    modelId: "openai/whisper-large-v3",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    cells: 9,
  },
  {
    id: "bert-embeddings",
    title: "Sentence-BERT Embeddings + Cosine Similarity",
    description:
      "Embed a small corpus with `all-MiniLM-L6-v2`, compute pairwise cosine similarity, run semantic search against a query, cluster with k-means, and project embeddings to 2D with UMAP / PCA.",
    category: "embeddings",
    tags: ["sentence-transformers", "embeddings", "cosine", "clustering"],
    fileName: "bert-embeddings.legion",
    modelId: "sentence-transformers/all-MiniLM-L6-v2",
    difficulty: "beginner",
    estimatedMinutes: 5,
    cells: 8,
  },
  {
    id: "yolo-detection",
    title: "Ultralytics YOLOv8 Object Detection",
    description:
      "Load a pretrained YOLOv8 nano model, run inference on an image, plot annotated bounding boxes, export detections to JSON, and process batches / videos.",
    category: "vision",
    tags: ["ultralytics", "yolo", "object-detection"],
    fileName: "yolo-detection.legion",
    modelId: "ultralytics/yolov8n",
    difficulty: "beginner",
    estimatedMinutes: 6,
    cells: 9,
  },
  {
    id: "clip-zero-shot",
    title: "CLIP Zero-Shot Image Classification",
    description:
      "Classify images by computing similarity between image embeddings and candidate text prompts — no training required. Includes prompt-ensembling across multiple templates and batched multi-image classification.",
    category: "vision",
    tags: ["transformers", "clip", "zero-shot", "classification"],
    fileName: "clip-zero-shot.legion",
    modelId: "openai/clip-vit-base-patch32",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    cells: 7,
  },
  {
    id: "speecht5-tts",
    title: "SpeechT5 Text-to-Speech",
    description:
      "Synthesize natural-sounding English speech with Microsoft SpeechT5. Pick from multiple x-vector speaker embeddings, write WAV files, and chain sentence chunks for long-form synthesis.",
    category: "audio",
    tags: ["transformers", "speecht5", "tts"],
    fileName: "speecht5-tts.legion",
    modelId: "microsoft/speecht5_tts",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    cells: 9,
  },
  {
    id: "llava-vision",
    title: "LLaVA-1.5-7B Multimodal Vision Q&A",
    description:
      "Chat with LLaVA-1.5-7B about images: ask descriptive questions, run multi-turn follow-ups, and compare orientations across images. Demonstrates the LlavaProcessor chat template and image-token composition.",
    category: "vision",
    tags: ["transformers", "llava", "multimodal", "vqa"],
    fileName: "llava-vision.legion",
    modelId: "llava-hf/llava-1.5-7b-hf",
    difficulty: "advanced",
    estimatedMinutes: 15,
    cells: 9,
  },
  {
    id: "starcoder-code",
    title: "StarCoder2 Code Completion",
    description:
      "Run BigCode's StarCoder2-3B for prefix completion, fill-in-the-middle (FIM) reconstruction, multilingual function completion (Python / JS / Rust / Go), and a mini HumanEval-style unit test.",
    category: "code",
    tags: ["transformers", "starcoder", "code-completion", "fim"],
    fileName: "starcoder-code.legion",
    modelId: "bigcode/starcoder2-3b",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    cells: 8,
  },
  {
    id: "huggingface-tour",
    title: "HuggingFace Tour — 8 Models in One Notebook",
    description:
      "The showcase notebook. A guided tour across 8 HuggingFace model families in a single run: text-gen, sentiment, NER, embeddings, image-classification, zero-shot, image-gen, and TTS. Perfect smoke-test for a freshly provisioned GPU box.",
    category: "showcase",
    tags: ["showcase", "tour", "multi-model", "pipelines"],
    fileName: "huggingface-tour.legion",
    difficulty: "beginner",
    estimatedMinutes: 20,
    cells: 11,
  },
  {
    id: "finetune-llama-lora",
    title: "Fine-tune Llama-3.1-8B with QLoRA",
    description:
      "Quantized Low-Rank Adaptation of Llama-3.1-8B-Instruct on the Alpaca instruction dataset using PEFT + bitsandbytes 4-bit NF4. Fits in 22 GB of VRAM and saves a ~50 MB LoRA adapter. Includes adapter merging instructions.",
    category: "fine-tuning",
    tags: ["peft", "lora", "qlora", "fine-tuning", "trl", "sft"],
    fileName: "finetune-llama-lora.legion",
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    difficulty: "advanced",
    estimatedMinutes: 30,
    cells: 11,
  },
  {
    id: "stable-diffusion-controlnet",
    title: "Stable Diffusion + ControlNet (Depth)",
    description:
      "Re-render an image's depth structure with a brand-new prompt. Estimates depth with MiDaS, feeds it as the ControlNet conditioning signal, sweeps the conditioning scale, and builds a side-by-side comparison grid.",
    category: "image-gen",
    tags: ["diffusers", "controlnet", "depth", "stable-diffusion"],
    fileName: "stable-diffusion-controlnet.legion",
    modelId: "lllyasviel/sd-controlnet-depth",
    difficulty: "advanced",
    estimatedMinutes: 15,
    cells: 9,
  },
  {
    id: "bark-tts",
    title: "Bark — Multilingual Expressive TTS",
    description:
      "Generate expressive, multilingual speech with Suno Bark. Includes English / Spanish / French / Chinese / Japanese presets, non-verbal tags (`[laughter]`, `[sighs]`), music-style prompts, and a long-form chunked synthesizer with crossfade.",
    category: "audio",
    tags: ["transformers", "bark", "tts", "multilingual", "expressive"],
    fileName: "bark-tts.legion",
    modelId: "suno/bark",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    cells: 9,
  },
  {
    id: "rag-vector-search",
    title: "RAG Pipeline with BGE + ChromaDB",
    description:
      "End-to-end Retrieval-Augmented Generation: chunk a small knowledge base, embed it with `BAAI/bge-small-en-v1.5`, store vectors in ChromaDB with cosine HNSW, retrieve top-k chunks, and synthesize an answer with FLAN-T5.",
    category: "llm",
    tags: ["rag", "chromadb", "bge", "embeddings", "retrieval"],
    fileName: "rag-vector-search.legion",
    modelId: "BAAI/bge-small-en-v1.5",
    difficulty: "advanced",
    estimatedMinutes: 18,
    cells: 9,
  },
];

// ---- Helpers -----------------------------------------------------------

/** Look up an example by its slug id. */
export function getExampleById(id: string): ExampleNotebook | undefined {
  return EXAMPLES.find((e) => e.id === id);
}

/** Return all examples in a given category. */
export function getExamplesByCategory(category: ExampleCategory): ExampleNotebook[] {
  return EXAMPLES.filter((e) => e.category === category);
}

/** Total number of example notebooks shipped. */
export const EXAMPLE_COUNT: number = EXAMPLES.length;

/** All distinct tags across the manifest, sorted alphabetically. */
export const ALL_EXAMPLE_TAGS: string[] = Array.from(
  new Set(EXAMPLES.flatMap((e) => e.tags)),
).sort();
