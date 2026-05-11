"use client";

import { genUploader } from "uploadthing/client";

import type { OurFileRouter } from "@/lib/uploadthing";

export const { uploadFiles } = genUploader<OurFileRouter>();
