"use client";

import * as React from "react";
import { Camera, Pencil, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const formSchema = z.object({
  username: z.string().min(3).max(20),
});

interface ProfileHeaderProps {
  username: string;
  email: string;
  avatarUrl?: string;
}

export function ProfileHeader({
  username: initialUsername,
  email,
  avatarUrl: initialAvatarUrl,
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState(
    initialAvatarUrl || "/placeholder.svg?height=100&width=100"
  );
  const [username, setUsername] = React.useState(initialUsername);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: username,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: values.username }),
      });

      if (!response.ok) {
        toast.error("Failed to update username");
        throw new Error("Failed to update username");
      }
      toast.success("Username updated");
      setUsername(values.username);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username");
    }
  }

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload avatar");
        }

        const data = await response.json();
        setAvatarUrl(data.avatarUrl);
        toast.success("Avatar updated");

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error uploading avatar:", error);
        toast.error("Failed to upload avatar");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <Avatar className="h-32 w-32 border-2 border-gray-800">
          <AvatarImage
            src={avatarUrl}
            alt={username}
            className="object-cover"
          />
          <AvatarFallback className="bg-gray-900 text-gray-200">
            {username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <label
          htmlFor="avatar-upload"
          className={`absolute bottom-0 right-0 p-2 bg-gray-900 rounded-full border border-gray-800 shadow-sm cursor-pointer hover:bg-gray-800 transition-colors ${
            isUploading ? "pointer-events-none" : ""
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Camera className="h-4 w-4 text-gray-200" />
          )}
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={isUploading}
            ref={fileInputRef}
          />
        </label>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex gap-2"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-9 bg-gray-900 border-gray-800 text-white focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Save
                </Button>
              </form>
            </Form>
          ) : (
            <>
              <h1 className="text-2xl pl-6 font-bold bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">
                @{username}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-primary hover:bg-primary/10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <p className="text-sm items-center text-gray-400">{email}</p>
      </div>
    </div>
  );
}
