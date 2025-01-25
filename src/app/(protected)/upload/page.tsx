import { UploadVideoForm } from "@/components/upload/upload-video-form";

export default function UploadPage() {
  
  return (
    <div className="min-h-screen bg-black text-white">
      <UploadVideoForm />
    </div>
  );
}

/*
    const blob = await put(compressedFile.name, compressedFile, {
      access: "public",
    });
    const metadata = await extractVideoMetadata(blob.url);

    await saveVideoMetadataToNeon({});

    return NextResponse.json(
      { message: "Video uploaded successfully" },
      { status: 200 }
    );*/