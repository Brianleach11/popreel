interface Entity {
  entity: {
    description: string;
  };
  confidence: number;
}

export interface VideoMetadata {
  shotLabelAnnotations?: Entity[];
  segmentLabelAnnotations?: Entity[];
  textAnnotations?: TextAnnotation[];
  explicitAnnotation?: {
    frames?: ExplicitAnnotationFrame[];
  };
}

interface TextAnnotation {
  text: string;
  confidence?: number;
}

interface ExplicitAnnotationFrame {
  pornographyLikelihood:
    | "UNKNOWN"
    | "VERY_UNLIKELY"
    | "UNLIKELY"
    | "POSSIBLE"
    | "LIKELY"
    | "VERY_LIKELY";
}

interface ExtractedMetadata {
  entities: string[];
  significantText: string[];
  hasSexualContent: boolean;
}

export async function processMetadata(metadata: VideoMetadata): Promise<ExtractedMetadata> {
  return {
    entities: extractEntities(metadata),
    significantText: extractSignificantText(metadata),
    hasSexualContent: hasSexualContent(metadata),
  };
}

function hasSexualContent(metadata: VideoMetadata): boolean {
  const frames = metadata.explicitAnnotation?.frames || [];

  // Check if any frame has LIKELY or VERY_LIKELY
  return frames.some((frame) => {
    return (
      frame.pornographyLikelihood === "LIKELY" ||
      frame.pornographyLikelihood === "VERY_LIKELY"
    );
  });
}

function extractSignificantText(metadata: VideoMetadata): string[] {
  const significantText: string[] = [];

  metadata.textAnnotations?.forEach((annotation) => {
    const text = annotation.text.trim();
    const confidence = annotation.confidence || 0;

    // Filter out short or low-confidence text
    if (text.length > 4 && confidence >= 0.7) {
      significantText.push(text);
    }
  });

  return significantText;
}

function extractEntities(metadata: VideoMetadata): string[] {
  const entities = new Set<string>();

  // Extract from shotLabelAnnotations
  metadata.shotLabelAnnotations?.forEach((annotation) => {
    if (annotation.confidence >= 0.5) {
      entities.add(annotation.entity.description);
    }
  });

  // Extract from segmentLabelAnnotations
  metadata.segmentLabelAnnotations?.forEach((annotation) => {
    if (annotation.confidence >= 0.5) {
      entities.add(annotation.entity.description);
    }
  });

  return Array.from(entities);
}
