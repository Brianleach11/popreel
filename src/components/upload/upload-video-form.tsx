"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, Edit2, Eye, Loader2 } from "lucide-react";

export function UploadVideoForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      console.log("FILE UPLOADED: ", file.type);
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    } else {
      alert("Please select a valid video file.");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!videoFile) {
      alert("Please select a video file.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a title for your video.");
      return;
    }

    if (isEditing) {
      setIsEditing(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", videoFile);
    formData.append("title", title);
    formData.append("description", description);

    setIsUploading(true);
    const response = await fetch("/api/video", {
      method: "POST",
      body: formData,
    });
    setIsUploading(false);

    if (response.status === 200) {
      alert("Video uploaded successfully");
      resetForm();
    } else {
      alert("Failed to upload video");
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setTitle("");
    setDescription("");
    setIsEditing(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tighter mb-8 bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text text-center">
          Upload Your Video
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!videoFile ? (
            <div className="border-2 border-dashed border-gray-800 rounded-lg p-12 text-center hover:border-primary transition-colors">
              <Input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Label
                htmlFor="video-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="h-12 w-12 mb-4 text-gray-400" />
                <span className="text-lg font-medium text-gray-300 mb-2">
                  Drop your video here or click to upload
                </span>
              </Label>
            </div>
          ) : (
            <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                  Preview Your Video
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetForm}
                  className="text-gray-400 hover:text-primary"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <video
                  src={videoPreviewUrl!}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-gray-200">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your video a title..."
                      className="mt-2 bg-black border-gray-800 focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-200">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell viewers about your video..."
                      className="mt-2 bg-black border-gray-800 focus:border-primary"
                      rows={4}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-400 prose prose-invert">
                    <Label className="text-gray-200">Title</Label>
                    <p className="mt-2 text-xl font-semibold">{title}</p>
                    <Label className="text-gray-200 mt-4">Description</Label>
                    <p className="mt-2 whitespace-pre-wrap">{description}</p>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-gray-800 hover:bg-gray-900"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary/90"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Posting
                        </>
                      ) : (
                        "Post Video"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
